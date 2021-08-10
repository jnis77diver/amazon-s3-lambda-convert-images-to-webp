# Convert images on the fly to WebP from jpg, png, jpeg in an S3 bucket using an Amazon Lambda function
Instead of creating WebP images from existing images in a batch operation, create them at runtime from requests. This has the advantage of only creating those WebP images if the original image is requested.
Any stale images that may be in the S3 bucket but not used on the website will therefore not have an associated WebP image created and therefore save additional costs for S3 bucket space.

Blog Posts - This is a combination of several blog posts mashed together with some additiona modifications.
1. [Resize Images on the Fly with Amazon S3, AWS Lambda, and Amazon API Gateway](https://aws.amazon.com/blogs/compute/resize-images-on-the-fly-with-amazon-s3-aws-lambda-and-amazon-api-gateway/) - this doesn't deal with converting to WebP but does have much of the logic for redirects and the Lambda function
2. [Converting Images to WebP from CDN](https://blog.nona.digital/converting-images-to-webp-from-cdn/)  - this deals with converting to WebP from .jpg, .png, .jpeg but assumes you are using CloudFront

Additional steps for S3 bucket:
1. Follow steps outlined in #1 above to create the S3 bucket and Enable Static Website Hosting (needed so we can use redirects on 404)
2. The Redirect Rules should look like this which needs to be JSON (XML is no longer accepted). Replace __HOSTNAME_GATEWAY__API__ with the value you get as instructed in #1 of Blog Posts.
Note that `ReplaceKeyPrefixWith` value will be the path after your hostname in the URL of the Gateway API. Note also that you need to add `?key=` suffix and the S3 Object key will automatically be added.
```
[
    {
        "Condition": {
            "HttpErrorCodeReturnedEquals": "404"
        },
        "Redirect": {
            "HostName": "__HOSTNAME_GATEWAY__API__",
            "HttpRedirectCode": "307",
            "Protocol": "https",
            "ReplaceKeyPrefixWith": "default/generate-webp?key="
        }
    }
]
```

