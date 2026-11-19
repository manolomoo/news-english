/* 我的單字（新聞英文｜貴婦養成之路）
   在課文裡長按／雙擊單字，或拖選片語 → 彈窗 → 加入我的單字。單擊句子仍是播放整句。
   localStorage 鍵：neMyWords1（只讀寫這一個；不碰 enNewsRW1／enLadyRPG1／enLadyAssetsOpen／SRS）。
   每筆：{w 詞或片語, zh 中文意思, s 出處英文句, l 週 id（week01）, n 週次, t 加入時間(ms)}。
   中文意思離線自動填入：本週 WEEK.groups[].cards → dict/en-zh.json（ECDICT, MIT License）→ 都沒有就讓使用者自己打。
   首頁：MW.home(el) 渲染列表區塊；單元頁：MW.bindRich(box,{sel,onTap}) 綁課文句。 */
(function(){
const K="neMyWords1",VER=String(window.PAGEVER||"23");
let MEM=null;
const load=()=>{try{const v=localStorage.getItem(K);if(v){const a=JSON.parse(v);if(Array.isArray(a))return a.filter(x=>x&&typeof x.w==="string")}}catch(e){}return MEM||[]};
const save=a=>{MEM=a;try{localStorage.setItem(K,JSON.stringify(a))}catch(e){}};
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nkey=s=>String(s).toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();
const plain=s=>String(s).replace(/\s+/g," ").trim();
const LTR=/[\p{L}\p{N}]/u,HASL=/\p{L}/u;
const sorted=()=>load().slice().sort((a,b)=>(b.t||0)-(a.t||0));
const find=w=>{const k=nkey(w);return load().find(x=>nkey(x.w)===k)};
function add(it){const a=load(),k=nkey(it.w),i=a.findIndex(x=>nkey(x.w)===k);if(i>=0)a[i]=it;else a.push(it);save(a);refresh()}
function del(w){const k=nkey(w);save(load().filter(x=>nkey(x.w)!==k));refresh()}

/* ===== 離線詞典 ===== */
let dictP=null;
function dict(){if(!dictP)dictP=fetch("dict/en-zh.json?v="+VER).then(r=>r.ok?r.json():Promise.reject()).catch(()=>{dictP=null;return {}});return dictP}
function cands(w){w=nkey(w);const o=[w],b=w.replace(/'s$/,""),p=x=>{if(x&&x.length>1&&o.indexOf(x)<0)o.push(x)};
 p(b);
 if(/ies$/.test(b))p(b.slice(0,-3)+"y");if(/ied$/.test(b))p(b.slice(0,-3)+"y");
 if(/es$/.test(b))p(b.slice(0,-2));if(/s$/.test(b))p(b.slice(0,-1));
 if(/ed$/.test(b)){p(b.slice(0,-2));p(b.slice(0,-1));if(/(.)\1ed$/.test(b))p(b.slice(0,-3))}
 if(/ing$/.test(b)){p(b.slice(0,-3));p(b.slice(0,-3)+"e");if(/(.)\1ing$/.test(b))p(b.slice(0,-4))}
 if(/ier$/.test(b))p(b.slice(0,-3)+"y");if(/er$/.test(b)){p(b.slice(0,-2));p(b.slice(0,-1))}
 if(/iest$/.test(b))p(b.slice(0,-4)+"y");if(/est$/.test(b)){p(b.slice(0,-3));p(b.slice(0,-2))}
 if(/ly$/.test(b))p(b.slice(0,-2));
 return o}
const pad=n=>String(n).padStart(2,"0");
const weekId=()=>{const W=window.WEEK;return W&&W.n?"week"+pad(W.n):""};
/* 本週單字卡：WEEK.cards（若有）＋ WEEK.groups[].cards 全部攤平 */
const cards=()=>{const W=window.WEEK;if(!W)return[];let a=[];if(Array.isArray(W.cards))a=a.concat(W.cards);if(Array.isArray(W.groups))W.groups.forEach(g=>{if(g&&Array.isArray(g.cards))a=a.concat(g.cards)});return a};
/* → Promise<{zh,src:"card"|"dict"|""}> */
async function lookup(text){
 const cs=cands(text),single=!/\s/.test(text.trim()),CL=cards();
 if(CL.length)for(const c of (single?cs:[cs[0]])){const h=CL.find(x=>nkey(x.w)===c);if(h&&h.zh)return{zh:h.zh,src:"card"}}
 const d=await dict();
 for(const c of (single?cs:[cs[0]]))if(d[c])return{zh:d[c],src:"dict"};
 return{zh:"",src:""}}

/* ===== 發音：有預錄 mp3 用 TTS.play，否則 speechSynthesis（en-US） ===== */
function speak(text){
 try{if(window.__stopAll)window.__stopAll()}catch(e){}
 try{const C=window.UNIT_C||{},lo=text.toLowerCase();let k=C[text]?text:C[lo]?lo:null;
  const CL=cards();if(!k&&CL.length){const c=CL.find(x=>nkey(x.w)===nkey(text));if(c){const kk=c.say||c.w;if(C[kk])k=kk}}
  if(k&&window.TTS&&TTS.play){if(TTS.unlock)TTS.unlock();TTS.play(k,1);return}}catch(e){}
 try{if(window.TTS&&TTS.cancel)TTS.cancel();const s=window.speechSynthesis;if(!s||typeof SpeechSynthesisUtterance==="undefined")return;s.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.9;s.speak(u)}catch(e){}}

/* ===== 列表（首頁區塊、單元頁面板共用） ===== */
const mounts=[];
const lessonNo=it=>it.n||(String(it.l||"").match(/\d+/)||[""])[0];
function hiSent(s,w){s=String(s||"");const i=s.toLowerCase().indexOf(String(w).toLowerCase());if(i<0||!w)return esc(s);return esc(s.slice(0,i))+"<b>"+esc(s.slice(i,i+w.length))+"</b>"+esc(s.slice(i+w.length))}
function itemHTML(it){const n=lessonNo(it),cur=!!it.l&&weekId()===it.l;
 const ls=n?(cur?`<span class="mw-ls">第 ${esc(n)} 週</span>`:`<a class="mw-ls" href="${esc(it.l||("week"+pad(n)))}.html">第 ${esc(n)} 週</a>`):"";
 return `<div class="mw-it" data-w="${esc(it.w)}"><div class="mw-r1"><span class="mw-iw">${esc(it.w)}</span><button type="button" class="mw-sp" data-a="sp" aria-label="發音">🔊</button></div>
 <div class="mw-zh${it.zh?"":" mu"}">${it.zh?esc(it.zh):"（還沒填意思）"}</div>${it.s?`<div class="mw-is">${hiSent(it.s,it.w)}</div>`:""}
 <div class="mw-r3">${ls}<button type="button" class="mw-del" data-a="del">刪除</button></div></div>`}
function mount(el,opt){opt=opt||{};const m={el,limit:opt.limit||0,all:false,head:opt.head,draw:null};
 m.draw=()=>{const a=sorted(),shown=(m.limit&&!m.all)?a.slice(0,m.limit):a;
  const hd=m.head?`<div class="mw-hd2"><b>⭐ 我的單字</b><span class="mu">${a.length?a.length+" 個":""}</span></div>`:"";
  el.innerHTML=hd+(a.length?`<div class="mw-list">${shown.map(itemHTML).join("")}</div>${shown.length<a.length?`<button type="button" class="b" data-a="more">顯示全部（${a.length}）</button>`:""}`
   :`<div class="mu mw-empty">在課文裡長按、雙擊單字，或拖選片語即可加入。</div>`)+`<div class="mw-cr">中文詞義離線字典取自 ECDICT（MIT License）。</div>`};
 el.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-a]");if(!b||!el.contains(b))return;const a=b.getAttribute("data-a"),it=b.closest(".mw-it");
  if(a==="more"){m.all=true;m.draw();return}
  const w=it&&it.getAttribute("data-w");if(!w)return;
  if(a==="sp")speak(w);else if(a==="del")del(w)});
 mounts.push(m);m.draw();return m}
