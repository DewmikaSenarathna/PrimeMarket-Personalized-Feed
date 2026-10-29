const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/primemarket',
  storageMode: process.env.STORAGE_MODE || 'local',
  s3Bucket: process.env.S3_BUCKET,
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  localBucketDir: path.join(__dirname, '..', 'local-bucket'),
};
