# Convert images on the fly to WebP from jpg, png, jpeg using CloudFront Origin Response Lamdba Edge and S3 Bucket on AWS

Instead of creating WebP images from existing images in a batch operation, create them at runtime from requests using an AWS CloudFront Origin Response lambda. This has the advantage of only creating those WebP images if the original image is requested.
Any stale images that may be in the S3 bucket but not used on the website will therefore not have an associated WebP image created and therefore save additional costs for S3 bucket space.

## Additional steps for CloudFront Distribution:

1. This assumes you already have the S3 bucket created

## Additional steps for CloudFront Distribution:

1. 

Additional tips for Lambda function:

1. For Linux distro of the Lambda function, to zip the repo contents without adding the annoying subfolder with same name as the repo folder (which will cause the Lambda func to not work on upload), run the following from the root of the repo to have the zip file created at the same level as the repo (not as a child). Replace `webp-func` withn name of desired zip file.

```
zip -r ../webp-func.zip .
```

Blog Posts Inpiration - The basic idea was taken from the below but modified heavily.

1. [Resize Images on the Fly with Amazon S3, AWS Lambda, and Amazon API Gateway](https://aws.amazon.com/blogs/compute/resize-images-on-the-fly-with-amazon-s3-aws-lambda-and-amazon-api-gateway/) - this doesn't deal with converting to WebP but does have much of the logic for redirects and the Lambda function
2. [Converting Images to WebP from CDN](https://blog.nona.digital/converting-images-to-webp-from-cdn/) - this deals with converting to WebP from .jpg, .png, .jpeg but assumes you are using CloudFront