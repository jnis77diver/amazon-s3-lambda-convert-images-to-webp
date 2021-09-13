"use strict";

// This is meant to be used for an Origin Response Lambda Edge function
// based on this https://aws.amazon.com/blogs/compute/resize-images-on-the-fly-with-amazon-s3-aws-lambda-and-amazon-api-gateway/
// and this https://blog.nona.digital/converting-images-to-webp-from-cdn/
// This could be improved if we can pass the base image file type extension to lambda as a querystring parameter which we can do with CloudFront
const path = require("path");
const AWS = require("aws-sdk");

const S3 = new AWS.S3({
  signatureVersion: "v4",
});

const Sharp = require("sharp");
const QUALITY = 75;
// 403 or 404 could be returned if a file is not found in the S3 bucket depending on how the bucket is set up
var notFoundCodes = new Set([403, 404]);

exports.handler = async (event, context, callback) => {
  const { request, response, config } = event.Records[0].cf;
  const { uri, origin } = request;
  const { distributionDomainName } = config;
  const headers = response.headers;
  const BUCKET = origin.s3.domainName.split(".s3.")[0]; // domainName is of the form <bucket-name>.s3.<location>
  const URL = "https://" + distributionDomainName;
  console.info("BUCKET: " + BUCKET);
  console.info("URL: " + URL);
  console.info("MM EVENT\n" + JSON.stringify(event, null, 2));

  console.info("response.status:" + response.status);

  // early return to continue the request if not a 404 or 403 (S3 will return a 403 instead of 404 unless specific public settings are set)
  if (!notFoundCodes.has(Number(response.status))) {
    console.info("is 403/404 so early return");
    callback(null, response);
    return;
  }

  console.info("past not 403/404 early return");

  // if request is for .webp, create the image if the jpg, jpeg, or png version exists
  if (/([^]+)(.webp$)/.test(uri)) {
    console.info("webp image requeted");
    const match = uri.match(/([^]+)(.webp$)/); // 1st capture group is everything before the extension
    let objectNameSansExt = match && match[1];
    // Remove leading and trailing slash (if they exist) on key b/c we are pulling the key from the uri
    objectNameSansExt = `${objectNameSansExt.replace(/\/$/g, "").replace(/^\/+/g, "")}`;
    // ${URL.replace(/\/$/g, "")}/${uri.replace(/^\/+/g, "")}`
    console.info("objectNameSansExt: " + objectNameSansExt);

    try {
      const s3keyToCreate = objectNameSansExt + ".webp";

      var params = {
        Bucket: BUCKET,
        Prefix: objectNameSansExt,
      };

      var bucketFiltered = await S3.listObjectsV2(params).promise();
      var contents = bucketFiltered.Contents;

      if (!contents || (contents && contents.length === 0)) {
        console.info("No contents early return");
        // There is no file with the key prefix
        callback(null, response);
        return;
      }

      // iterate over possible files b/c we don't know if the jpg, png, or jpeg exists nor which one it could be
      for (let i = 0; i < contents.length; i++) {
        const objKey = contents[i].Key;
        const ext = objKey.match(/(\.jpg|\.png|\.jpeg)$/g);

        if (!ext) continue;

        const s3keyLookup = objectNameSansExt + ext;
        const bucketResource = await S3.getObject({
          Bucket: BUCKET,
          Key: s3keyLookup,
        }).promise();
        const sharpImageBuffer = await Sharp(bucketResource.Body)
          .webp({ quality: +QUALITY })
          .toBuffer();

        // all webp images will be in a root folder matching the dir structure of rest of the images, only one level down
        // E.g. a .jpg at /static/example.jpg will get an analog webp at /webp/static/example.jpg
        const newWebpObj = "webp/" + s3keyToCreate;

        await S3.putObject({
          Body: sharpImageBuffer,
          Bucket: BUCKET,
          ContentType: "image/webp",
          CacheControl: "max-age=31536000",
          Key: newWebpObj,
          StorageClass: "STANDARD",
        }).promise();

        response.status = 200;
        response.body = sharpImageBuffer.toString("base64");
        response.bodyEncoding = "base64";
        response.headers["content-type"] = [{ key: "Content-Type", value: "image/webp" }];

        //TODO: delete. this was taken from the webp conversion for S3 bucket when no CloudFront was in the pipeline
        // response.status = 302;
        // header location for redirect. Remove trailing slash on URL and any leading / if exists on key
        // location: `${URL.replace(/\/$/g, "")}/${uri.replace(/^\/+/g, "")}`,
        // response.headers = {
        //   Location: URL + s3keyToCreate,
        // };
        // response.body = "";

        // console.info("301 Url: " + URL + s3keyToCreate);
        // callback(null, {
        //   statusCode: 301,
        //   headers: {
        //     Location: URL + s3keyToCreate,
        //   },
        // });

        break;
      }
    } catch (error) {
      console.error(error);
      callback(error);
    }
  }

  callback(null, response);
};
