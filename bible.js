const fs = require('fs');
const verses = fs.readFileSync('bible','utf8').split('\n'); 
const labeledVerses = verses.map(verse=>verse.slice(1).split('] ')).filter(x=>x.length==2);
//labeledVerses.forEach((x,i)=>x.length==2||console.log(labeledVerses.slice(i-2,i+3)));
// labeledVerses.forEach(([label,verse])=>console.log(`[${label}] ${verse}`));
const verseObj = {};
labeledVerses.forEach(([label, verseText])=>{
  const labelParts = label.split(' ');
  const chapterVerse = labelParts.pop();
  const book = labelParts.join(' ');
  const [chapter, verseId] = chapterVerse.split(':');
  if(!verseObj[book]){
    verseObj[book] = {};
  }
  if(!verseObj[book][chapter]){
    verseObj[book][chapter] = {};
  }
  verseObj[book][chapter][verseId] = verseText;
});
const long = [
  'Genesis',         'Exodus',           'Leviticus',
  'Numbers',         'Deuteronomy',      'Joshua',
  'Judges',          'Ruth',             'I Samuel',
  'II Samuel',       'I Kings',          'II Kings',
  'I Chronicles',    'II Chronicles',    'Ezra',
  'Nehemiah',        'Esther',           'Job',
  'Psalms',          'Proverbs',         'Ecclesiastes',
  'Song of Solomon', 'Isaiah',           'Jeremiah',
  'Lamentations',    'Ezekiel',          'Daniel',
  'Hosea',           'Joel',             'Amos',
  'Obadiah',         'Jonah',            'Micah',
  'Nahum',           'Habakkuk',         'Zephaniah',
  'Haggai',          'Zechariah',        'Malachi',
  'Matthew',         'Mark',             'Luke',
  'John',            'Acts',             'Romans',
  'I Corinthians',   'II Corinthians',   'Galatians',
  'Ephesians',       'Philippians',      'Colossians',
  'I Thessalonians', 'II Thessalonians', 'I Timothy',
  'II Timothy',      'Titus',            'Philemon',
  'Hebrews',         'James',            'I Peter',
  'II Peter',        'I John',           'II John',
  'III John',        'Jude',             'Revelation of John'
];
const short = [
  'Gen', 'Ex', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth',
  '1Sam', '2Sam', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezra', 'Neh', 'Esth',
  'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Is', 'Jer', 'Lam', 'Ez',
  'Dan', 'Hos', 'Joel', 'Amos', 'Obd', 'Jon', 'Mic', 'Nah', 'Hab', 'Zep',
  'Hag', 'Zech', 'Mal', 'Mt', 'Mk', 'Lk', 'Jn', 'Acts', 'Rom',
  '1Cor', '2Cor', 'Gal', 'Eph', 'Phili', 'Col', '1Th', '2Th',
  '1Ti', '2Ti', 'Tit', 'Phile', 'Heb', 'Jam', '1Pe', '2Pe',
  '1Jn', '2Jn', '3Jn', 'Jude', 'Rev'
];
const long2short = {};
const short2long = {};
const book2long = {};
for(let i=0; i<long.length; i++){
  long2short[long[i]] = short[i];
  short2long[short[i]] = long[i];
  book2long[long[i]] = long[i];
  book2long[short[i]] = long[i];
}
const paraStarts = labeledVerses.filter(
  ([label, verseText])=>verseText[0]=='¶'
).map(
  ([label, verseText])=>label
);
const paraBooks = {};
for(const ps of paraStarts){
  const parts = ps.split(' ');
  parts.pop();
  const book = parts.join(' ');
  if(paraBooks[book]){
    paraBooks[book]++;
  } else {
    paraBooks[book] = 1;
  }
}
const startsPara = text => text[0] == '¶';
const paraGen = (book)=>{
  const allParas = [];
  let paraBuf = [];
  const appendPara = () => {
    allParas.push(paraBuf.join(' '));
    paraBuf = [];
  };
  const addVerse = (label, verseText) => {
    paraBuf.push(label.split(':')[1]+verseText);
  };
  for(let i=0; i<labeledVerses.length; i++){
    const [label, verseText] = labeledVerse[i];
    if(label.startsWith(book)){
      if(startsPara(verseText)){
        appendPara();
      }
      addVerse(label, verseText);
      if(i==labeledVerse.length-1){
        appendPara();
      }
    }
  }
  return allParas;
};
const randomVerse = () => verses[Math.floor(Math.random() * verses.length)];
const getBibleVerse = (book, chapter, verse) => {
  return verseObj[book][chapter][verse];
}
const getBibleSection = (book, chapter, startVerse, endVerse) => {
  const out = [getBibleVerse(book, chapter, startVerse)];
  for(let i=+startVerse+1; i<+endVerse+1; i++){
    console.log(`adding ${book} ${chapter}:${i}`);
    out.push(` ${i}`);
    const theVerse = getBibleVerse(book, chapter, i);
    if(startsPara(theVerse)){
      out.push('\n');
    }
    out.push(theVerse);
  }
  return out.join('');
}

module.exports = {labeledVerses, verseObj,
  randomVerse, getBibleVerse, getBibleSection,
  long, short, long2short, short2long, book2long,
  paraGen, paraBooks, paraStarts};
