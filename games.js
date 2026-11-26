/* 單元頁小遊戲（「其他」分頁最上方）：翻卡記憶／聽音選字／課文填空。
   資料全來自 window.WEEK；念英文只用既有 Jenny 音檔（TTS.play，字串必須是 UNIT_C 的 key）。
   最佳分數存在專屬鍵 neGames1（{ w1:{flip,listen,cloze}, w2:{...} }；舊的 synonym／sprint 欄位忽略），不碰其他任何 localStorage 鍵。
   XP 只走 RPG.gain({t:"quiz",ok,isNew,uid})；不呼叫、不改 window.quiz。 */
(function(){
const LS="neGames1",PTS=10,COMBO_AT=3,COMBO_MUL=1.5,ROUND=10;
const GAMES=[{id:"flip",icon:"🃏",name:"翻卡記憶",u:"分"},{id:"listen",icon:"🎧",name:"聽音選字",u:"分"},{id:"cloze",icon:"✏️",name:"課文填空",u:"分"}];
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const plain=s=>s.replace(/\{\d*\|([^}]+)\}/g,"$1").replace(/\s*\[\[[^\]]*\]\]/g,"").replace(/\s+/g," ").trim();
const key=c=>c.say||c.w;
const shuf=a=>{a=a.slice();for(let k=a.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]]}return a};
const hasAudio=t=>!!(window.UNIT_C&&window.UNIT_C[t]);
const posOf=c=>(c.pos||"").split(/[,，（(\[]/)[0].trim();
const zhOf=c=>c.zq||c.zh||"";
/* neGames1 讀寫（私密瀏覽存不了就退回記憶體） */
let MEM=null;
function ld(){try{const d=JSON.parse(localStorage.getItem(LS));if(d&&typeof d==="object")return d}catch(e){}return MEM||{}}
function sv(d){MEM=d;try{localStorage.setItem(LS,JSON.stringify(d))}catch(e){}}
const bestOf=(uid,g)=>{const x=(ld()[uid]||{})[g];return typeof x==="number"&&isFinite(x)?x:0};
function setBest(uid,g,v){const d=ld();d[uid]=d[uid]||{};d[uid][g]=v;sv(d)}

/* ===== 出題（純資料；可在 node 測） ===== */
function cardsOf(W){return W.groups.flatMap(x=>x.cards)}
function termsOf(c){return String(c.w).split("/").map(s=>s.replace(/\(.*?\)/g,"").replace(/\s+/g," ").trim()).filter(s=>s.length>=3)}
/* 在句子裡找完整詞／片語（大小寫不敏感、不切到別的字中間）；找不到回 null */
function findIn(sent,term){
 const re=new RegExp("(^|[^A-Za-z0-9'’-])("+term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+")+")(?![A-Za-z0-9-])","i");
 const m=re.exec(sent);if(!m)return null;const s=m.index+m[1].length;return{pre:sent.slice(0,s),mid:m[2],post:sent.slice(s+m[2].length)}}
function clozePool(W){
 const cards=cardsOf(W),txt=[],ex=[];
 const hit=(sent,zh,src,out)=>{if(!sent||!hasAudio(sent))return;cards.forEach(c=>{for(const t of termsOf(c)){const f=findIn(sent,t);if(f){out.push({c,sent,zh:zh||"",pre:f.pre,mid:f.mid,post:f.post,src});break}}})};
 (W.texts||[]).forEach(t=>(t.paras||[]).forEach((p,pi)=>p.forEach((s,si)=>hit(plain(s),t.zh&&t.zh[pi]&&t.zh[pi][si],"text",txt))));
 cards.forEach(c=>{const f=c.ex&&findIn(c.ex,termsOf(c)[0]||c.w);if(f&&hasAudio(c.ex))ex.push({c,sent:c.ex,zh:c.exzh||"",pre:f.pre,mid:f.mid,post:f.post,src:"ex"})});
 return{txt,ex}}
function pickCloze(W,n){
 const {txt,ex}=clozePool(W),used=new Set(),sents=new Set(),out=[];
 const take=(arr,distinct)=>{for(const q of shuf(arr)){if(out.length>=n)return;if(sents.has(q.sent)||(distinct&&used.has(q.c)))continue;used.add(q.c);sents.add(q.sent);out.push(q)}};
 take(txt,true);take(ex,true);take(txt,false);take(ex,false);
 const cards=cardsOf(W);
 return out.map(q=>{const ds=shuf(cards.filter(x=>x!==q.c&&!termsOf(x).some(t=>findIn(q.sent,t)))).slice(0,3);
  return Object.assign({},q,{ans:q.c.w,opts:shuf([q.c,...ds]).map(x=>x.w)})})}
function pickListen(W,n){
 const cards=cardsOf(W).filter(c=>hasAudio(key(c))),qs=shuf(cards).slice(0,n);
 while(qs.length<n&&cards.length)qs.push(cards[Math.floor(Math.random()*cards.length)]);
 return qs.map(c=>({c,ans:c.w,opts:shuf([c,...shuf(cards.filter(x=>x!==c&&x.w!==c.w)).slice(0,3)]).map(x=>x.w)}))}

/* ===== 介面：三款遊戲直向並排，各自一張 .box 卡、各自一份狀態（ST[id]）；彼此不重繪 ===== */
let W=null,root=null,sec=null;const ST={},EL={};
/* 語速跟單元頁目前的 rate（unit.js 的全域 let），沒有就 0.85 */
function speed(){try{return typeof rate==="number"&&rate>0?rate:0.85}catch(e){return .85}}
/* TTS.play 本身會取消前一段，所以三款音訊不會重疊；不拆任何 DOM */
function say(text){if(!text||!hasAudio(text)||!window.TTS)return;try{TTS.unlock&&TTS.unlock();TTS.play(text,speed())}catch(e){}}
function xpNow(){try{return RPG.st().xp||0}catch(e){return 0}}
function gainXP(ok,isNew){try{RPG.gain({t:"quiz",ok:!!ok,isNew:!!isNew,uid:W.uid})}catch(e){}}
function confetti(){const f=document.createElement("div");f.className="gm-conf";for(let k=0;k<22;k++){const s=document.createElement("span");s.textContent=["🎉","✨","💎","👑","🎊"][k%5];s.style.left=(Math.random()*96)+"vw";s.style.animationDelay=(Math.random()*.6)+"s";f.appendChild(s)}document.body.appendChild(f);setTimeout(()=>f.remove(),3400)}
/* ---- 破紀錄：Q 版佛朗明哥小人（inline SVG；動畫全在 style.css 的 .gm-dancer）---- */
/* SVG 與 rpg.js 共用（RPG.dancerSVG），避免兩份不一致 */
const DN_SVG=(window.RPG&&RPG.dancerSVG)||"";
function mountDancer(host){
 if(!host)return null;const old=host.querySelector(".gm-dancer");if(old)old.remove();
 const d=document.createElement("button");d.type="button";d.className="gm-dancer";d.setAttribute("aria-label","再看她跳一次");d.innerHTML=DN_SVG;
 const play=()=>{d.classList.remove("go","rest");void d.offsetWidth;d.classList.add("go")};
 d.addEventListener("click",e=>{e.stopPropagation();play()});
 d.addEventListener("animationend",e=>{if(e.animationName==="gmdnArmR")d.classList.add("rest")});
 host.appendChild(d);play();return d}
window.GmDancer={mount:mountDancer,confetti:confetti};
function stopAudio(){try{window.TTS&&TTS.cancel()}catch(e){}}
const unlock=()=>{try{window.TTS&&TTS.unlock&&TTS.unlock()}catch(e){}};

function headHTML(g){const b=bestOf(W.uid,g.id);return `${g.icon} ${g.name}<span class="best">${b?"本週最高 "+b+" "+g.u:"尚無紀錄"}</span>`}
/* ---- 作答小人：每張卡右上角一隻小的她（不放進會被 innerHTML 清掉的 .gm-h/.gm-body）---- */
const BUB_OK=["Olé!","讚！","太棒了！","Bravo!"];
const BUB_NO=["哼！","不對啦！"];let bubI=0,noI=0;
function dressAngry(root){
 const head=root.querySelector(".dn-head");if(!head||head.querySelector(".dn-angry"))return;
 const smile=head.querySelector('path[d="M54 47q6 6 12 0"]');if(smile)smile.classList.add("dn-smile");
 [...head.querySelectorAll("circle")].forEach(c=>{if((c.getAttribute("fill")||"").toLowerCase()==="#ff9db8")c.classList.add("dn-cheek")});
 const NS="http://www.w3.org/2000/svg",g=document.createElementNS(NS,"g");g.setAttribute("class","dn-angry");
 const add=(tag,attrs)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));g.appendChild(el)};
 add("path",{d:"M46 32l10 5","stroke":"#2d1b2e","stroke-width":"2.2","fill":"none","stroke-linecap":"round"});
 add("path",{d:"M74 32l-10 5","stroke":"#2d1b2e","stroke-width":"2.2","fill":"none","stroke-linecap":"round"});
 add("path",{d:"M54 51q6-6 12 0","stroke":"#c4284f","stroke-width":"2","fill":"none","stroke-linecap":"round","class":"dn-frown"});
 head.appendChild(g)}