function refresh(){for(let i=mounts.length-1;i>=0;i--){const m=mounts[i];if(!document.body.contains(m.el)){mounts.splice(i,1);continue}try{m.draw()}catch(e){}}}
window.addEventListener("storage",e=>{if(e.key===K||e.key===null){MEM=null;refresh()}});

function home(el){if(!el)return;el.className="box mw-box";el.id=el.id||"mywc";mount(el,{limit:10,head:true})}

/* 單元頁：⭐ 我的單字 面板 */
let panel=null;
function openPanel(){if(panel)return;const d=document.createElement("div");d.className="mw-panel";d.innerHTML=`<div class="mw-pin"><div class="mw-pb"><b>⭐ 我的單字</b><button type="button" class="b" data-a="x">關閉</button></div><div class="box mw-box" id="mwpl"></div></div>`;
 document.body.appendChild(d);panel=d;document.body.style.overflow="hidden";mount(d.querySelector("#mwpl"),{head:false});
 d.querySelector("[data-a=x]").onclick=closePanel}
function closePanel(){if(!panel)return;panel.remove();panel=null;document.body.style.overflow=""}
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(pop)closePop();else closePanel()}});

/* ===== 課文文字／選取 ===== */
const isW=(s,i)=>{const c=s[i];if(!c)return false;if(LTR.test(c))return true;if("-'’".indexOf(c)>=0)return i>0&&i<s.length-1&&LTR.test(s[i-1])&&LTR.test(s[i+1]);return false};
const enNode=sn=>{for(let n=sn.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.data.trim())return n;return null};
const snOf=n=>{const e=n&&(n.nodeType===3?n.parentElement:n);const s=e&&e.closest?e.closest(".sn"):null;return s&&s.closest(".tx")?s:null};
function trimR(s,a,b){while(a<b&&!isW(s,a))a++;while(b>a&&!isW(s,b-1))b--;return[a,b]}
function caretAt(x,y){try{if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p)return{n:p.offsetNode,o:p.offset}}
 if(document.caretRangeFromPoint){const r=document.caretRangeFromPoint(x,y);if(r)return{n:r.startContainer,o:r.startOffset}}}catch(e){}return null}
