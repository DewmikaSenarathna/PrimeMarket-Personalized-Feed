// Object storage behind one interface. The browser never talks to S3 directly:
// it requests /api/images/:key and the backend fetches the object using
// server-side credentials, so the bucket can stay fully private.
const fs = require('fs');
const path = require('path');
const config = require('./config');

const KEY_RE = /^[A-Za-z0-9._-]+$/; // blocks path traversal / odd keys
const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

let s3;
function client() {
  if (!s3) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3 = new S3Client({ region: config.awsRegion }); // default credential chain
  }
  return s3;
}

async function getObject(key) {
  if (!KEY_RE.test(key)) throw new Error('invalid key');
  if (config.storageMode === 's3') {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const out = await client().send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }));
    return { stream: out.Body, contentType: out.ContentType || 'application/octet-stream' };
  }
  const file = path.join(config.localBucketDir, key);
  if (!fs.existsSync(file)) throw new Error('not found');
  return { stream: fs.createReadStream(file), contentType: MIME[path.extname(key)] || 'application/octet-stream' };
}

async function putObject(key, body, contentType) {
  if (!KEY_RE.test(key)) throw new Error('invalid key');
  if (config.storageMode === 's3') {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await client().send(new PutObjectCommand({ Bucket: config.s3Bucket, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  fs.mkdirSync(config.localBucketDir, { recursive: true });
  fs.writeFileSync(path.join(config.localBucketDir, key), body);
}

module.exports = { getObject, putObject };