function mountBuddy(card){
 if(card._bd)return card._bd;
 const b=document.createElement("div");b.className="gm-buddy";
 b.innerHTML=`<button type="button" class="gm-bd" aria-label="小人，點我轉一圈">${DN_SVG}</button><span class="gm-bub" aria-hidden="true"></span>`;
 const btn=b.firstChild,bub=b.lastChild,KS=["cheer","sway","dance","big","angry","spin"];
 dressAngry(btn);
 const anim=(k,ms)=>{btn.classList.remove(...KS);void btn.offsetWidth;btn.classList.add(k);clearTimeout(b._t);b._t=setTimeout(()=>btn.classList.remove(k),ms)};
 const say=(t,bad)=>{bub.textContent=t;bub.classList.toggle("bad",!!bad);bub.classList.add("on");clearTimeout(b._u);b._u=setTimeout(()=>bub.classList.remove("on","bad"),1100)};
 btn.addEventListener("click",e=>{e.stopPropagation();anim("spin",650)});
 b.react=(kind,t)=>{
  if(kind==="ok"){anim("cheer",600);say(t||BUB_OK[bubI++%BUB_OK.length])}
  else if(kind==="sway"){anim("sway",800);say(t||BUB_OK[bubI++%BUB_OK.length])}
  else if(kind==="dance"){anim("dance",1250);say(t||"🔥 連對！Olé!")}
  else if(kind==="big"){anim("big",1500);say(t||"喀!")}
  else if(kind==="angry"||kind==="no"){anim("angry",1000);say(t||BUB_NO[noI++%BUB_NO.length],true)}
  else if(kind==="say")say(t)};
 card.appendChild(b);card._bd=b;return b}
