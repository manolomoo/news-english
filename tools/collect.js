// node tools/collect.js week01 → 輸出所有會被唸出來的字串 JSON
const fs=require("fs");global.window=global;
eval(fs.readFileSync(process.argv[2]+"-data.js","utf8"));
const W=window.WEEK,S=new Set();const add=s=>{if(s&&typeof s==="string")S.add(s)};
const plain=s=>s.replace(/\{\d+\|([^}]+)\}/g,"$1").replace(/\s*\[\[[^\]]*\]\]/g,"").replace(/\s+/g," ").trim();
W.groups.forEach(g=>g.cards.forEach(c=>{add(c.say||c.w);add(c.ex);add(c.ex2)}));
W.texts.forEach(t=>t.paras.forEach(p=>p.forEach(s=>add(plain(s)))));
W.syn.forEach(s=>add(s[0]));
W.decks.forEach(d=>d.items.forEach(it=>{it.a.forEach(add);if(d.kind==="qa")add(it.q.replace(/^(Q\d|Question):\s*/,""))}));
console.log(JSON.stringify([...S],null,0));
