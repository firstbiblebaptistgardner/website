const dbModule = require('./db');
const formData = require('./formData');
const {Logger} = require('./logger');
const sendEmail = require('./sendEmail');
const conf = require('./conf');

const logger = new Logger('post');

const prayerRequestApi = async (req) => {
  let ban = await dbModule.getBan(req.ip)
  if(ban){
    logger.warn(`attempted post from banned user ${req.ip}, ${ban.reason}`);
    throw new Error('400 banned');
  }
  const { fields, files } = await formData.multiparse(req);
  await formData.maybeCleanupFilesAnd400(files);
  const checkLength = (field, maxLen) => {
    if(fields[field].length > maxLen){
      logger.warn(`attempted ${field} of length ${fields[field].length} from ${req.ip}`);
      throw new Error(`400 ${field} too long`);
    }
  };
  checkLength('prayerRequest', 10000);
  checkLength('name', 200);
  checkLength('email', 200);
  logger.debug(`fields are ${Object.keys(fields)} prayer request is ${fields.prayerRequest}`);
  await dbModule.addPrayerRequest(req.ip, fields.prayerRequest);

  await sendEmail.sendEmail(
    conf.emailAlertsTo,
    `prayer request from ${fields.name}(${req.ip})`,
    `email: ${fields.email}\nprayer request: \n${fields.prayerRequest}`
  );
  return [303, '/prayerRequestComplete'];
};

module.exports = {prayerRequestApi};