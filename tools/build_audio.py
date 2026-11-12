# python3 tools/build_audio.py week01  → week01-audio/*.mp3 + week01-audio.js（需先 node tools/collect.js week01 > /tmp/week01.json）
import asyncio,hashlib,json,os,subprocess,sys,edge_tts
wk=sys.argv[1];texts=json.load(open(f"/tmp/{wk}.json"));VOICE="en-US-JennyNeural";RATE="-5%"
os.makedirs(f"{wk}-audio",exist_ok=True)
def fn(t):return f"{wk}-audio/en_"+hashlib.sha1(t.encode()).hexdigest()[:16]+".mp3"
async def one(t,sem):
    out=fn(t)
    if os.path.exists(out):return
    async with sem:
        for n in range(4):
            try:
                await edge_tts.Communicate(t,VOICE,rate=RATE).save(out+".raw");break
            except Exception as e:
                if n==3:raise
                await asyncio.sleep(2)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",out+".raw","-ac","1","-ar","24000","-b:a","96k",out],check=True);os.remove(out+".raw")
async def main():
    sem=asyncio.Semaphore(4);await asyncio.gather(*[one(t,sem) for t in texts])
asyncio.run(main())
with open(f"{wk}-audio.js","w") as f:
    f.write("window.UNIT_C=window.UNIT_C||{};\nObject.assign(window.UNIT_C,{\n"+",\n".join(f"  {json.dumps(t,ensure_ascii=False)}: {json.dumps(fn(t))}" for t in texts)+"\n});\n")
print(len(texts))
