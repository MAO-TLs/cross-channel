const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/script-reader.js'),'utf8');
function extract(name,next){return source.slice(source.indexOf(`  function ${name}(`),source.indexOf(`  function ${next}(`));}
function node(tag,text=''){return {tag,text,children:[],append(...xs){this.children.push(...xs)},setAttribute(){},addEventListener(){},getAttribute(){}};}
const ctx={el:(tag,cls,text)=>node(tag,text||''),displayText:x=>String(x||''),document:{createTextNode:t=>node('#text',t)}};
vm.createContext(ctx);
vm.runInContext(extract('displayShaftItem','paragraph')+extract('categoryLabel','sourceVariantNotice'),ctx);
function visible(n){return n.text+n.children.filter(x=>x.tag!=='span').map(visible).join('');}
const text='"A short synthetic sentence."';
for(const [name,highlights] of [['no spans',[]],['unmatched span',[{start:0,end:4,text:'missing'}]],['valid span',[{start:1,end:8,text:'A short'}]]]){
 test(name+' renders text once',()=>assert.equal(visible(ctx.annotatedParagraph({id:'test',en:text,highlights})),text));
}
test('removing a speaker prefix clips highlight text and offsets together',()=>{
 const raw='Speaker: '+text;
 const item=ctx.displayShaftItem({id:'prefix',en:raw,highlights:[{start:0,end:raw.length,text:raw}]},{speakerEn:'Speaker'});
 assert.equal(item.highlights[0].text,text);
 assert.equal(item.highlights[0].start,0);
 const rendered=ctx.annotatedParagraph(item);
 assert.equal(visible(rendered),text);
 assert.equal(rendered.children.filter(x=>x.tag==='button').length,1);
});
