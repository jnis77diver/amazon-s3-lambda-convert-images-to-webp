"use strict";

// based on this https://aws.amazon.com/blogs/compute/resize-images-on-the-fly-with-amazon-s3-aws-lambda-and-amazon-api-gateway/
// and this https://blog.nona.digital/converting-images-to-webp-from-cdn/
// This could be improved if we can pass the base image file type extension to lambda as a querystring parameter which we can do with CloudFront
//   but not sure how to do with S3 Redirect rule on 404
const path = require("path");
const AWS = require("aws-sdk");

const S3 = new AWS.S3({
  signatureVersion: "v4",
});

const Sharp = require("sharp");
const BUCKET = process.env.BUCKET;
const URL = process.env.URL;
const QUALITY = 75;

exports.handler = async (event, context, callback) => {
  const key = event.queryStringParameters.key;
  const match = key.match(/([^]+)(.webp$)/); // 1st capture group is everything before the extension
  const objectNameSansExt = match && match[1];
  let response = {};

  if (!objectNameSansExt) {
    //Check if requested file is .webp
    callback(null, {
      statusCode: "404",
      headers: {},
      body: "",
    });
    return;
  }

  try {
    const s3keyToCreate = objectNameSansExt + ".webp";

    var params = {
      Bucket: BUCKET,
      Prefix: objectNameSansExt,
    };

    var bucketFiltered = await S3.listObjectsV2(params).promise();
    var contents = bucketFiltered.Contents;

    if (contents && contents.length === 0) {
      // There is no file with the key prefix
      callback(null, {
        statusCode: "404",
        headers: {},
        body: "",
      });
      return;
    }

    let foundOrigFile = false;

    // iterate over possible files b/c we don't know if the jpg, png, or jpeg exists nor which one it could be
    for (let i = 0; i < contents.length; i++) {
      const objKey = contents[i].Key;
      const ext = objKey.match(/(\.jpg|\.png|\.jpeg)$/g);

      if (!ext) continue;

      const s3keyLookup = objectNameSansExt + ext;
      const bucketResource = await S3.getObject({ Bucket: BUCKET, Key: s3keyLookup }).promise();
      const sharpImageBuffer = await Sharp(bucketResource.Body)
        .webp({ quality: +QUALITY })
        .toBuffer();

      await S3.putObject({
        Body: sharpImageBuffer,
        Bucket: BUCKET,
        ContentType: "image/webp",
        CacheControl: "max-age=31536000",
        Key: s3keyToCreate,
        StorageClass: "STANDARD",
      }).promise();

      response.statusCode = 301;
      // header location for redirect. Remove trailing slash on URL and any leading / if exists on key
      response.headers = { location: `${URL.replace(/\/$/g, "")}/${key.replace(/^\/+/g, "")}` };
      response.body = "";
      foundOrigFile = true;
      break;
    }

    if (!foundOrigFile) {
      callback(null, {
        statusCode: "404",
        headers: {},
        body: "",
      });
      return;
    }
  } catch (error) {
    console.error(error);
    callback(error);
  }

  callback(null, response);
};
