const fss = require('fs');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const sh = require('shelljs');
const conf = require('./conf');
const {Logger} = require('./logger');
const logger = new Logger('db');
const tables = {
  prayerRequests: `
    CREATE TABLE prayerRequests (
      user TEXT NOT NULL,
      prayerRequest TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `,
  bans: `
    CREATE TABLE bans (
      user TEXT NOT NULL,
      reason TEXT NOT NULL,
      endTime TEXT NOT NULL
    );`,
  mods: `
    CREATE TABLE mods (
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      login TEXT
    );`
};

const createDb = async () => {
  logger.info('createDb called');
  for (const table in tables) {
    logger.info('creating', table);
    await db.exec(tables[table]);
    logger.info('created', table);
  }
};

const timestamp = () => {
  return new Date().toISOString();
};

const addPrayerRequest = async (user, prayerRequest) => {
  logger.keys({user,length: prayerRequest.length}).debug('adding prayer request');
  await db.run('INSERT INTO prayerRequests VALUES (?,?,?);', [user, prayerRequest, timestamp()]);
  logger.debug('all prayer requests are', await db.all(`SELECT * FROM prayerRequests;`));
};

const addPost = async (board, thread, user, options, text, media) => {
  logger.keys({ board, thread }).debug('adding post')
  const boardData = await db.get(`SELECT * FROM boards WHERE board="${board}";`);
  const post = boardData.posts + 1;
  const now = timestamp();
  let op = 0;
  let threadPosts;
  let transaction = ['BEGIN;']
  if (!thread) {
    thread = post;
    op = 1;
    threadPosts = 1;
  } else {
    const threadWhere = `WHERE board="${board}" AND post=${thread}`;
    const opData = await db.get(`SELECT * FROM posts ${threadWhere};`);
    logger.assert(opData?.threadPosts, `invalid thread ${thread}`, 400);
    const threadSettings = `SET threadPosts=${opData.threadPosts + 1}`;
    if(media){
      threadSettings += `, threadImages=${opData.threadImages + 1}`;
    }
    if (threadPosts < boardData.postsBeforeAutosage && !options.includes("sage")) {
      threadSettings += `, bump="${now}"`;
    }
    transaction.push(`UPDATE posts ${threadSettings} ${threadWhere};`);
  }
  let mediaField;
  if(media){
    mediaField = `"${media}"`;
  } else {
    mediaField = "NULL";
  }
  transaction.push(`INSERT INTO posts VALUES ("${board}",${post},${thread},"${user}","${now}",0,"${boardData.quarantine}",0,"","",${JSON.stringify(text)},${mediaField},${op},${op ? 1 : 0},${op ? '"' + now + '"' : 'NULL'});`);
  transaction.push(`UPDATE boards SET posts=posts+1 WHERE board="${board}";`);
  transaction.push('COMMIT;');
  const sql = transaction.join('\n');
  logger.debug("transaction", transaction);
  await db.exec(sql);
  return thread;
}

const reportPost = async (board, post, reason, user) => {
  const postWhere = `WHERE board="${board}" AND post=${post}`;
  const thePost = await db.get(`SELECT * FROM posts ${postWhere};`);
  logger.debug('reporting post', thePost);
  if(thePost.reporters.split(',').includes(user)){
    throw new Error(`400 ${user} already reported ${board}/${post}`);
  }
  const reportSql = `UPDATE posts SET reports=reports+1, reasons=reasons||",${reason}", reporters=reporters||",${user}" ${postWhere};`;
  logger.debug('using sql', reportSql);
  await db.exec(reportSql);
}

const banUser = async (user, reason, length) => {
  const later = new Date().getTime() + length * 24 * 60 * 60 * 1000;
  const laterTs = new Date(later).toISOString();
  await db.exec(`INSERT INTO bans VALUES ("${user}","${reason}","${laterTs}");`);
}

const getBan = async (user) => {
  const now = new Date().toISOString();
  const bans = await db.all(`SELECT * FROM bans WHERE user="${user}";`);
  logger.debug('bans are', bans);
  for(const ban of bans){
    if(ban.endTime > now){
      return ban;
    }
  }
}

const fillDb = async () => {
  logger.info('filling db');
  if(conf.defaultModName && conf.defaultModKey){
    logger.info(await db.exec('INSERT INTO mods VALUES ("modkey1234","mod", NULL)'));
  }
  logger.info(await db.get('SELECT * FROM mods;'));
}

sh.mkdir('-p', conf.imageDir);
const dbPath = conf.dataDir + '/data.db';
const dbExists = fss.existsSync(dbPath);
let theDb;
const db = {};
['get', 'all', 'exec', 'run'].forEach(method => {
  db[method] = async (...args) => {
    try {
      return await theDb[method](...args);
    } catch (err) {
      logger.error('sql statement', args);
      throw new Error(`sql error ${err}`, { cause: err });
    }
  }
});
let dbPromiseResolve;
const dbPromise = new Promise(res=>dbPromiseResolve=res);
sqlite.open({
  filename: dbPath,
  driver: sqlite3.Database
}).then(async actualDb => {
  theDb = actualDb;
  dbPromiseResolve('ok');
  if (!dbExists) {
    await createDb();
    await fillDb();
  }
});

module.exports = {db, addPrayerRequest, addPost, dbPromise, reportPost, banUser, getBan};