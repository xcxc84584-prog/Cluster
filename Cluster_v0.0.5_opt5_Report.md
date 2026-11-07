# Cluster v0.0.5 opt5｜更新報告

## 0. 原始提示詞
「無任何反應」，附圖顯示檔案按鈕。
## 1. 部署、驗證與回滾
解壓縮後雙擊 index.html；或在根目錄執行 `python -m http.server 8080`。回滾 opt4 只需替換目錄。
## 2. 修改差異與程式碼標註
[FIX-001] BASE/index.html 改載入 classic script；BASE/cluster-standalone.js 依序內嵌 SegmentLoader、FileManager 與 UI 控制器，避免 file:// 的 ES Module CORS；並移除 pollExternal 多餘的右大括號（原 opt4 第84行）。
## 3. 新增功能與標註
[ADD-001] file:// 可直接啟動 UI 的相容打包入口。
## 4. 代碼潛在問題
單檔 Bundle 暫時複製源模組；未來應採用正式 bundler，避免雙份邏輯漂移。
## 5. LCP / INP / CLS 與負載效能
未取得真實指標。增加的 Bundle 為本地檔案，無額外網路往返。
## 6. 網路安全風險
本地 file:// 與 HTTP origin 的 localStorage 不共用。檔案存取仍受瀏覽器授權限制。
## 7. 知識點目錄
ES Module CORS、classic script、瀏覽器檔案來源、單一入口打包。
## 8. 知識點入門說明
ES Module 使用 import/export 載入相依模組，瀏覽器對 file:// 來源有較嚴格的安全限制。classic script 不需進行模組跨來源匯入，能在本機直接執行。這次將原始模組按相依順序合併為單一 classic script，但仍保留原始模組檔案，方便後續重構。
## 9. 真實檔案與函數對照
BASE/index.html：script 標籤；BASE/cluster-standalone.js：render、action、fileButton 事件註冊；PLUGIN/FileManager/file-manager.js：FileManager；PLUGIN/SegmentLoader/segment.js：SegmentDocument。
## 10. 參考來源
MDN JavaScript modules https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
## 11. PR 測試附件與方法
參閱 PR_Test_Report.md；須在實際瀏覽器測試開啟檔案與多檔載入。
