const { Logger } = require('./logger');
const logger = new Logger('validate');
const validateString = (s, name, pattern, length) => {
  const invText = `invalid ${name}: ${encodeURIComponent(s)}`;
  logger.assert(pattern.test(s), invText);
  if (length) {
    logger.assert(s.length < length, invText);
  }
  return s;
}
module.exports = {
  board: (board) => validateString(board, "board", /^[a-z]+$/, 10),
  thread: (thread) => validateString(thread, "thread", /^[1-9][0-9]*$/, 18),
  options: (options) => validateString(options, "options", /([a-z](,[a-z])*)?/),
  modKey: (modKey) => validateString(modKey, "modKey", /^[a-zA-Z0-9]+$/, 20),
  modName: (modName) => validateString(modName, "modName", /^[a-zA-Z][a-zA-Z0-9]*$/, 20),
  modLogin: (modLogin) => validateString(modLogin, "modLogin", /^[0-9a-f-]+$/, 50),
  reason: (reason) => {
    logger.assert(['pornography', 'fedposting', 'harassment', 'garbage', 'spam', 'offtopic'].includes(reason), `invalid reason ${JSON.stringify(reason)}`);
    return reason;
  }
};
