import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('CROSS CHANNEL context navigation preserves search, comparisons and Forward target', async () => {
  const nodes = new Map(), handlers = new Map(), storage = new Map();
  class Node {
    constructor(tag = 'div') { this.tagName=tag.toUpperCase(); this.children=[]; this.events={}; this.dataset={}; this.value=''; this.className=''; this.classList={add:()=>{},remove:()=>{}}; }
    set id(value) { this._id=value; nodes.set(value,this); }
    get id() { return this._id; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children=children; }
    setAttribute(name,value) { this[name]=value; }
    addEventListener(name,handler) { this.events[name]=handler; }
    scrollIntoView() {}
    focus() { document.activeElement=this; }
  }
  const document = {
    getElementById:id=>nodes.get(id),
    createElement:tag=>new Node(tag),
    createDocumentFragment:()=>new Node(),
    createTextNode:text=>({textContent:text}),
    querySelectorAll:()=>[], addEventListener:()=>{},
  };
  const html = readFileSync(new URL('../script/index.html',import.meta.url),'utf8');
  for (const [,id] of html.matchAll(/id="([^"]+)"/g)) { const node=new Node(); node.id=id; }
  const initial='https://mao-tls.github.io/cross-channel/script/?script=0000&scope=all&q=town&compare=ghs&errors=ghs';
  const entries=[initial]; let position=0;
  const location={href:initial};
  const history={
    replaceState:(_s,_t,url)=>{entries[position]=location.href=new URL(url,location.href).href;},
    pushState:(_s,_t,url)=>{entries.splice(position+1); entries.push(location.href=new URL(url,location.href).href); position++;},
  };
  const row={ref:'cc:test:1',row:1,jp:'町',en:'A town.',ghs:[]};
  const window={location, addEventListener:(name,fn)=>handlers.set(name,fn)};
  const fetch=async url=>({ok:true,json:async()=>url.endsWith('index.json')?{scripts:[{id:'0000',path:'data/script/0000.json',rows:1,comparisons:1}]}:{script:'0000',rows:[row]}});
  vm.runInNewContext(readFileSync(new URL('../assets/script-reader.js',import.meta.url),'utf8'), {
    window,document,history,URL,Map,Set,console,fetch,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout,
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(nodes.get('scopeAll').checked,true);
  const fragment=nodes.get('corpusResults').children[0];
  const contextButton=fragment.children[0].children[0];
  contextButton.events.click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(entries.length,2);
  assert.equal(new URL(entries[1]).searchParams.get('compare'),'ghs');
  assert.equal(new URL(entries[1]).searchParams.get('errors'),'ghs');
  assert.equal(new URL(entries[0]).searchParams.get('q'),'town');
  assert.equal(nodes.get('scopeCurrent').checked,true);
  assert.equal(nodes.get('scriptSelect').disabled,false);
  assert.match(nodes.get('ref-cc_test_1').className,/script-line-target/);
  position=0; location.href=entries[position]; await handlers.get('popstate')();
  assert.equal(nodes.get('scopeAll').checked,true);
  assert.equal(nodes.get('scopeCurrent').checked,false);
  assert.equal(nodes.get('searchInput').value,'town');
  position=1; location.href=entries[position]; await handlers.get('popstate')();
  assert.equal(nodes.get('scopeCurrent').checked,true);
  assert.equal(nodes.get('searchInput').value,'');
  assert.match(nodes.get('ref-cc_test_1').className,/script-line-target/);
  assert.equal(document.activeElement.id,'ref-cc_test_1');
});
