/* 單字間隔重複（1、3、7、14、21 天）。存檔 key：enNewsSRS1。日期用 Asia/Taipei 曆日。
   SRS.unit()   單元頁：「加入複習」按鈕＋大卡⭐（需在 unit.js 之後載入）
   SRS.home(el) 首頁一行提示
   SRS.review(el) 複習頁 */
(function(){
const KEY="enNewsSRS1",INTERVALS=[1,3,7,14,21];
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function todayStr(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function addDays(ymd,n){const p=ymd.split("-").map(Number);return new Date(Date.UTC(p[0],p[1]-1,p[2]+n)).toISOString().slice(0,10)}
let mem=null,canSave=true;
function load(){try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&d.words&&typeof d.words==="object")return d}else if(canSave)return{words:{}}}catch(e){canSave=false}return mem||{words:{}}}
function save(d){mem=d;try{localStorage.setItem(KEY,JSON.stringify(d));canSave=true;return true}catch(e){canSave=false;return false}}
const idOf=(uid,c)=>uid+"|"+c.w;
function snap(uid,c,today){const o={id:idOf(uid,c),uid:uid,w:c.w,say:c.say||c.w,zh:c.zh||"",pos:c.pos||"",stage:0,due:addDays(today,1),mastered:false};if(c.ex){o.ex=c.ex;o.exzh=c.exzh||""}return o}
/* 純函式：直接改傳入的 word 物件，回傳 word */
function advance(w,today){if(w.stage===4){w.mastered=true}else{w.stage+=1;w.due=addDays(today,INTERVALS[w.stage])}return w}
function reset(w,today){w.stage=0;w.due=addDays(today,1);w.mastered=false;return w}
function remember(id,today){const d=load(),w=d.words[id];if(!w)return null;today=today||todayStr();advance(w,today);save(d);return w}
function forget(id,today){const d=load(),w=d.words[id];if(!w)return null;today=today||todayStr();reset(w,today);save(d);return w}
function add(uid,cards,today){const d=load();today=today||todayStr();let n=0;cards.forEach(c=>{const id=idOf(uid,c);if(!d.words[id]){d.words[id]=snap(uid,c,today);n++}});const ok=save(d);return ok?n:-1}
function remove(id){const d=load();delete d.words[id];return save(d)}
const all=()=>Object.values(load().words);
const due=today=>{today=today||todayStr();return all().filter(w=>w.mastered!==true&&w.due<=today)};
const active=()=>all().filter(w=>w.mastered!==true);
function css(t){const s=document.createElement("style");s.textContent=t;document.head.appendChild(s)}

/* ===== 單元頁 ===== */
function unit(){
  const W=window.WEEK;if(!W||!W.groups)return;
  const cards=W.groups.flatMap(x=>x.cards),uid=W.uid;
  const ga=document.getElementById("ga"),bc=document.querySelector(".bc");if(!ga||!bc)return;
  bc.classList.add("srs-bc");
  const star=document.createElement("button");star.type="button";star.className="srs-star";bc.appendChild(star);
  const btn=document.createElement("button");btn.type="button";btn.className="srs-add";ga.insertAdjacentElement("afterend",btn);
  const msg=document.createElement("div");msg.className="srs-msg mu";ga.parentNode.appendChild(msg);
  const cur=()=>{try{return list()[i]}catch(e){return null}};
  function refresh(){
    const d=load(),have=cards.filter(c=>d.words[idOf(uid,c)]).length,n=cards.length;
    btn.textContent=have===0?"加入複習":have<n?"加入複習（已加入 "+have+" / "+n+"）":"已全部加入";
    btn.disabled=have===n;btn.classList.toggle("done",have===n);
    const c=cur(),on=!!(c&&d.words[idOf(uid,c)]);
    star.textContent=on?"⭐":"☆";star.classList.toggle("on",on);
    star.setAttribute("aria-label",on?"移出複習":"加入複習");star.setAttribute("aria-pressed",on?"true":"false");
  }
  btn.onclick=()=>{const r=add(uid,cards);msg.textContent=r<0?"無法儲存（瀏覽器可能為私密模式）":r>0?"已加入 "+r+" 個單字，明天開始複習":"";refresh()};
  ["pointerdown","click"].forEach(ev=>star.addEventListener(ev,e=>e.stopPropagation()));
  star.onclick=e=>{e.stopPropagation();const c=cur();if(!c)return;const id=idOf(uid,c);
    if(load().words[id]){if(!remove(id))msg.textContent="無法儲存（瀏覽器可能為私密模式）"}
    else if(add(uid,[c])<0)msg.textContent="無法儲存（瀏覽器可能為私密模式）";
    refresh()};
  const prev=window.render;
  window.render=function(){const r=prev.apply(this,arguments);try{refresh()}catch(e){}return r};
  refresh();
}

