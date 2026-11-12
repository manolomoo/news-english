/* 英文語音：預錄 Microsoft 神經語音（en-US-JennyNeural）mp3。對照表 window.UNIT_C（字串→檔案路徑）由 weekNN-audio.js 提供。
   TTS.play(text, rate) → Promise<秒數>；被中斷回傳 null。TTS.cancel() 中斷；TTS.sess() 目前世代。
   同一個 <audio> 重複使用（手機在回音法間隔後，新的 Audio() 可能被自動播放政策擋住，導致只聽到第一段）。
   rate 用 Audio.playbackRate（preservesPitch）。找不到音檔才退回 speechSynthesis，並在 console 警告。 */
(function(){
const syn=window.speechSynthesis;let sess=0,pend=null,clip=0,cur=null,shared=null;const C=()=>window.UNIT_C||{};
const SILENT="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const est=(t,r)=>Math.max(.8,t.trim().split(/\s+/).length/(2.5*r)+.3);
function ensure(){
  if(shared)return shared;
  const a=document.createElement("audio");
  a.setAttribute("playsinline","");a.setAttribute("webkit-playsinline","");a.playsInline=true;a.preload="auto";
  a.style.cssText="position:absolute;width:0;height:0;opacity:0;pointer-events:none";
  (document.body||document.documentElement).appendChild(a);
  return shared=a;
}
/* 在使用者點擊當下呼叫，把共用音訊解鎖，之後回音法的間隔再播才不會被擋。 */
function unlock(){
  try{
    const a=ensure();
    if(!a.src)a.src=SILENT;
    const p=a.play();
    if(p&&p.then)p.then(()=>{try{if(!cur){a.pause();a.currentTime=0}}catch(e){}}).catch(()=>{});
  }catch(e){}
}
function stopAll(){
  if(cur){try{cur.onended=null;cur.onerror=null;cur.pause()}catch(e){}}
  cur=null;
  try{syn&&syn.cancel()}catch(e){}
}
function cancel(){sess++;if(pend){const p=pend;pend=null;p(null)}stopAll()}
function play(text,rate){rate=rate||1;const prev=pend;pend=null;if(prev)prev(null);const id=++clip,s0=sess;stopAll();
 return new Promise(res=>{let done=false,timer=0;
  const fin=d=>{if(done)return;done=true;clearTimeout(timer);if(pend===cm)pend=null;res(id===clip&&s0===sess?d:null)};
  const cm=()=>{if(done)return;done=true;clearTimeout(timer);res(null)};pend=cm;
  const e=est(text,rate),f=C()[text];
  if(f){
    const a=ensure();cur=a;
    a.onended=null;a.onerror=null;
    a.preservesPitch=true;a.mozPreservesPitch=true;a.webkitPreservesPitch=true;
    a.onended=()=>fin(a.duration&&isFinite(a.duration)?a.duration/rate:e);
    a.onerror=()=>{console.warn("[TTS] 音檔載入失敗：",f);fin(e)};
    timer=setTimeout(()=>fin(e),e*1000*3+8000);
    const start=()=>{
      try{a.playbackRate=rate}catch(err){}
      try{if(a.readyState>=1&&a.currentTime)a.currentTime=0}catch(err){}
      const p=a.play();
      if(p&&p.catch)p.catch(err=>{if(id!==clip||s0!==sess)return;console.warn("[TTS] 播放被擋：",err&&err.name);fin(e)});
    };
    let abs;try{abs=new URL(f,location.href).href}catch(err){abs=f}
    if(a.src===abs&&a.readyState>=2){start();return}
    a.src=f;start();return;
  }
  console.warn("[TTS] 找不到預錄音檔，退回 speechSynthesis：",text);
  if(!syn||typeof SpeechSynthesisUtterance==="undefined"){timer=setTimeout(()=>fin(e),e*1000);return}
  timer=setTimeout(()=>fin(e),e*2000+4000);const t0=Date.now();
  try{const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=rate;u.onend=()=>fin(Math.max(.4,(Date.now()-t0)/1000));u.onerror=ev=>{if(ev&&(ev.error==="canceled"||ev.error==="interrupted"))return;fin(e)};syn.speak(u)}catch(err){fin(e)}})}
window.TTS={play,cancel,unlock,sess:()=>sess,supported:()=>typeof Audio!=="undefined",voiceName:()=>"en-US-JennyNeural"};
})();
