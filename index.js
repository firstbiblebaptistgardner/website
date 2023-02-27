'use strict';

//sudo iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 5000
//sudo iptables -t nat -I PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 6000

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const cookieParser = require('cookie-parser');
const express = require('express');
const mung = require('express-mung');

const conf = require('./conf');
const db = require('./db');
const hml = require('./hml');
const loggerModule = require('./logger');
const post = require('./post');
const pages = require('./indexHml');
const modOps = require('./modOps');

const logger = new loggerModule.Logger('index');

const app = express();
app.set('json spaces', 2);
app.use(mung.json((body, req) => {
  logger.keys({ unicodes: JSON.stringify(body)?.length }).info('responding');
}, { mungError: true }));
app.use((req, res, next) => {
  req.reqId = crypto.randomUUID();
  loggerModule.alStorage.run(
    {
      values: {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        reqId: req.reqId,
      },
      timers: {
        start: new Date()
      }
    },
    () => next()
  );
});
app.use((req, res, next) => {
  logger.keys({
    userAgent: req.headers['user-agent']
  }).info('request recieved');
  next();
});
app.use(cookieParser());
const attach = function (route, verb, sender, routeFn) {
  const trampoline = async function (req, res, next) {
    try {
      const result = await routeFn(req, res);
      if (sender == 'send') {
        logger.keys({ unicodes: result.length }).info('responding');
      }
      if (sender == 'redirect'){
        logger.keys({code: result[0], redir: result[1]}).info('responding');
      }
      if (sender == 'redirect') {
        res.redirect(...result);
      } else {
        res[sender](result);
      }
    } catch (err) {
      next(err);
    }
  }
  logger.info(`attaching ${sender} to ${verb}:${route}`);
  app[verb](route, trampoline);
}
const re404 = (req, res) => {
  logger.debug('re404');
  return [303, '/404'];
}
const page404 = async (req, res) => {
  return [
    templates.htmlTop('404'),
    'no such page',
    templates.htmlBottom()
  ].join('\n');
}
//attach('/posts', 'get', 'json', async () => await db.all('SELECT * FROM posts;'));
attach('/500', 'get', 'json', async (req, res) => {
  throw new Error('500 requested');
});
attach('/404', 'get', 'send', page404);
const statics = {
  '/style.css': '/style.css',
  '/church.jpg': '/church.jpg',
  '/bible': '/bible'
};
for (const path in statics) {
  app.get(path, (req, res) => {
    logger.debug('sending /');
    res.sendFile(__dirname + statics[path]);
  });
}
app.get('/images/:file', (req, res) => {
  const file = req.params.file;
  logger.debug(`sending ${file}`);
  res.sendFile(`${conf.imageDir}/${file}`);
});
attach('/', 'get', 'send', hml.route(pages.index));
attach('/calendar', 'get', 'send', hml.route(pages.calendar));
attach('/prayerRequest', 'get', 'send', hml.route(pages.prayerRequest));
attach('/api/prayerRequest', 'post', 'redirect', post.prayerRequestApi);
attach('/prayerRequestComplete', 'get', 'send', hml.route(pages.prayerRequestComplete));
attach('/mod/login', 'get', 'send', hml.route(pages.modLogin));
attach('/api/modLogin', 'post', 'redirect', modOps.modLoginApi);
attach('/mod/prayerRequests', 'get', 'send', hml.route(pages.modPrayerRequests));
attach(':whatever', 'get', 'redirect', re404);
app.use((err, req, res, next) => { // error handler
  logger.warn('caught error', err);
  const status = +err.chHttpCode || +err.message?.slice(0, 3) || 500;
  if(status == 404){
    redirect(302,'/404');
  } else {
    const out = {reqId: req.reqId};
    if(status < 500){
      out.message = err.message;
    }
    res.status(status).json(out);
  }
});

const servers = [];
const httpServer = http.createServer(app);
servers.push([httpServer, 5000]);

if(conf.https){
  const le = '/etc/letsencrypt/live/firstbiblebaptistgardner.com/';
  const creds = {
      key: 'privkey.pem',
      cert: 'cert.pem',
      ca: 'chain.pem'
  };
  for(const key in creds){
    creds[key] = fs.readFileSync(le+creds[key]);
  }
  const httpsServer = https.createServer(creds, app);
  servers.push([httpsServer, 6000]);
}

db.dbPromise.then(() => {
  for(const [server, port] of servers){
    server.listen(port, () => {
      logger.keys({ port }).info('listening')
    })
  }
});