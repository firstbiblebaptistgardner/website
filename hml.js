const bible = require('./bible.js');
const {Logger} = require("./logger");
const logger = new Logger('hml');

const makeSpace = (indent) => ''.padEnd(2*indent);
const element = (name, params, childs) => {
  if(childs === undefined && Array.isArray(params)){
    childs = params;
    params = undefined;
  }
  if(childs){
    childs.forEach(child=>{
      if(['string','number','function'].includes(typeof child)){
        return;
      }
      if(typeof child == 'object' && child?.name){
        return;
      }
      console.log('attempt to add invalid child element', child);
      throw new Error('attempt to add invalid child element');
    });
  }
  return {name, params, childs, render: function(){return render(this)}};
};
const render = async (element, indent=0, buffer) => {
  logger.trace('rendering at indent', indent, element.name);
  const newBuffer = !buffer;
  if(newBuffer){
    buffer = [];
  }
  if(typeof element == 'string' || typeof element == 'number'){
    buffer.push(makeSpace(indent) + element);
  } else if(typeof element == 'function'){
    const data = await element();
    logger.trace('got element data', data);
    await render(data, indent, buffer);
  } else {
    const {name, params, childs} = element;
    let paramText = params ? Object.keys(params).map(p=>` ${p}=${JSON.stringify(params[p])}`).join('') : '';
    const startTag = `<${name}${paramText}>`;
    const endTag = `</${name}>`;
    if(childs?.length){
      buffer.push(makeSpace(indent) + startTag);
      for(const child of childs){
        await render(child, indent+1, buffer);
      }
      buffer.push(makeSpace(indent) + endTag);
    } else {
      buffer.push(makeSpace(indent) + startTag + endTag);
    }
  }
  if(newBuffer){
    const out = buffer.join('\n');
    logger.trace('returning buffer', out);
    return out;
  }
}
const hml = {
  element,
  render,
  route: (hmlData) => async (req, res) => res.send(await hmlData.render()),
  tooltipsOnVerseRefsArray: text=>{
    const segs = [];
    let index = 0;
    while(true){
      end = text.indexOf(']', index);
      if(end == 0){
        break;
      }
      begin = text.lastIndexOf('[',end);
      if(begin < index){
        break;
      }
      const ref = text.slice(begin+1,end);
      console.log(`got ref from ${begin} to ${end} its ${ref}`);
      const parts = ref.split(' ');
      const section = parts.pop();
      const book = parts.join(' ');
      console.log('book and section',book,section);
      const [chapter,verses] = section.split(':');
      const [startVerse,endVerse] = verses.split('-');
      seg = text.slice(begin, end+1);
      if(index < begin){
        segs.push({
          begin: index, 
          end: begin,
          seg: text.slice(index, begin)
        });
      }
      segs.push({begin, end, seg, book, chapter, startVerse, endVerse});      index = end+1;
    }
    if(index < text.length){
      segs.push({
        begin: index,
        end: text.length,
        seg: text.slice(index, text.length)
      });
    }
    logger.debug(segs);
    const out = [];
    for(const seg of segs){
      console.log('processsing seg', seg);
      const longBook = bible.book2long[seg.book];
      const shortBook = bible.long2short[longBook];
      if(!shortBook){
        out.push(seg.seg);
        continue;
      }
      const bibleSection = bible.getBibleSection(longBook, seg.chapter, seg.startVerse, seg.endVerse);
      console.log('bible verse', bibleSection);
      out.push(hml.span({class: 'bibleRef', title: bibleSection},[seg.seg]));
    }
    return out;
  }
};
['html','head','body','a','b','div','i','p','h1','h2','span',
 'title','link','select','option','button','form','input','textarea',
 'iframe','ol','ul','li','img'].forEach(key => hml[key] = (params, childs) => element(key, params, childs));
module.exports = hml;