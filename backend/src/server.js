const mongoose = require('mongoose');
const config = require('./config');
const { createApp } = require('./app');

mongoose.connect(config.mongoUri).then(() => {
  createApp().listen(config.port, () => console.log(`API on http://localhost:${config.port} (storage: ${config.storageMode})`));
}).catch((e) => { console.error('Mongo connection failed:', e.message); process.exit(1); });