const buddy=(id,kind,t)=>{const c=EL[id];if(c&&c._bd)c._bd.react(kind,t)};
function buildCard(g){const el=document.createElement("div");el.className="box gm-box gm-zone";el.dataset.g=g.id;
 el.innerHTML=`<b class="gm-h">${headHTML(g)}</b><div class="gm-prog"><div class="gm-bar"><i style="width:0"></i></div><span class="n"></span><span class="s"></span></div><div class="gm-body"></div>`;return el}

/* 一輪（單一款）的狀態與計分。分數取整；連對 ≥3 時「該次」答對 ×1.5（第 3 連對起就套用）。 */
function start(id,auto){
 const meta=GAMES.find(g=>g.id===id),el=EL[id];
 mountBuddy(el);
 const S={id,meta,el,score:0,combo:0,right:0,tries:0,seen:new Set(),xp0:xpNow(),n:0,total:ROUND,done:false,xpN:0,auto:!!auto};
 ST[id]=S;
 /* 翻卡一輪 10 張，「記得」最多前 10 次給 XP；「忘了」不給 XP（避免重排刷分）。聽音／填空答對給、答錯 ok:false。 */
 /* 連對 2 輕擺、3–4 小舞、5+ 大舞（轉身＋踏地＋喀!）；答錯會生氣約 1 秒。 */
 S.hit=(k)=>{S.tries++;S.right++;S.combo++;const p=Math.round(PTS*(S.combo>=COMBO_AT?COMBO_MUL:1));S.score+=p;const isNew=!S.seen.has(k);S.seen.add(k);if(S.id!=="flip"||S.xpN<ROUND){gainXP(true,isNew);S.xpN++}buddy(id,S.combo>=5?"big":S.combo>=3?"dance":S.combo>=2?"sway":"ok");return p};
 S.miss=()=>{S.tries++;S.combo=0;if(S.id!=="flip")gainXP(false,false);buddy(id,"angry")};
 S.body=()=>el.querySelector(".gm-body");
 S.stat=()=>{const n=Math.min(S.n,S.total);el.querySelector(".gm-bar i").style.width=(n/S.total*100)+"%";el.querySelector(".n").textContent=n+"/"+S.total;
  el.querySelector(".s").textContent="分數 "+S.score+(S.combo>=COMBO_AT?" 🔥"+S.combo:"")};
 S.finish=()=>{S.done=true;stopAudio();S.n=S.total;
  const prev=bestOf(W.uid,id),rec=S.score>prev&&S.score>0;if(rec)setBest(W.uid,id,S.score);
  const acc=S.tries?Math.round(S.right/S.tries*100):0,xp=Math.max(0,xpNow()-S.xp0);
  el.querySelector(".gm-h").innerHTML=headHTML(meta);S.stat();
  S.body().innerHTML=`<div class="gm-end"><div class="gm-trophy">${rec?"🏆":"🎀"}</div>${rec?'<div class="gm-rec">新紀錄！</div>':""}<div class="gm-big">${S.score}<small> ${meta.u}</small></div><div class="gm-res"><div><b>${acc}%</b><span>正確率</span></div><div><b>+${xp}</b><span>本輪 XP</span></div><div><b>${Math.max(prev,S.score)}</b><span>本週最佳</span></div></div><div class="row"><button class="b p gm-again">再玩一次</button></div></div>`;
  S.body().querySelector(".gm-again").onclick=()=>{unlock();stopAudio();start(id,true)};
  if(rec){confetti();mountDancer(S.body().querySelector(".gm-end"))}};
 S.stat();
 ({flip:runFlip,listen:runListen,cloze:runCloze})[id](S);
}

