#!/usr/bin/env node
/* 配置 COS 存储桶 CORS，让浏览器可以直接读写 */
const COS = require("cos-nodejs-sdk-v5");

const BUCKET = "prompt-hub-1302053645";
const REGION = "ap-guangzhou";

// Read .env file
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  });
}

const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;
if (!secretId || !secretKey) {
  console.error("请在 .env 文件中填入 COS 密钥");
  process.exit(1);
}

const cos = new COS({ SecretId: secretId, SecretKey: secretKey });

cos.putBucketCors({
  Bucket: BUCKET, Region: REGION,
  CORSRules: [{
    AllowedOrigins: ["*"],
    AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600
  }]
}, (err, data) => {
  if (err) { console.error("CORS setup failed:", err.message); process.exit(1); }
  console.log("CORS configured successfully!");
});
