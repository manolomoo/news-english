/* 單元頁引擎：單字圖卡（回音法）→ 課文跟讀 → 其他（近義辨析、小測驗、口說練習）。資料來自 window.WEEK。
   注意：render / quiz / drill / play1 必須是全域函式（rw.js 會包裝它們來記錄💩與XP）。 */
const W=window.WEEK,$=id=>document.getElementById(id);
const G=W.groups,R=[0.7,0.85,1.0];
let g=0,i=0,rate=0.85,run=0,playing=false,score=0,done=0,qi=0,pk=null,dk=0,di=0;
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const plain=s=>s.replace(/\{\d+\|([^}]+)\}/g,"$1").replace(/\s*\[\[[^\]]*\]\]/g,"").replace(/\s+/g," ").trim();
const fmt=s=>esc(s).replace(/\{(\d+)\|([^}]+)\}/g,'<mark class="kw"><sup>$1</sup>$2</mark>').replace(/\[\[([^\]]*)\]\]/g,'<span class="gl">$1</span>');
const key=c=>c.say||c.w;
const list=()=>G[g].cards;
const ALL=G.flatMap(x=>x.cards);
function play1(k){return TTS.play(k,rate)}
const wait=s=>{const t=TTS.sess();return new Promise(r=>setTimeout(()=>r(TTS.sess()===t),s*1000))};
async function seq(keys){let t=0;for(const k of keys){const d=await play1(k);if(d==null)return t;t+=d}return t}
function seg(el,opts,sel,on){el.innerHTML="";opts.forEach((o,k)=>{const b=document.createElement("button");b.textContent=o;if(k===sel)b.className="on";b.onclick=()=>{on(k);seg(el,opts,k,on)};el.appendChild(b)})}
function cueEl(el,p,lb){el.textContent=(p?lb||"":"")+({listen:"聽",echo:"回音・心裡默念",shadow:"跟讀・大聲說出來"}[p]||"按「回音法播放」開始");el.style.color=p==="shadow"?"var(--ac)":p?"":"var(--mu)"}
const setCue=(p,lb)=>cueEl($("cue"),p,lb);
function clearHl(){document.querySelectorAll(".sn.hl").forEach(e=>e.classList.remove("hl"));document.querySelectorAll(".tx .cue").forEach(e=>{e.textContent="";})}
function stop(){TTS.cancel();run++;playing=false;setCue("");clearHl();render()}
async function once(keys){stop();await seq(keys)}
/* ===== 單字圖卡 ===== */
function grid(){$("ga").innerHTML=list().map((c,k)=>`<div class="ca${k===i?" cur":""}" data-k="${k}"><span class="sp">🔊</span><div class="en">${esc(c.w)}</div><div class="zh">${esc(c.zq||c.zh||"")}</div><div class="tg">${esc(c.tag||c.pos.split(/[,（(\[]/)[0])}</div></div>`).join("");
 $("ga").querySelectorAll(".ca").forEach(el=>el.onclick=()=>{stop();i=+el.dataset.k;render();once(cardKeys(list()[i]))})}
function cardKeys(c){return c.ex?[key(c),c.ex]:[key(c)]}
function render(){const L=list();if(i>=L.length)i=0;const c=L[i];$("pos").textContent=G[g].name+"　"+(i+1)+" / "+L.length;
 $("w").textContent=c.w;$("tag").textContent=c.pos+(c.note?"　"+c.note:"");$("ipa").textContent=c.ipa||"";
 $("def").textContent=c.def||"";$("zh").textContent=c.zh||"";
 $("ex").innerHTML=c.ex?`<div>${esc(c.ex)}</div><div class="mu">${esc(c.exzh||"")}</div>`+(c.ex2?`<div style="margin-top:6px">${esc(c.ex2)}</div><div class="mu">${esc(c.ex2zh||"")}</div>`:""):"";
 $("o2").style.display=c.ex?"":"none";grid()}
async function play(){TTS.cancel();const r=++run,s0=TTS.sess();playing=true;render();const ok=()=>run===r&&TTS.sess()===s0;const L=list();
 while(ok()&&i<L.length){render();const c=L[i],parts=cardKeys(c);
  for(let j=0;j<parts.length;j++){const rounds=j===0?2:1;for(let k=0;k<rounds;k++){setCue("listen",(j?"例句":"單字")+"｜");$("w").classList.add("hl");const d=await play1(parts[j]);$("w").classList.remove("hl");if(d==null||!ok())return;
   setCue("echo");if(!await wait(d+.8)||!ok())return;setCue("shadow");if(!await wait(d*1.3+1)||!ok())return}}
  if(!await wait(.5)||!ok())return;if(i+1<L.length)i++;else break}
 if(ok()){playing=false;i=0;setCue("");render()}}
