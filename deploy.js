#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   One-click deploy: 上传 docs/ 到 COS
   首次使用需设置环境变量:
     export COS_SECRET_ID=AKIDxxxxxxxx
     export COS_SECRET_KEY=xxxxxxxx
   ═══════════════════════════════════════════════════════════════ */

const COS = require("cos-nodejs-sdk-v5");
const fs = require("fs");
const path = require("path");

const BUCKET = "prompt-hub-1302053645";
const REGION = "ap-guangzhou";
const DOCS_DIR = path.join(__dirname, "docs");

const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;

if (!secretId || !secretKey) {
  console.error("请先设置环境变量:");
  console.error("  export COS_SECRET_ID=AKIDxxxxxxxx");
  console.error("  export COS_SECRET_KEY=xxxxxxxx");
  process.exit(1);
}

const cos = new COS({ SecretId: secretId, SecretKey: secretKey });

function walkDir(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      files.push(...walkDir(full));
    } else {
      files.push({ local: full, key: path.relative(DOCS_DIR, full) });
    }
  }
  return files;
}

async function deploy() {
  const files = walkDir(DOCS_DIR);
  console.log(`Uploading ${files.length} files to ${BUCKET}...`);

  for (const { local, key } of files) {
    const body = fs.readFileSync(local);
    const contentType = {
      ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
      ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    }[path.extname(key)] || "application/octet-stream";

    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION, Key: key, Body: body, ContentType: contentType
      }, (err, data) => {
        if (err) { console.error(`  ✗ ${key}: ${err.message}`); reject(err); }
        else { console.log(`  ✓ ${key}`); resolve(data); }
      });
    });
  }
  console.log(`\nDone! ${files.length} files uploaded.`);
  console.log(`Visit: https://${BUCKET}.cos.${REGION}.myqcloud.com/`);
}

deploy().catch(err => { console.error(err); process.exit(1); });