function rectHit(en,a,b,x,y,slack){try{const r=document.createRange();r.setStart(en,a);r.setEnd(en,b);return[...r.getClientRects()].some(q=>x>=q.left-slack&&x<=q.right+slack&&y>=q.top-slack&&y<=q.bottom+slack)}catch(e){return true}}
/* 座標 → 詞（整個連字號詞） */
function wordAtPoint(x,y,sn){const en=enNode(sn),c=caretAt(x,y);if(!en||!c||c.n!==en)return null;const s=en.data;let i=c.o;
 if(!isW(s,i)&&isW(s,i-1))i--;if(!isW(s,i))return null;let a=i,b=i+1;while(a>0&&isW(s,a-1))a--;while(b<s.length&&isW(s,b))b++;
 if(!rectHit(en,a,b,x,y,10))return null;return{sn,en,a,b}}
/* 目前選取 → {sn,en,a,b}（限本句英文、吸附到整詞）；不合格回 null */
function selInfo(){const s=window.getSelection&&getSelection();if(!s||!s.rangeCount||s.isCollapsed)return null;const r=s.getRangeAt(0);
 const sn=snOf(r.startContainer);if(!sn)return null;const en=enNode(sn);if(!en)return null;
 let a,b;const sc=r.startContainer,ec=r.endContainer;
 if(sc===en)a=r.startOffset;else if(sc===sn&&r.startOffset===0)a=0;else return null;
 if(ec===en)b=r.endOffset;else if(snOf(ec)===sn)b=en.data.length;else return null;
 const t=en.data;if(a>=b)return null;
 while(a>0&&isW(t,a-1)&&isW(t,a))a--;while(b<t.length&&isW(t,b)&&isW(t,b-1))b++;
 [a,b]=trimR(t,a,b);if(b<=a)return null;
 const txt=t.slice(a,b);if(!HASL.test(txt)||txt.length>80||txt.split(/\s+/).length>8)return null;return{sn,en,a,b}}

