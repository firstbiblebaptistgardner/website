const path = require('path');
require('dotenv').config();

module.exports = {
  dataDir: process.env.DATA_DIR ?? 'data',
  imageDir: path.resolve((process.env.DATA_DIR ?? 'data') + '/' + 'images'),
  https: !['0', 'false'].includes(process.env.HTTPS),
  emailAlertsTo: process.env.EMAIL_ALERTS_TO,
  defaultModName: process.env.DEFAULT_MOD_NAME,
  defaultModKey: process.env.DEFAULT_MOD_KEY,
}