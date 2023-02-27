const sh = require('shelljs');
const {Logger} = require('./logger');
const logger = new Logger('ash');
let ashRunnerCommandId = 0;
const ashRunner = (command, ...args) => {
  const cid = ashRunnerCommandId;
  ashRunnerCommandId++;
  logger.debug(`[${cid}] ${command}`, ...args);
  return new Promise((res, rej) => {
    const result = sh[command](...args);
    if (result.code != 0) {
      logger.warn(command, ...args, {
        code: result.code,
        stderr: result.stderr,
        stdout: result.stdout
      });
      rej(new Error(`shell command code ${result.code}`));
    } else {
      logger.debug(`[${cid}] ${command} success`);
      res(result);
    }
  });
}
const ash = {};
for (const command of ['exec', 'mkdir', 'mv']) {
  ash[command] = (...args) => ashRunner(command, ...args);
}
module.exports = ash;