/* ---- 翻卡記憶 ---- */
function smallIpa(c){const p=c.ipa||"",m=/US\s*(\/[^/]+\/)/.exec(p);return m?m[1]:(p.split(/[；;]/).length>1?"":p)}
function runFlip(S){
 const q=shuf(cardsOf(W)).slice(0,ROUND);S.total=q.length;
 const next=()=>{if(!q.length){S.finish();return}
  const c=q[0],ip=smallIpa(c),B=S.body();S.stat();
  B.innerHTML=`<div class="gm-flip"><div class="gm-fc"><div class="gm-face gm-front"><div class="gm-w">${esc(c.w)}</div>${ip?`<div class="gm-ip">${esc(ip)}</div>`:""}<div class="mu gm-hint">點卡片翻面</div></div><div class="gm-face gm-bk"><div class="gm-zh">${esc(zhOf(c))}</div><div class="gm-pos">${esc(posOf(c))}</div></div></div></div><div class="row gm-ans off"><button class="b gm-no">😵 忘了</button><button class="b gm-yes">😎 記得</button></div>`;
  const f=B.querySelector(".gm-flip"),fc=f.firstChild,a=B.querySelector(".gm-ans");let flipped=false,locked=false;
  f.onclick=()=>{if(flipped)return;flipped=true;unlock();fc.classList.add("on");a.classList.remove("off");say(key(c))};
  const fin=()=>{if(locked||!flipped)return false;locked=true;q.shift();return true};
  a.querySelector(".gm-yes").onclick=()=>{if(!fin())return;S.hit(key(c));S.n++;next()};
  a.querySelector(".gm-no").onclick=()=>{if(!fin())return;S.miss();q.splice(Math.min(q.length,2+Math.floor(Math.random()*3)),0,c);next()}};
 next()}