/* ===== 彈窗 ===== */
let pop=null,cur=null,toastT=0;
function toast(m){let t=document.getElementById("mwtoast");if(!t){t=document.createElement("div");t.id="mwtoast";t.className="mw-toast";document.body.appendChild(t)}t.textContent=m;t.style.display="block";clearTimeout(toastT);toastT=setTimeout(()=>{t.style.display="none"},1600)}
function closePop(){if(pop){pop.remove();pop=null;cur=null}try{const s=getSelection();if(s&&s.removeAllRanges)s.removeAllRanges()}catch(e){}}
/* 本地查不到時，線上機器翻譯（Google gtx→at，備援 MyMemory）→ 台灣繁中字串或 "" */
const CJK=/[\u3400-\u9fff]/;
async function jget(url,ms){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(url,{signal:ac.signal});if(!r.ok)throw 0;return await r.text()}finally{clearTimeout(t)}}
function okZh(z,src){z=String(z||"").replace(/\s+/g," ").trim();if(!z||/MYMEMORY WARNING|WARNING/i.test(z)||!CJK.test(z))return"";if(z.toLowerCase()===String(src).trim().toLowerCase())return"";return z}
async function mtTranslate(text){const q=encodeURIComponent(text);
 for(const c of["gtx","at"]){try{const b=await jget("https://translate.googleapis.com/translate_a/single?client="+c+"&sl=en&tl=zh-TW&dt=t&q="+q,5000);const z=okZh(JSON.parse(b)[0].map(x=>x[0]).join(""),text);if(z)return z}catch(e){}}
 try{const j=JSON.parse(await jget("https://api.mymemory.translated.net/get?q="+q+"&langpair=en%7Czh-TW",5000));if(Number(j.responseStatus)===200){const z=okZh(j.responseData&&j.responseData.translatedText,text);if(z)return z}}catch(e){}
 return""}
