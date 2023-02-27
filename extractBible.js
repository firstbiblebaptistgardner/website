'use strict';
const logger = {};
['error','warn','info','debug'].forEach((level,i)=>{
  logger[level] = (...line)=>{
    if(i<2){
      console.log(`[${level}]`, ...line);
    }
  };
});

const fs = require('fs');
const sh = require('shelljs');

const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
const smallCaps = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ';
const cursiveCapsString = '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵'
const cursiveCaps = [];
for(const cap of cursiveCapsString){
  cursiveCaps.push(cap);
}
const lowerCase2smallCaps = {}
const lowerCase2cursiveCaps = {}
for(let i=0;i<lowerCase.length; i++){
  lowerCase2smallCaps[lowerCase[i]] = smallCaps[i];
  lowerCase2cursiveCaps[lowerCase[i]] = cursiveCaps[i];
}
let types = {};
const divineNames = {};
const ltprocess = (s)=>{
  const sStart = s;
  logger.debug('processing verse', s);
  let newChapter = false;
  const replace = (index,length,replacement) => {
    s = s.slice(0,index) + replacement + s.slice(index+length);
  };
  const toSmallcaps = (x)=>x.split('').map(c=>lc2sc[c]?lc2sc[c]:c).join('');
  let index;
  while(1){
    /*need recursive groups to get this to work right
    re=/\\sword(?<type>[a-z]+)(?<brace0>{[^}]*})(?<brace1>{[^}]*})?(?<brace2>{[^}]*})?/;
    m = s.match(re);
    logger.debug('match', m);
    if(!m){
      break;
    }
    type = m.groups.type;
    index = m.index;
    length = m[0].length;
    */
    index = s.indexOf('\\', index);
    if(index == -1){
      break;
    }
    if(s[index+1] == '\\'){
      index += 2;
      continue;
    }
    let type = '';
    let i;
    for(i=index+1; i!=s.length; i++){
      if([' ', '{'].includes(s[i])){
        break;
      }
      type += s[i];
    }
    const braced = [];
    while(s[i] == '{'){
      logger.debug('starting { at', i);
      i++;
      let level = 1;
      let item = '';
      for(; i!=s.length; i++){
        if(s[i] == '{'){
          logger.debug('inside { at', i);
          level++;
        }
        if(s[i] == '}'){
          logger.debug('ending } at', i, 'level is', level);
          level--;
          if(level == 0){
            braced.push(item);
            i++;
            break;
          }
        }
        item += s[i];
      }
    }
    const length = i-index;
    logger.debug('got latex', {type, braced, index, length, s});
    if(type.startsWith('sword')){
      type = type.slice(5);
    } else {
      logger.warn('unkown latex expression', type, s.slice(index, i));
    }
    if(types[type]){
      types[type]++;
    } else {
      types[type]=1;
    }
    let vnum;
    let newChapter = false;
    if(type == 'verse'){
      vnum = braced[1];
      if(vnum.split(':')[1] == '1'){
        newChapter = true;
      }
      replace(index,length+1,'[' + vnum + ']');
    } else if(type == 'chapter'){
      replace(index, length, '');
    } else if(type == 'poetryline'){
      replace(index, length, braced[0])
    } else if(type == 'transchange'){
      replace(index,length,braced[1])
    } else if (type == 'divinename'){
      const lower = braced[0].trim()
      /*smallcap = toSmallcaps(lower);
      console.log(smallcap);
      ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ*/
      const l2u = {
        'LORD': 'Lᴏʀᴅ',
        'Lord': 'Lᴏʀᴅ',
        'GOD': 'Gᴏᴅ',
        'JEHOVAH':'Jᴇʜᴏᴠᴀʜ',
        'LORD’s': 'Lᴏʀᴅ’s',
        'Lord thy God': 'Lᴏʀᴅ thy Gᴏᴅ',
        'Lord seeth': 'Lᴏʀᴅ seeth',
        'Jah': 'Jᴀʜ'
      }
      const upper = l2u[lower]
      if(divineNames[lower]){
        divineNames[lower]++;
      } else {
        divineNames[lower]=1;
      }
      if(divineNames[upper]){
        divineNames[upper]++;
      } else {
        divineNames[upper]=1;
      }
      replace(index,length,lower);
    } else {
      logger.warn('unknown sword expression', index, i, type, braced, s.slice(index, i), length, s);
      replace(index, length, type);
    }
  }
  if(s.endsWith('//')){
    s = s.slice(0,s.length-2).trim();
  }
  if(newChapter){
    let [label, verse] = s.split('] ');
    const letter = verse[0];
    let para = false;
    if(letter == '¶'){
      letter = verse[1];
      para = true;
    }
    const lower = letter.toLowerCase();
    const cap = lowerCase2cursiveCaps[lower];
    logger.debug('adding cap', cap);
    s = `${label}] ${para?'¶':''}${cap}${para?verse.slice(2):verse.slice(1)}`;
    logger.debug('verse is', s);
  }
  if(s == ''){
    logger.error('empty verse', sStart, s);
  }
  return s;
}
const alltypes = {};
const allverses = [];
const getAllVerses = books => books.forEach(book => {
  const text = sh.exec('diatheke -b engKJV2006eb -f latex -k ' + book, {silent: true}).stdout;
  const verses = text.split('\n').filter(x=>x.startsWith('\\swordverse')||x.startsWith('\\swordchapter')||x.startsWith('\\swordpoetryline'));
  //console.log('verses are', verses);
  const processed = verses.map(x=>ltprocess(x));
  allverses.push(...processed);
  logger.info(book, types);
  alltypes[book] = types;
  types = {};
});
//getAllVerses(['Jude']);
getAllVerses(['Gen', 'Ex', 'Lev', 'Num', 'Deu', 'Jos','Judg', 'Ruth', '1Sam', '2Sam', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezra', 'Neh', 'Est', 'Job', 'Psa', 'Pro', 'Ecc', 'Song', 'Is', 'Jer', 'Lam', 'Ez', 'Dan', 'Hos', 'Joe', 'Amo', 'Oba', 'Jon', 'Mic', 'Nah', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal', 'Mat', 'Mk', 'Lk', 'Jn', 'Act', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phili', 'Col', '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phile', 'Heb', 'Jam', '1Pe', '2Pe', '1Jn', '2Jn', '3Jn', 'Jude', 'Rev']);

console.log(alltypes);
console.log(divineNames);
fs.writeFileSync('bible', allverses.join('\n'));