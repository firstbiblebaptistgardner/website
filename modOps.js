'use strict';
const crypto = require('crypto');
const dbModule = require('./db');
const db = dbModule.db;
const hml = require('./hml');
const formData = require('./formData');
const { Logger } = require('./logger');
const templates = require('./templates');
const validate = require('./validate');
const logger = new Logger('modOps');

const modLoginApi = async (req, res) => {
  const {fields, files} = await formData.multiparse(req);
  const modKey = validate.modKey(fields.modKey[0]);
  const modName = validate.modName(fields.modName[0]);
  await formData.maybeCleanupFilesAnd400(files);
  const modWhere = `WHERE key="${modKey}" AND name="${modName}"`;
  const mod = await db.get(`SELECT * FROM mods ${modWhere};`);
  logger.debug(await db.all(`SELECT * FROM mods;`));
  logger.assert(mod, `no such mod ${modKey} ${modName}`, 400);
  const modLogin = crypto.randomUUID();
  await db.exec(`UPDATE mods SET login="${modLogin}" ${modWhere};`);
  logger.debug(await db.get(`SELECT * FROM mods ${modWhere};`));
  res.cookie('modLogin', modLogin);
  return [303, '/mod/prayerRequests'];
}
const getLoggedInModOr404 = async (req)=>{
  const modLogin = req.cookies.modLogin;
  logger.info('mod login attempt', JSON.stringify(modLogin));
  validate.modLogin(modLogin);
  logger.debug(await db.all(`SELECT * FROM mods;`));
  const mod = await db.get(`SELECT * FROM mods WHERE login="${modLogin}";`);
  logger.assert(mod, 'invalid login', 404);
  return mod;
}
const modPage = async (user, name, posts) => {
  const out = [templates.htmlTop(name, {scriptUrl: '/mod.js'})];
  if(!posts.length){
    out.push(`no reports`);
  } else {
    out.push(await templates.renderPosts(posts, user, {extraTemplate: templates.modButtons}));
  }
  out.push(templates.htmlBottom());
  return out.join('\n');
};
const modReports = async (req) => {
  await getLoggedInModOr404(req);
  const posts = await db.all(`SELECT * FROM posts WHERE reports!=0 AND deleted=0 ORDER BY reports;`);
  return modPage(req.ip, 'reports', posts);
};
const modQuarantine = async (req) => {
  await getLoggedInModOr404(req);
  const posts = await db.all(`SELECT * FROM posts WHERE quarantine="prechecked" AND deleted=0;`);
  return modPage(req, req.ip, 'quarantine', posts);
}
const modCommand = async (req) => {
  await getLoggedInModOr404(req);
  const {fields, files} = await formData.multiparse(req);
  await formData.maybeCleanupFilesAnd400(files);
  logger.debug('got fields', fields);
  const post = validate.thread(fields.post[0]);
  const board = validate.board(fields.board[0]);
  const clear = fields.clear?.[0];
  const deletePost = fields.deletePost?.[0];
  const deleteFile = fields.deleteFile?.[0];
  //const deleteThread = fields.deleteThread?.[0];
  //const editText = fields.editText?.[0];
  const reason = fields.reason?.[0];
  const banLength = fields.banLength?.[0];
  const postWhere = `WHERE board="${board}" AND post=${post}`;
  const thePost = await db.get(`SELECT * FROM posts ${postWhere};`);
  const logMsg = `${thePost.board}/${thePost.post} by ${thePost.user}`;
  if(clear == 'on'){
    await db.exec(`UPDATE posts SET reports=0 ${postWhere};`);
    logger.info('cleared post ' + logMsg);
  }
  if(deletePost == 'on'){
    await db.exec(`UPDATE posts SET deleted=1 ${postWhere}`);
    logger.info('deleted post ' + logMsg);
  }
  if((deleteFile == 'on' || deletePost == 'on') && thePost.media){
    formData.deleteMedia(thePost.media);
    logger.info('deleted media ' + logMsg);
  }
  if(banLength){
    await dbModule.banUser(thePost.user, reason, banLength);
    logger.info(`banned user ${thePost.user} for ${reason} ` + logMsg);
  }
  return {success: true};
}

const prayerRequests = async () => {
  const theReqs = await db.all(`SELECT rowid,timestamp,user,prayerRequest FROM prayerRequests ORDER BY timestamp;`);
  logger.debug('got reqs', theReqs);
  const hmlFrag = hml.div(
    theReqs.map(req=>hml.div({class: 'prayerRequest'},[
      req.rowid, req.timestamp, req.user, req.prayerRequest
      //hml.button({value: 'clear', onClick: `javascript:fetch('/api/modOps', {method: 'POST', body:JSON.stringify({op:'clearPrayerRequest',rowid: ${req.rowid}})}).then(x=>{console.log('fetch',x);x.json().then(y=>console.log('json', y)))}`})
    ]))
  );
  logger.debug(await hmlFrag.render());
  return hmlFrag;
};

module.exports = {prayerRequests, modLoginApi,modReports,modQuarantine,modCommand};