async function openPop(h){
 const t=h.en?h.en.data:"",text=(h.text!=null?h.text:t.slice(h.a,h.b)).replace(/\s+/g," "),sent=h.sent!=null?h.sent:plain(t),key=nkey(text);
 try{window.dispatchEvent(new Event("mw-open"))}catch(e){}
 if(pop&&cur&&cur.key===key&&cur.sent===sent)return;
 const ex=find(text);cur={key,sent,dirty:false,text};
 const first=(h.first!=null?h.first:h.a===0)&&/^\p{Lu}\p{Ll}+$/u.test(text);
 if(!pop){pop=document.createElement("div");pop.className="mw-pop";pop.setAttribute("role","dialog");document.body.appendChild(pop)}
 const mine=cur;
 pop.innerHTML=`<div class="mw-ph"><div class="mw-w" id="mwW"></div><button type="button" class="mw-sp" data-a="sp" aria-label="發音">🔊</button><button type="button" class="mw-x" data-a="x" aria-label="關閉">✕</button></div>
 <div class="mw-sub" id="mwSub"></div><input class="mw-in" id="mwZh" type="text" placeholder="中文意思（可自己輸入）" enterkeyhint="done" autocomplete="off" autocapitalize="off">
 <div class="mw-ps">${hiSent(sent,text)}</div><button type="button" class="b p mw-ok" data-a="ok"></button>`;
 const $=s=>pop.querySelector(s),inp=$("#mwZh");
 const setText=x=>{mine.text=x;$("#mwW").textContent=x;$("[data-a=ok]").textContent=find(x)?"更新":"加入我的單字"};
 setText(text);inp.addEventListener("input",()=>{mine.dirty=true});
 if(ex){$("#mwSub").textContent="⭐ 已在我的單字，可改意思後按「更新」";inp.value=ex.zh||""}else $("#mwSub").textContent="查詢中…";
 const hit=await lookup(text);if(cur!==mine||!pop)return;
 let shown=text;
 if(first&&hit.src==="dict"){shown=text.toLowerCase();setText(shown)}   // 句首大寫的普通字 → 小寫
 else if(first){const lo=text.toLowerCase(),h2=await lookup(lo);if(cur!==mine||!pop)return;if(h2.zh&&h2.src==="dict"&&h2.zh===hit.zh){shown=lo;setText(lo)}}
 if(!mine.dirty&&(!ex||!ex.zh)&&hit.zh)inp.value=hit.zh;
 if(!ex)$("#mwSub").textContent=hit.zh?(hit.src==="card"?"自動填入：本週單字卡":"自動填入：離線字典（可修改）"):"查不到這個字，請自己輸入意思";
 else if(!ex.zh&&hit.zh)$("#mwSub").textContent="已自動填入意思";
 mine.final=shown;
 if(!hit.zh&&(!ex||!ex.zh)){
  if(!ex)$("#mwSub").textContent="翻譯中…";
  mtTranslate(shown).then(z=>{if(cur!==mine||!pop)return;
   if(z&&!mine.dirty&&!inp.value){inp.value=z;if(!ex)$("#mwSub").textContent="自動填入：機器翻譯（可修改）";else $("#mwSub").textContent="已自動填入意思（機器翻譯，可修改）"}
   else if(!z&&!ex)$("#mwSub").textContent="查不到這個字，請自己輸入意思"})}
 /* 避免彈窗蓋住被選的字 */
 try{const r=h.rng?h.rng():(()=>{const r=document.createRange();r.setStart(h.en,h.a);r.setEnd(h.en,h.b);return r})();const q=r.getBoundingClientRect(),ph=pop.offsetHeight;if(q.bottom>innerHeight-ph-12)window.scrollBy(0,q.bottom-(innerHeight-ph-12)+12)}catch(e){}
 pop.onclick=e=>{const b=e.target.closest&&e.target.closest("[data-a]");if(!b)return;const a=b.getAttribute("data-a");
  if(a==="x")closePop();else if(a==="sp")speak(mine.text);
  else if(a==="ok")commit(mine,h,inp.value)};
 inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();commit(mine,h,inp.value)}};
}
function commit(mine,h,zh){const W=window.WEEK||{};const w=mine.text.replace(/\s+/g," ").trim();if(!w)return;
 const upd=!!find(w);add({w,zh:String(zh||"").trim(),s:mine.sent,l:weekId(),n:W.n||0,t:Date.now()});closePop();toast(upd?"已更新「"+w+"」":"已加入「"+w+"」")}

