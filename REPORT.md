# 新聞英文-貴婦養成之路 第 1 週（2026/11/11–12）報告

## 檔案結構
- `index.html`：首頁（貴婦系統＋單元列表，卡片標「第 1 週｜2026/11/11–12」，新的在上面）
- `week01.html`：本週單元，順序固定為 ① 單字 → ② 課文 → ③ 其他
- `week01-data.js`：本週全部講義資料（單字卡、課文、近義辨析、Say it、Q&A）
- `unit.js`：單元頁引擎（圖卡、回音法、課文跟讀、測驗、口說）。以後每週共用
- `speech.js`：播放預錄 mp3（`new Audio()`，變速用 `playbackRate`＋`preservesPitch`），API 不變（`TTS.play/cancel/sess`）；找不到音檔才退回 `speechSynthesis` 並在 console 警告
- `rw.js`：練習紀錄、💩、首頁單元列表（`UNITS` 陣列，加新週只要加一行）
- `rpg.js`：貴婦系統。已改 localStorage key：`enNewsRW1`、`enLadyRPG1`、`enLadyAssetsOpen`；頭銜、貴婦小語、屬性（聽力／口說／詞彙）改成英文站版本
- `style.css`、`version.txt`（=1，`PAGEVER`=1）

## 單元內容
- 單字（46 張，三組）：咖啡篇 14、快報焦點 18（補充詞、影視職稱、collapse／faint／pass out／pass away、marathon runner）、洞察篇 14。點卡聽單字＋例句，也可「回音法播放」（聽 → 心裡回音 → 大聲跟讀）
- 課文（5 則）：咖啡篇（編號重點詞 1–6 標黃、講義註解 `(which)`、（微微的風味）、（無氧槽）只顯示不朗讀）、紐約馬拉松快訊標題、Garbage Patch、Brunei（照講義保留 “species and.”）、Karl Bushby。可逐句點聽、全文連播、回音法逐句
- 其他：近義辨析表、小測驗（定義→單字、單字→中文、中文→單字，含管家提示）、口說練習三個題組：Say it 10 題（中文→英文，可看參考答案並聽示範）、咖啡篇 Practice Q1–Q3、新聞洞察 Q&A

## 需要注意
- 咖啡篇 Practice Q1–Q3 講義只有題目，簡答是我依課文自擬的，已在頁面註明
- 講義沒有中文的詞（triple-digit、about 的詞義）不放中文，也不出中文題，沒有自行發明
- 音標只放了我對圖確認過的 commodity、about；其他頁的音標沒有逐頁核對，所以沒放
- `rw.js.spanish-ref` 已移到 `/tmp/`，本資料夾沒有西班牙文內容；其他目錄沒有動，沒有 git commit

## 測試（headless Chrome，用假的 speechSynthesis 加速）
- 首頁、單元頁無 JS 錯誤（0 個 exception／console error）
- 單字 46 張、課文 38 句載入正常；點卡後 +10 XP 並出現 💩
- 全文連播會累計課文已聽句數；小測驗連續答對 10 題後記錄 100% 並標記完成
- Say it「看答案＋聽」顯示參考答案並記入口說進度；回音法播放與停止正常；貴婦 XP／寶藏會增加
- 沒有在真實手機上試聽

## 語音改為預錄（補充任務）
- 聲音：Microsoft `en-US-JennyNeural`（edge-tts，rate -5%），與西班牙文站英文例句同一聲音
- 共錄 130 段（單字／片語、例句與 ex2、課文 38 句、近義辨析詞、Say it 英文示範、Practice／Insights 題目與答案）；同文字只錄一次，以文字為 key
- 格式：mp3、單聲道、24000 Hz、96 kbps（ffmpeg 轉），共約 6.2 MB
- 放法：`week01-audio/en_<sha1前16碼>.mp3`；對照表 `week01-audio.js`（`window.UNIT_C` 字串→路徑，`week01.html` 在 `speech.js` 之前載入）
- 重建：`node tools/collect.js week01 > /tmp/week01.json`，再 `/workspace/venv-tts/bin/python tools/build_audio.py week01`（已存在的檔會略過）。新的一週：複製流程並在新單元 html 載入 `weekNN-audio.js`
- 測試：(1) 130 段全部在對照表且檔案存在；(2) headless Chrome 載入頁面，點遍單字卡、課文句、近義辨析、口說、測驗，0 個 JS 錯誤、0 個漏檔警告（未退回 speechSynthesis）；(3) 以 ffprobe 確認格式。headless 無法聽音質，沒有人耳試聽
- 未動西班牙文站與任何 git；沒有 commit／push