/* ===== 首頁 ===== */
function home(el){
  if(!el)return;
  try{
    const dn=due().length,ac=active().length;
    if(dn>0){el.innerHTML='<a href="review.html" style="display:block;margin:-10px 0 14px;font-size:16px;font-weight:700;color:var(--ac);text-decoration:none;padding:6px 0">今日待複習 '+dn+' 個 ›</a>'}
    else if(ac>0){el.innerHTML='<a href="review.html" style="display:block;margin:-10px 0 14px;font-size:13px;color:var(--mu);text-decoration:none;padding:6px 0">複習中 '+ac+' 個，今天沒有到期</a>'}
    else el.innerHTML="";
  }catch(e){el.innerHTML=""}
}

/* ===== 複習頁 ===== */
function review(el){
  if(!el)return;
  const today=todayStr();
  let Q=due(today).map(w=>w.id).sort(()=>Math.random()-.5);
  const N=Q.length;let k=0,flip=false,okN=0,badN=0,mastN=0;
  const homeBtn='<a class="b p rv-btn" href="index.html">回首頁</a>';
  function say(w){try{TTS.play(w.say||w.w)}catch(e){}}
  function draw(){
    if(N===0){el.innerHTML='<div class="box c rv-card"><div class="rv-t">今天沒有到期的單字 🎉</div><div class="mu">有加入複習的單字，到期時會出現在這裡。</div>'+homeBtn+'</div>';return}
    if(k>=N){el.innerHTML='<div class="box c rv-card"><div class="rv-t">複習完成 ✔</div><div class="rv-sum">本次複習 '+N+' 題<br>記得 '+okN+' 題・忘了 '+badN+' 題<br>新標為已熟 '+mastN+' 題</div>'+(badN?'<div class="mu">忘了的字明天會再出現。</div>':"")+homeBtn+'</div>';return}
    const w=load().words[Q[k]];
    if(!w){k++;return draw()}
    let h='<div class="mu rv-n">第 '+(k+1)+' / '+N+' 題</div><div class="box c rv-card" id="rvc" role="button" tabindex="0"><div class="big">'+esc(w.w)+'</div><button type="button" class="rv-sp" id="rvs" aria-label="重播單字">🔊</button>';
    if(flip){h+='<div class="rv-zh">'+esc(w.zh)+'</div><div class="mu">'+esc(w.pos)+'</div>'+(w.ex?'<div class="rv-ex">'+esc(w.ex)+'<div class="mu">'+esc(w.exzh||"")+'</div></div>':"")}
    else h+='<div class="mu rv-hint">點卡片翻面</div>';
    h+='</div>';
    if(flip)h+='<div class="row rv-row"><button type="button" class="b rv-btn rv-bad" id="rvb">忘了</button><button type="button" class="b rv-btn rv-ok" id="rvo">記得</button></div>';
    el.innerHTML=h;
    const c=document.getElementById("rvc");
    c.addEventListener("pointerdown",()=>{try{TTS.unlock()}catch(e){}},{passive:true});
    c.onclick=e=>{if(e.target.closest("#rvs"))return;if(!flip){flip=true;draw()}};
    const s=document.getElementById("rvs");s.onclick=e=>{e.stopPropagation();try{TTS.unlock()}catch(x){}say(w)};
    if(flip){
      document.getElementById("rvo").onclick=()=>{const was4=w.stage===4;remember(w.id,today);okN++;if(was4)mastN++;next()};
      document.getElementById("rvb").onclick=()=>{forget(w.id,today);badN++;next()};
    }else say(w);
  }
  function next(){k++;flip=false;draw()}
  draw();
}

window.SRS={INTERVALS,todayStr,addDays,advance,reset,remember,forget,add,remove,load,due,active,unit,home,review};
})();