/* ---- 選擇題共用（聽音／填空） ---- */
function runQuiz(S,items,draw){
 S.total=items.length;
 const go=()=>{if(S.n>=items.length){S.finish();return}
  const it=items[S.n],B=S.body();S.stat();let answered=false;
  const view=draw(B,it,S.auto);S.auto=true;
  const btns=[...B.querySelectorAll(".gm-opt")];
  btns.forEach(b=>b.onclick=()=>{if(answered)return;answered=true;unlock();const ok=b.dataset.o===it.ans;
   if(ok)S.hit(it.c.w);else S.miss();S.n++;
   btns.forEach(x=>{x.disabled=true;if(x.dataset.o===it.ans)x.classList.add("ok");else if(x===b)x.classList.add("bad")});
   S.stat();view.reveal(ok);
   B.querySelector(".gm-fb").innerHTML=(ok?'<b class="gm-g">答對了！Well done 👏</b>':'<b class="gm-r">正確答案：'+esc(it.ans)+"</b>");
   const nb=B.querySelector(".gm-nx");nb.style.display="";nb.textContent=S.n>=items.length?"看結果 ›":"下一題 ›";nb.onclick=()=>{unlock();go()}});
  view.start&&view.start()};
 go()}
const optsHTML=it=>`<div class="gm-opts">${it.opts.map(o=>`<button class="b gm-opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div><div class="gm-fb"></div>`;

/* 聽音：進題自動播一次（第一次載入頁面不播，等使用者操作過這一款才播） */
function runListen(S){
 const items=pickListen(W,ROUND);
 runQuiz(S,items,(body,it,auto)=>{const k=key(it.c);
  body.innerHTML=`<div class="gm-q"><button class="gm-play" type="button" aria-label="播放">🔊</button><button class="b gm-re" type="button">再聽一次</button></div>${optsHTML(it)}<div class="gm-extra"></div><button class="b p gm-nx" style="display:none"></button>`;
  const again=()=>{unlock();say(k)};body.querySelector(".gm-play").onclick=again;body.querySelector(".gm-re").onclick=again;
  return{start:auto?again:null,reveal:()=>{const ip=smallIpa(it.c);body.querySelector(".gm-extra").innerHTML=`<div class="gm-zh2">${esc(it.c.w)} <span class="mu">${esc(ip)}</span></div><div class="mu">${esc(posOf(it.c))}　${esc(zhOf(it.c))}</div>`}}})}

function runCloze(S){
 const items=pickCloze(W,ROUND);
 runQuiz(S,items,(body,it)=>{
  body.innerHTML=`<div class="gm-sent">${esc(it.pre)}<span class="gm-blank">＿＿＿＿＿</span>${esc(it.post)}</div>${optsHTML(it)}<div class="gm-extra"></div><button class="b p gm-nx" style="display:none"></button>`;
  return{reveal:ok=>{body.querySelector(".gm-sent").innerHTML=`${esc(it.pre)}<span class="gm-fill ${ok?"ok":"bad"}">${esc(it.mid)}</span>${esc(it.post)}`;
   body.querySelector(".gm-extra").innerHTML=`<div class="mu">${esc(it.zh)}</div><button class="b gm-ls" type="button">🔊 聽整句</button>`;
   body.querySelector(".gm-ls").onclick=()=>say(it.sent);say(it.sent)}}})}

function init(){
 W=window.WEEK;sec=document.getElementById("sec-o");if(!W||!sec||!W.groups)return;
 root=document.getElementById("gmroot");if(!root){root=document.createElement("div");root.id="gmroot";sec.insertBefore(root,sec.firstChild)}
 root.className="gm";root.innerHTML="";
 GAMES.forEach(g=>{EL[g.id]=buildCard(g);root.appendChild(EL[g.id])});
 GAMES.forEach(g=>start(g.id));
 /* 切走「其他」只取消音訊，三款進行中的狀態保留 */
 if(window.MutationObserver)new MutationObserver(()=>{if(sec.hidden)stopAudio()}).observe(sec,{attributes:true,attributeFilter:["hidden"]})}
window.Games={init,_st:ST,_start:start,_pickCloze:pickCloze,_pickListen:pickListen,_findIn:findIn,_cardsOf:cardsOf};
})();