/* ===== 富文字句子（句內有 span／b，如 memo-ai 的 .mm-en）：同一套長按／雙擊／選字 ===== */
function bindRich(box,opts){opts=opts||{};const SEL=opts.sel||".sn";
 let down=null,lpT=0,lpFired=false,moved=false,tapT=0,mouse=false,selT=0,last={t:0,x:0,y:0};
 const ctOf=n=>{const e=n&&(n.nodeType===3?n.parentElement:n);const c=e&&e.closest?e.closest(SEL):null;return c&&box.contains(c)?c:null};
 /* 只看英文：略過 .gl（講義註解）、.zhs（中譯）、sup（重點詞編號）內的文字 */
 const skip=n=>{const e=n.parentElement;return !!(e&&e.closest&&e.closest(".gl,.zhs,sup"))};
 const tnodes=c=>{const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT),a=[];let n;while((n=w.nextNode()))if(!skip(n))a.push(n);return a};
 const textOf=c=>tnodes(c).map(n=>n.data).join("");
 const flat=(c,n,o)=>{let p=0;const pr=document.createRange();try{pr.setStart(n,o);pr.collapse(true)}catch(e){return 0}
  for(const t of tnodes(c)){if(t===n)return p+o;if(pr.comparePoint(t,0)<0)p+=t.data.length;else break}return p};
 const rngOf=(c,a,b)=>{const r=document.createRange();let p=0,s=false;
  for(const n of tnodes(c)){const l=n.data.length;if(!s&&a<=p+l){r.setStart(n,a-p);s=true}if(s&&b<=p+l){r.setEnd(n,b-p);return r}p+=l}return r};
 const mk=(c,t,a,b)=>{const txt=t.slice(a,b);return{text:txt,sent:plain(t),first:/^\s*$/.test(t.slice(0,a)),rng:()=>rngOf(c,a,b)}};
 const wordAt=(x,y,c)=>{const cp=caretAt(x,y);if(!cp||!cp.n||cp.n.nodeType!==3||!c.contains(cp.n)||skip(cp.n))return null;const t=textOf(c);let i=flat(c,cp.n,cp.o);
  if(!isW(t,i)&&isW(t,i-1))i--;if(!isW(t,i))return null;let a=i,b=i+1;while(a>0&&isW(t,a-1))a--;while(b<t.length&&isW(t,b))b++;
  const rr=rngOf(c,a,b);if(![...rr.getClientRects()].some(q=>x>=q.left-10&&x<=q.right+10&&y>=q.top-10&&y<=q.bottom+10))return null;
  return mk(c,t,a,b)};
 const selRich=()=>{const s=window.getSelection&&getSelection();if(!s||!s.rangeCount||s.isCollapsed)return null;const r=s.getRangeAt(0);
  const c=ctOf(r.startContainer);if(!c||ctOf(r.endContainer)!==c)return null;
  let a=flat(c,r.startContainer,r.startOffset),b=flat(c,r.endContainer,r.endOffset);const t=textOf(c);if(a>=b)return null;
  while(a>0&&isW(t,a-1)&&isW(t,a))a--;while(b<t.length&&isW(t,b)&&isW(t,b-1))b++;
  [a,b]=trimR(t,a,b);if(b<=a)return null;const txt=t.slice(a,b);if(!HASL.test(txt)||txt.length>80||txt.split(/\s+/).length>8)return null;return mk(c,t,a,b)};
 const clearTap=()=>{clearTimeout(tapT);tapT=0};
 const check=()=>{const h=selRich();if(h){clearTap();openPop(h)}};
 box.addEventListener("pointerdown",e=>{const c=ctOf(e.target);if(!c)return;if(e.pointerType==="mouse"&&e.button!==0)return;
  down={x:e.clientX,y:e.clientY};lpFired=false;moved=false;mouse=e.pointerType==="mouse";clearTimeout(lpT);
  lpT=setTimeout(()=>{if(!down)return;const h=wordAt(down.x,down.y,c);if(h){lpFired=true;clearTap();openPop(h)}},500)},{passive:true});
 box.addEventListener("pointermove",e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>10){moved=true;clearTimeout(lpT)}},{passive:true});
 const up=()=>{clearTimeout(lpT);down=null;mouse=false;setTimeout(check,60)};
 box.addEventListener("pointerup",up,{passive:true});box.addEventListener("pointercancel",up,{passive:true});
 document.addEventListener("selectionchange",()=>{clearTimeout(selT);selT=setTimeout(()=>{if(!mouse)check()},400)});
 box.addEventListener("click",e=>{const c=ctOf(e.target);if(!c)return;
  if(lpFired){lpFired=false;return}
  if(moved){moved=false;return}
  const now=Date.now();
  if(now-last.t<400&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<30){last.t=0;clearTap();const h=wordAt(e.clientX,e.clientY,c);if(h)openPop(h);return}
  last={t:now,x:e.clientX,y:e.clientY};clearTap();
  if(selRich())return;
  if(!opts.onTap)return;
  if(window.TTS&&TTS.unlock)TTS.unlock();   // 使用者點擊當下解鎖音訊，延遲播放才不會被擋
  tapT=setTimeout(()=>{tapT=0;if(lpFired||selRich())return;opts.onTap(c,e)},300)});
 box.addEventListener("dblclick",e=>{const c=ctOf(e.target);if(!c)return;clearTap();const h=wordAt(e.clientX,e.clientY,c);if(h)openPop(h)});
}
function closeDrawer(){closePop()}

function init(){const o=document.getElementById("mwo");if(o)o.onclick=openPanel;if(window.WEEK)dict()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.MW={home,bindRich,closeDrawer,openPanel,closePanel,list:sorted,add,del,find,lookup,speak,dict,key:K};
})();
