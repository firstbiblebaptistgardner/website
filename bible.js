const fs = require('fs');
const verses = fs.readFileSync('bible','utf8').split('\n'); 
const labeledVerses = verses.map(verse=>verse.slice(1).split('] ')).filter(x=>x.length==2);
//labeledVerses.forEach((x,i)=>x.length==2||console.log(labeledVerses.slice(i-2,i+3)));
// labeledVerses.forEach(([label,verse])=>console.log(`[${label}] ${verse}`));

const bookNameVariants = {
  'Gen': ['Genesis'],
  'Ex': ['Exodus'],
  'Lev': ['Leviticus'],
  'Num': ['Numbers'],
  'Deut': ['Deuteronomy'],
  'Josh': ['Joshua'],
  'Judg': ['Judges'],
  'Ruth': [],
  '1Sam': ['I Samuel'],
  '2Sam': ['II Samuel'],
  '1Ki': ['I Kings'],
  '2Ki': ['II Kings'],
  '1Ch': ['I Chronicles'],
  '2Ch': ['II Chronicles'],
  'Ezra': [],
  'Neh': ['Nehemiah'],
  'Esth': ['Esther'],
  'Job': [],
  'Ps': ['Psalms', 'Psalm'],
  'Prov': ['Proverbs'],
  'Eccl': ['Ecclesiastes'],
  'Song': ['Song', 'Song of Solomon'],
  'Is': ['Isaiah'],
  'Jer': ['Jeremiah'],
  'Lam': ['Lamentation'],
  'Ez': ['Ezekiel'],
  'Dan': ['Daniel'],
  'Hos': ['Hosea'],
  'Joel': [],
  'Amos': [],
  'Obd': ['Obadiah'],
  'Jon': ['Jonah'],
  'Mic': ['Micah'],
  'Nah': ['Nahum'],
  'Hab': ['Habakkuk'],
  'Zep': ['Zephaniah'],
  'Hag': ['Haggai'],
  'Zech': ['Zechariah'],
  'Mal': ['Malachi'],
  'Mt': ['Matthew', 'Matt'],
  'Mk': ['Mark'],
  'Lk': ['Luke'],
  'Jn': ['John'],
  'Acts': ['Acts', 'Acts of the Apostles'],
  'Rom': ['Romans'],
  '1Cor': ['I Corinthians', 'ICor'],
  '2Cor': ['II Corinthians', 'IICor'],
  'Gal': ['Galatians'],
  'Eph': ['Ephesians'],
  'Phili': ['Philippians'],
  'Col': ['Colossians'],
  '1Th': ['I Thessalonians', '1Thess', 'IThess'],
  '2Th': ['II Thessalonians', '2Thess', 'IIThess'],
  '1Ti': ['I Timothy', '1Tim'],
  '2Ti': ['II Timothy', '2Tim'],
  'Tit': ['Titus'],
  'Phile': ['Philemon'],
  'Heb': ['Hebrews'],
  'Jam': ['James'],
  '1Pe': ['I Peter', '1Pet'],
  '2Pe': ['II Peter', '2Pet'],
  '1Jn': ['I John', '1John'],
  '2Jn': ['II John', '2John'],
  '3Jn': ['III John', '3John'],
  'Jude': [],
  'Rev': ['Revelation', 'Revelation of John']
};

const bookRef2short = {};
const shortRef2long = {};
Object.keys(bookNameVariants).forEach(sref => {
  bookRef2short[sref] = sref;
  bookNameVariants[sref].forEach(ref=>bookRef2short[ref]=sref);
  shortRef2long[sref] = bookNameVariants[sref][0] ?? sref;
});
const bookRef2shortFn = (ref) => {
  if(typeof ref != 'string'){
    throw new Error(`non string ${ref} in bookRef2shortFn`);
  }
  if(bookRef2short[ref]){
    return bookRef2short[ref];
  }
  const noDotSpace = ref.replace(/[. ]/g,'');
  if(bookRef2short[noDotSpace]){
    return bookRef2short[noDotSpace];
  }
  throw new Error(`cant find Bible book for ${ref}/${noDotSpace}`);
}

const verseObj = {};
labeledVerses.forEach(([label, verseText])=>{
  const labelParts = label.split(' ');
  const chapterVerse = labelParts.pop();
  const longBook = labelParts.join(' ');
  const book = bookRef2short[longBook];
  const [chapter, verseId] = chapterVerse.split(':');
  if(!verseObj[book]){
    verseObj[book] = {};
  }
  if(!verseObj[book][chapter]){
    verseObj[book][chapter] = {};
  }
  verseObj[book][chapter][verseId] = verseText;
});


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
  bookRef2short, shortRef2long,
  paraGen, paraBooks, paraStarts, bookRef2shortFn};
