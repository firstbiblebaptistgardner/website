const fss = require('fs');
const conf = require('./conf');
const { db } = require('./db');
const { Logger } = require('./logger');
const bible = fss.readFileSync('bible', 'utf-8').split('\n');
const verse = () => bible[Math.floor(Math.random() * bible.length)];
const logger = new Logger('templates');
const thumbnail = (media, cls) => {
  const name = media.split('.')[0];
  return `<img ${cls ? 'class="' + cls + '"' : ''} src="/images/${name}_s.jpg">`;
};
const timestampFriendly = (t) => {
  //2022-05-29T20:20:04.961Z
  return `${t.slice(5, 7)}/${t.slice(8, 10)} at ${t.slice(11, 16)}`;
}
module.exports = {
  timestampFriendly,
  htmlTop: (title, { script, scriptUrl}) => {
    const out = [`<html>
  <head>
    <title>${title}</title>`];
    if (script) {
      out.push(`
    <script>
${script}
    </script>`)
    };
    if(scriptUrl){
      out.push(`    <script src='${scriptUrl}'></script>`)
    }
    out.push(
      `    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <div id=verse>${verse()}</div>
    <hr>`)
    return out.join('\n');
  },
  htmlBottom: () => `
  <hr>
  <a href="/xp/catalog">/xp/ - Christposting</a>
  </body>
</html>
`,
  postForm: (board, thread) => {
    const out = [`<form action="/post/${board}" method="post" enctype="multipart/form-data">`]
    if (thread) {
      out.push(`<input type="hidden" name="thread" value="${thread}">`);
    }
    out.push(`  <label>options</label>
  <input type="text" name="options">
  <label>text</label>
  <textarea name="text"></textarea>
  <label>image</label>
  <input type="file" name="media">
  <input type="submit" value="post">
</form>`);
    return out.join('\n');
  },
  thumbnail,
  renderPosts: async (posts, user, { thread, extraTemplate }) => {
    const linked = {};
    for (const post of posts) {
      const myRe = /(&gt;&gt;[0-9]+)/;
      post.splitText = post.text?.split(myRe);
      if (post.splitText) {
        for (let i = 1; i < post.splitText.length; i += 2) {
          if (post.splitText[i].match(myRe)) {
            const linko = {
              linkText: post.splitText[i],
              link: post.splitText[i].slice(8),
            };
            linked[linko.link] = null;
            post.splitText[i] = linko;
          }
        }
        logger.debug('splitText is', post.splitText);
      }
    }
    const linkedPosts = await db.all(`SELECT * FROM posts WHERE post IN (${Object.keys(linked).join(',')});`);
    for (const linkedPost of linkedPosts) {
      linked[linkedPost.post] = linkedPost;
    }
    logger.debug('got linked posts', linked);
    const out = [];
    for (const post of posts) {
      if (thread) {
        out.push(`<a id="${post.post}">`);
      }
      out.push(`<div class="post" id="${post.board}/${post.post}">`);
      out.push('<p>');
      out.push(`  <b>${post.post}:</b>${timestampFriendly(post.timestamp)}`);
      out.push(`  <input type="button" value="report" onclick="reportPost('${post.board}',${post.post});" class="reportButton">`);
      if(post.user == user){
        out.push(`  <input type="button" value="delete" onclick="deletePost('${post.board}',${post.post});" class="deleteButton">`);
      }
      out.push('</p>');
      out.push('<p class="post">');
      if (post.media) {
        out.push(thumbnail(post.media, "thumb"));
      }
      if (post.text) {
        const text = [];
        for (let i = 0; i < post.splitText.length; i++) {
          if (!post.splitText[i].linkText) {
            text.push(post.splitText[i]);
          } else {
            logger.debug('ith splitText', post.splitText[i]);
            const { link, linkText } = post.splitText[i];
            logger.debug('link', link);
            let href;
            if (linked[link].thread != thread || linked[link].board != post.board) {
              href = `/${linked.board}/${linked.thread}#${link}`;
            } else {
              href = `#${link}`;
            }
            text.push(`<a href="${href}">${linkText}`);
            if (linked[link].user == user) {
              text.push(' (You)');
            }
            if (linked[link].op && (!thread || linked[link].thread == thread)) {
              text.push(' (OP)');
            }
            text.push('</a>');
          }
        }
        out.push(text.join(''));
      }
      out.push('</p>');
      out.push('<div style="clear: left"></div>');
      if (extraTemplate) {
        out.push(extraTemplate(post));
      }
      out.push('</div>');
      if (thread) {
        out.push('</a>');
      }
      out.push('<br>');
    }
    return out.join('\n');
  },
  modButtons: (post) => {
    const id = `report:${post.board}/${post.post}`;
    return `
    <p>reported ${post.reports} times</p>
    <p>${post.reasons}</p>
    <p>${post.reporters}</p>
    <form id=${id}>
      <input type="hidden" name="board" value="${post.board}">
      <input type="hidden" name="post" value="${post.post}">
      clear<input type="checkbox" name="clear"></input>
      deletePost<input type="checkbox" name="deletePost"></input>
      deleteFile<input type="checkbox" name="deleteFile"></input>
      deleteThread<input type="checkbox" name="deleteThread"></input>
      <input type="button" onclick="editText(${id})" value="editText"></input>
      warning reason<input type="text" name="reason"></input>
      ban length<input type="text" name="banLength"></input>
      <input type="button" onclick="execute('${id}')" value="execute"></input>
    </form>
    `;
  },
}
