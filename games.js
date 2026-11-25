/* 單元頁小遊戲（「其他」分頁最上方）：翻卡記憶／聽音選字／課文填空。
   資料全來自 window.WEEK；念英文只用既有 Jenny 音檔（TTS.play，字串必須是 UNIT_C 的 key）。
   最佳分數存在專屬鍵 neGames1（{ w1:{flip,listen,cloze}, w2:{...} }），不碰其他任何 localStorage 鍵。
   XP 只走 RPG.gain({t:"quiz",ok,isNew,uid})；不呼叫、不改 window.quiz。 */
(function(){
const LS="neGames1",PTS=10,COMBO_AT=3,COMBO_MUL=1.5,ROUND=10;
const GAMES=[{id:"flip",icon:"🃏",name:"翻卡記憶",sub:"看英文，翻面確認"},{id:"listen",icon:"🎧",name:"聽音選字",sub:"聽一聽，選對單字"},{id:"cloze",icon:"✏️",name:"課文填空",sub:"句子挖空，四選一"}];
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

/* ===== 介面 ===== */
let W=null,root=null,sec=null,cur=null;
/* 語速跟單元頁目前的 rate（unit.js 的全域 let），沒有就 0.85 */
function speed(){try{return typeof rate==="number"&&rate>0?rate:0.85}catch(e){return .85}}
function say(text){if(!text||!hasAudio(text)||!window.TTS)return;try{TTS.unlock&&TTS.unlock();TTS.play(text,speed())}catch(e){}}
function xpNow(){try{return RPG.st().xp||0}catch(e){return 0}}
function gainXP(ok,isNew){try{RPG.gain({t:"quiz",ok:!!ok,isNew:!!isNew,uid:W.uid})}catch(e){}}
function confetti(){const f=document.createElement("div");f.className="gm-conf";for(let k=0;k<22;k++){const s=document.createElement("span");s.textContent=["🎉","✨","💎","👑","🎊"][k%5];s.style.left=(Math.random()*96)+"vw";s.style.animationDelay=(Math.random()*.6)+"s";f.appendChild(s)}document.body.appendChild(f);setTimeout(()=>f.remove(),3400)}
function stopAudio(){try{window.TTS&&TTS.cancel()}catch(e){}}

function menu(){
 stopAudio();cur=null;
 root.innerHTML=`<div class="box gm-box"><b>🎮 小遊戲</b><div class="mu gm-sub">用本週單字玩一輪，答對會累積貴婦 XP。</div><div class="gm-grid">${GAMES.map(g=>{const b=bestOf(W.uid,g.id);return `<button class="gm-card" data-g="${g.id}"><span class="gm-ic">${g.icon}</span><b>${g.name}</b><span class="gm-ds">${g.sub}</span><span class="gm-best">${b?"最佳 "+b+" 分":"尚無紀錄"}</span></button>`}).join("")}</div></div>`;
 root.querySelectorAll(".gm-card").forEach(el=>el.onclick=()=>{try{TTS.unlock&&TTS.unlock()}catch(e){}start(el.dataset.g)})}

/* 一輪的共同狀態與計分。分數取整；連對 ≥3 時「該次」答對 ×1.5（第 3 連對起就套用）。 */
function start(id){
 stopAudio();
 const meta=GAMES.find(g=>g.id===id);
 const S={id,meta,score:0,combo:0,right:0,tries:0,seen:new Set(),xp0:xpNow(),n:0,total:0,done:false,xpN:0};
 cur=S;
 /* 翻卡一輪有全週幾十張，若每張都給 quiz XP 會到 700+；改為最多 10 次答對給 XP（與另兩款題數相同），「忘了」不給 XP 以免重排刷分。聽音／填空仍是對給、錯給少量。 */
 S.hit=(k)=>{S.tries++;S.right++;S.combo++;const p=Math.round(PTS*(S.combo>=COMBO_AT?COMBO_MUL:1));S.score+=p;const isNew=!S.seen.has(k);S.seen.add(k);if(S.id!=="flip"||S.xpN<ROUND){gainXP(true,isNew);S.xpN++}return p};
 S.miss=()=>{S.tries++;S.combo=0;if(S.id!=="flip")gainXP(false,false)};
 const shell=()=>{root.innerHTML=`<div class="box gm-box"><div class="gm-top"><button class="gm-back" id="gmb">← 返回</button><b>${meta.icon} ${meta.name}</b></div><div class="gm-stats"><span id="gmn"></span><span id="gms"></span><span id="gmc"></span></div><div id="gmbody"></div></div>`;root.querySelector("#gmb").onclick=menu};
 S.stat=()=>{const q=id=>root.querySelector(id);if(!q("#gmn"))return;q("#gmn").textContent=S.label();q("#gms").textContent="分數 "+S.score;const c=q("#gmc");c.textContent="🔥 連對 "+S.combo;c.className=S.combo>=COMBO_AT?"gm-hot":""};
 S.body=()=>root.querySelector("#gmbody");
 S.finish=()=>{S.done=true;stopAudio();
  const prev=bestOf(W.uid,id),rec=S.score>prev&&S.score>0;if(rec)setBest(W.uid,id,S.score);
  const acc=S.tries?Math.round(S.right/S.tries*100):0,xp=Math.max(0,xpNow()-S.xp0);
  S.body().innerHTML=`<div class="gm-end"><div class="gm-trophy">${rec?"🏆":"🎀"}</div>${rec?'<div class="gm-rec">新紀錄！</div>':""}<div class="gm-big">${S.score}<small> 分</small></div><div class="gm-res"><div><b>${acc}%</b><span>正確率</span></div><div><b>+${xp}</b><span>本輪 XP</span></div><div><b>${Math.max(prev,S.score)}</b><span>本週最佳</span></div></div><div class="row"><button class="b p" id="gmr">再玩一次</button><button class="b" id="gml">返回遊戲列表</button></div></div>`;
  S.body().querySelector("#gmr").onclick=()=>{try{TTS.unlock&&TTS.unlock()}catch(e){}start(id)};S.body().querySelector("#gml").onclick=menu;
  root.querySelector("#gmn").textContent="結算";S.stat();if(rec)confetti()};
 shell();
 ({flip:runFlip,listen:runListen,cloze:runCloze})[id](S);
}

/* ---- 翻卡記憶 ---- */
function smallIpa(c){const p=c.ipa||"",m=/US\s*(\/[^/]+\/)/.exec(p);return m?m[1]:(p.split(/[；;]/).length>1?"":p)}
function runFlip(S){
 const q=shuf(cardsOf(W));S.total=q.length;
 S.label=()=>"剩 "+q.length+" 張";
 const next=()=>{if(!q.length){S.finish();return}
  const c=q[0],ip=smallIpa(c);S.stat();
  S.body().innerHTML=`<div class="gm-flip" id="gmf"><div class="gm-fc"><div class="gm-face gm-front"><div class="gm-w">${esc(c.w)}</div>${ip?`<div class="gm-ip">${esc(ip)}</div>`:""}<div class="mu gm-hint">點一下翻面</div></div><div class="gm-face gm-bk"><div class="gm-zh">${esc(zhOf(c))}</div><div class="gm-pos">${esc(posOf(c))}</div></div></div></div><div class="row gm-ans" id="gma" style="visibility:hidden"><button class="b gm-no">忘了</button><button class="b gm-yes">記得</button></div>`;
  const f=S.body().querySelector("#gmf"),fc=f.firstChild,a=S.body().querySelector("#gma");let flipped=false,locked=false;
  f.onclick=()=>{if(flipped)return;flipped=true;fc.classList.add("on");a.style.visibility="visible";say(key(c))};
  const fin=()=>{if(locked||!flipped)return false;locked=true;q.shift();return true};
  a.querySelector(".gm-yes").onclick=()=>{if(!fin())return;S.hit(key(c));next()};
  a.querySelector(".gm-no").onclick=()=>{if(!fin())return;S.miss();q.splice(Math.min(q.length,2+Math.floor(Math.random()*3)),0,c);next()}};
 next()}

/* ---- 選擇題共用（聽音／填空） ---- */
function runQuiz(S,items,draw){
 let n=0;S.total=items.length;S.label=()=>"第 "+Math.min(n+1,items.length)+" / "+items.length+" 題";
 const go=()=>{if(n>=items.length){S.finish();return}
  const it=items[n];S.stat();let answered=false;
  const view=draw(S.body(),it);
  const btns=[...S.body().querySelectorAll(".gm-opt")];
  btns.forEach(b=>b.onclick=()=>{if(answered)return;answered=true;const ok=b.dataset.o===it.ans;
   if(ok)S.hit(it.c.w);else S.miss();
   btns.forEach(x=>{x.disabled=true;if(x.dataset.o===it.ans)x.classList.add("ok");else if(x===b)x.classList.add("bad")});
   S.stat();view.reveal(ok);
   const fb=S.body().querySelector("#gmfb");fb.innerHTML=(ok?'<b class="gm-g">答對了！Well done 👏</b>':'<b class="gm-r">正確答案：'+esc(it.ans)+"</b>");
   const nb=S.body().querySelector("#gmnx");nb.style.display="";nb.textContent=n+1>=items.length?"看結果 ›":"下一題 ›";nb.onclick=()=>{n++;go()}});
  view.start&&view.start()};
 go()}
const optsHTML=it=>`<div class="gm-opts">${it.opts.map(o=>`<button class="b gm-opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div><div id="gmfb" class="gm-fb"></div>`;

function runListen(S){
 const items=pickListen(W,ROUND);
 runQuiz(S,items,(body,it)=>{const k=key(it.c);
  body.innerHTML=`<div class="gm-q"><button class="gm-play" id="gmp" aria-label="播放">🔊</button><button class="b" id="gmp2">再聽一次</button></div>${optsHTML(it)}<div id="gmx" class="gm-extra"></div><button class="b p" id="gmnx" style="display:none"></button>`;
  const again=()=>say(k);body.querySelector("#gmp").onclick=again;body.querySelector("#gmp2").onclick=again;
  return{start:again,reveal:()=>{const ip=smallIpa(it.c);body.querySelector("#gmx").innerHTML=`<div class="gm-zh2">${esc(it.c.w)} <span class="mu">${esc(ip)}</span></div><div class="mu">${esc(posOf(it.c))}　${esc(zhOf(it.c))}</div>`}}})}

function runCloze(S){
 const items=pickCloze(W,ROUND);
 runQuiz(S,items,(body,it)=>{
  body.innerHTML=`<div class="gm-sent" id="gmse">${esc(it.pre)}<span class="gm-blank">＿＿＿＿＿</span>${esc(it.post)}</div>${optsHTML(it)}<div id="gmx" class="gm-extra"></div><button class="b p" id="gmnx" style="display:none"></button>`;
  return{reveal:ok=>{body.querySelector("#gmse").innerHTML=`${esc(it.pre)}<span class="gm-fill ${ok?"ok":"bad"}">${esc(it.mid)}</span>${esc(it.post)}`;
   body.querySelector("#gmx").innerHTML=`<div class="mu">${esc(it.zh)}</div><button class="b" id="gmls">🔊 聽整句</button>`;
   const b=body.querySelector("#gmls");b.onclick=()=>say(it.sent);say(it.sent)}}})}

function init(){
 W=window.WEEK;sec=document.getElementById("sec-o");if(!W||!sec||!W.groups)return;
 root=document.getElementById("gmroot");if(!root){root=document.createElement("div");root.id="gmroot";sec.insertBefore(root,sec.firstChild)}
 root.className="gm";menu();
 /* 切走「其他」分頁就收掉進行中的一輪（音訊 showSec 也會停） */
 if(window.MutationObserver)new MutationObserver(()=>{if(sec.hidden&&cur)menu()}).observe(sec,{attributes:true,attributeFilter:["hidden"]})}
window.Games={init,_pickCloze:pickCloze,_pickListen:pickListen,_findIn:findIn,_cardsOf:cardsOf};
})();