/* ===== 課文 ===== */
const SENT=[];let sj=0;
function textsHTML(){return W.texts.map(t=>{const ids=[];const body=t.paras.map(p=>`<div class="pa">`+p.map(s=>{const j=sj++;const pl=plain(s);SENT.push(pl);ids.push(j);return `<div class="sn" id="s${j}" data-j="${j}">${fmt(s)}</div>`}).join("")+`</div>`).join("");
  t.ids=ids;const kws=[];t.paras.flat().forEach(s=>{(s.match(/\{\d+\|[^}]+\}/g)||[]).forEach(m=>{const x=m.slice(1,-1).split("|");kws.push(`<b>${x[0]}.</b> ${esc(x[1])}`)})});
  return `<div class="box tx" id="tx-${t.id}"><b style="font-size:18px">${esc(t.title)}</b><div class="mu" style="font-size:13px">${esc(t.tag)}</div>
  <div class="row"><button class="b p" data-a="all">▶ 全文連播</button><button class="b" data-a="echo">回音法逐句</button><button class="b" data-a="stop">⏹ 停止</button></div><div class="cue" style="min-height:20px"></div>
  <div class="story">${body}</div>${kws.length?`<div class="mu" style="font-size:13px">講義編號重點詞：${kws.join("　")}</div>`:""}${t.note?`<div class="mu" style="font-size:13px">${esc(t.note)}</div>`:""}<div class="mu" style="font-size:12px">點任一句可單獨聽。</div></div>`}).join("")}
function bindTexts(){W.texts.forEach(t=>{const box=$("tx-"+t.id),cue=box.querySelector(".cue");
 box.querySelectorAll(".sn").forEach(e=>e.onclick=()=>{stop();const j=+e.dataset.j;e.classList.add("hl");play1(SENT[j]).then(()=>e.classList.remove("hl"))});
 box.querySelector('[data-a="stop"]').onclick=stop;
 box.querySelector('[data-a="all"]').onclick=async()=>{stop();const r=run,s0=TTS.sess();const ok=()=>run===r&&TTS.sess()===s0;
  for(let n=0;n<t.ids.length&&ok();n++){const j=t.ids[n];const e=$("s"+j);e.classList.add("hl");cueEl(cue,"listen","【"+(n+1)+"/"+t.ids.length+"】");const d=await play1(SENT[j]);e.classList.remove("hl");if(d==null||!ok())return;if(!await wait(.35))return}if(ok())cue.textContent=""};
 box.querySelector('[data-a="echo"]').onclick=async()=>{stop();const r=run,s0=TTS.sess();const ok=()=>run===r&&TTS.sess()===s0;
  for(let n=0;n<t.ids.length&&ok();n++){const j=t.ids[n],e=$("s"+j),lb="【"+(n+1)+"/"+t.ids.length+"】";e.classList.add("hl");cueEl(cue,"listen",lb);const d=await play1(SENT[j]);if(d==null||!ok()){e.classList.remove("hl");return}
   cueEl(cue,"echo",lb);if(!await wait(d+.8)||!ok()){e.classList.remove("hl");return}cueEl(cue,"shadow",lb);if(!await wait(d*1.3+1)||!ok()){e.classList.remove("hl");return}e.classList.remove("hl")}if(ok())cue.textContent="完成 ✔"}})}
