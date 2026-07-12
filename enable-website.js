#!/usr/bin/env node
/* 开启 COS 静态网站托管 */
const COS = require("cos-nodejs-sdk-v5");

const BUCKET = "prompt-hub-1302053645";
const REGION = "ap-guangzhou";

const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;
if (!secretId || !secretKey) {
  console.error("请先设置: export COS_SECRET_ID=xxx COS_SECRET_KEY=xxx");
  process.exit(1);
}

const cos = new COS({ SecretId: secretId, SecretKey: secretKey });

cos.putBucketWebsite({
  Bucket: BUCKET, Region: REGION,
  WebsiteConfiguration: {
    IndexDocument: { Suffix: "index.html" },
    ErrorDocument: { Key: "index.html" }
  }
}, (err, data) => {
  if (err) { console.error("Failed:", err.message); process.exit(1); }
  console.log("静态网站已开启！");
  console.log(`访问: https://${BUCKET}.cos-website.${REGION}.myqcloud.com/`);
});