/* ===== 近義辨析 ===== */
function synHTML(){return W.syn.map((s,k)=>`<tr data-k="${k}"><td>🔊 ${esc(s[0])}</td><td>${esc(s[1])}</td></tr>`).join("")}
/* ===== 小測驗 ===== */
const Q=[];ALL.forEach(c=>{if(c.def)Q.push({t:"def",c});if(c.zh){Q.push({t:"w2zh",c});Q.push({t:"zh2w",c})}});
const shuf=a=>{a=a.slice();for(let k=a.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]]}return a};
const zq=c=>c.zq||c.zh;
function prep(q){const c=q.c;q.say=key(c);q.k=q.t+"|"+key(c);
 if(q.t==="def"){const re=/\s|\//.test(c.w)?null:new RegExp("\\b"+c.w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\w*","gi");q.q=re?c.def.replace(re,"＿＿＿"):c.def;q.z="哪個單字的意思是？";q.a=c.w;q.o=shuf([c,...shuf(ALL.filter(x=>x!==c)).slice(0,3)]).map(x=>x.w)}
 else if(q.t==="w2zh"){q.q=c.w;q.z="中文意思是？（"+c.pos.split(/[,（(\[]/)[0]+"）";q.a=zq(c);const d=[];shuf(ALL.filter(x=>x!==c&&x.zh&&zq(x)!==q.a)).forEach(x=>{if(d.length<3&&!d.includes(zq(x)))d.push(zq(x))});q.o=shuf([q.a,...d])}
 else{q.q=zq(c);q.z="哪個英文單字／詞組？";q.a=c.w;q.o=shuf([c,...shuf(ALL.filter(x=>x!==c&&x.zh&&zq(x)!==zq(c))).slice(0,3)]).map(x=>x.w)}}
function quiz(){const q=Q[qi];if(!q.o)prep(q);$("sc").textContent="答對 "+score+" / "+done;$("qw").textContent=q.q;$("qz").textContent=q.z;$("qo").innerHTML="";
 q.o.forEach(o=>{const b=document.createElement("button");b.className="b";b.textContent=o;if(pk&&o===q.a){b.style.background="var(--ok)";b.style.color="#fff"}else if(pk===o)b.style.color="var(--bad)";
  b.onclick=()=>{if(pk)return;pk=o;done++;if(o===q.a)score++;quiz();play1(q.say)};$("qo").appendChild(b)});
 $("qr").textContent=pk?(pk===q.a?"答對了！Well done 👏":"正確答案是 "+q.a):"";$("qr").style.color=pk===q.a?"var(--ok)":"var(--bad)";$("qn").style.display=pk?"":"none"}
$("qn").onclick=()=>{pk=null;let n=qi;while(n===qi)n=Math.floor(Math.random()*Q.length);qi=n;Q[qi].o=null;quiz()};
/* ===== 口說練習：Say it／Practice／Q&A ===== */
const DK=W.decks;
function drill(){const d=DK[dk],it=d.items[di];$("dlab").textContent=d.kind==="say"?"看到中文，先自己用英文說說看：":"先自己說說看（可以點題目聽一次）：";
 $("dq").textContent=it.q;$("da").textContent=d.kind==="say"?it.a.join(" / "):it.a[0];$("da").style.visibility="hidden";
 $("dnote").textContent=(it.note||"")+(it.tag?"（"+it.tag+"）":"")||"";$("dnote").style.display="none";$("dpos").textContent=d.name+"　"+(di+1)+" / "+d.items.length}
$("dr").onclick=()=>{$("da").style.visibility="visible";$("dnote").style.display="";const d=DK[dk],it=d.items[di];once(d.kind==="say"?it.a:[it.a[0]])};
$("dn").onclick=()=>{stop();const n=DK[dk].items.length;di=n>1?(di+1+Math.floor(Math.random()*(n-1)))%n:0;drill()};
$("dq").onclick=()=>{if(DK[dk].kind==="qa")once([DK[dk].items[di].q.replace(/^(Q\d|Question):\s*/,"")])};
$("o1").onclick=()=>once(cardKeys(list()[i]));$("o2").onclick=()=>once([list()[i].ex]);
$("pv").onclick=()=>{stop();i=(i-1+list().length)%list().length;render()};$("nx").onclick=()=>{stop();i=(i+1)%list().length;render()};$("pl").onclick=()=>playing?stop():play();
$("texts").innerHTML=textsHTML();bindTexts();
$("syn").innerHTML=synHTML();$("syn").querySelectorAll("tr").forEach(tr=>tr.onclick=()=>once([W.syn[+tr.dataset.k][0]]));
seg($("grp"),G.map(x=>x.name),g,k=>{stop();g=k;i=0;render()});
seg($("rate"),R.map(r=>r+"x"),R.indexOf(rate),k=>{rate=R[k]});
seg($("dkseg"),DK.map(x=>x.name),dk,k=>{stop();dk=k;di=0;drill()});
if(!TTS.supported())$("nov").style.display="";
try{qi=Math.floor(Math.random()*Q.length);setCue("");render();quiz();drill();window.__unitReady=1}catch(e){console.error(e);document.body.insertAdjacentHTML("afterbegin","<div style='padding:12px;color:#d64545'>載入失敗："+e+"</div>")}
RW.page(W.uid,{qans:()=>Q[qi].a,list:()=>list(),idx:()=>i,cardKey:c=>key(c),qkey:()=>Q[qi].k,drillFn:"drill",cards:ALL.map(key),story:SENT,score:()=>score,done:()=>done,speakBtn:$("dr"),speakText:()=>$("da").textContent});RPG.page();
