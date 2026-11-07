# Cluster v0.0.5 — Clean-slate first submission

## 0. 原始提示詞
使用舊版 UI 素材，開始從零重構，提交 Cluster v0.0.5；本階段限 BASE、文件管理 Plugin、切片式載入 Plugin 與 Local PowerShell，朝 PR1–PR9 共 150 分驗收前進。

## 1. 部署、驗證、回滾
解壓縮 ZIP；於專案根目錄執行 `python -m http.server 8080`；瀏覽 `http://127.0.0.1:8080/BASE/`，PowerShell 位於 `/local-powershell/`。回滾方式：保留舊版部署資料夾並切回舊版，不覆蓋舊版資料。File System Access API 需要瀏覽器權限。

## 2. 修改差異與程式碼標註
[MOD-001] 從零建立 BASE/index.html 與 main.js，不沿用舊版 app.js；[REF-001] BASE/legacy-style.css 直接複製 opt13.2 的 style.css 素材；[MOD-002] rebuild.css 覆蓋必要的編輯器樣式。

## 3. 新增功能與標註
[ADD-001] FileManager 文件開啟、分頁、儲存；[ADD-002] SegmentLoader 250KiB 切片 metadata 雙向鏈表；[ADD-003] 行號索引與區塊 ID；[ADD-004] BASE 行號定位；[ADD-005] Local PowerShell `help`, `clear`, `log`, `test status`；[ADD-006] 本地 log 記錄。

## 4. 程式碼潛在問題
大型文件索引目前在主執行緒分批讀取，且保存每個換行位元組偏移，超大量行數可能耗盡記憶體；大型文件編輯尚非完整 Piece Table；多次重疊修改會拒絕匯出；PowerShell 區塊測試未接通；雙向外部同步未實作。不要宣稱 PR5–PR9 全數完成。

## 5. LCP/INP/CLS 與負載效能分析
LCP/INP/CLS 尚未進行實際量測。250KiB 切片元資料為 O(fileSize / sliceSize)；行號索引為 O(fileSize) 掃描及 O(lineCount) 記憶體；可見區域讀取為 O(visible bytes)，但必須先完成索引。1GiB、多檔、瀏覽器內存測試未驗證。

## 6. 網路安全風險
本地檔案操作需明確使用者授權；Log 不應包含文件內容與敏感資訊；localStorage 容量有限且非安全稽核儲存。使用 localhost HTTP 開發，正式環境採 HTTPS。終端機不執行 OS PowerShell 指令，僅允許白名單命令。

## 7. 知識點目錄
File System Access API、Blob.slice、TextDecoder、鏈式表、行號索引、編輯交易、Viewport、Log。

## 8. 知識點入門說明
**Blob.slice 與 UTF-8**：Blob 是瀏覽器表示位元組資料的物件，`slice(start,end)` 可以取得檔案的一個區段，不需要先把整個檔案解碼成文字。對大檔案而言，這能降低讀取時的記憶體壓力。UTF-8 中文通常跨越多個位元組，直接把任意切片解碼可能產生替代字元，因此正式的切片文字呈現應在切片交界處處理字元邊界。本版切片節點保留位元組偏移，行號範圍使用完整位元組區段解碼；直接 `getSlice()` 的交界解碼尚有改進空間。

**行號索引**：快速跳到某一行需要知道該行在原始文件中的位元組位置。如果每次都從檔案開頭尋找換行，跳到後方行號的延遲會隨檔案大小增加。索引能把行號轉成偏移量，但索引本身也會消耗記憶體。最簡單的做法是保存所有換行位置，查詢速度快，但對含有數千萬行的文件成本高。更成熟的實作應採稀疏 checkpoint 或分段累計計數，兼顧速度與記憶體。

**編輯交易**：將每次修改表示成「從哪裡開始、刪除多少內容、插入什麼文字、版本編號」可以避免不同編輯視圖互相覆蓋。交易還能用來追蹤 Anchor 在插入和刪除後的位置。不過，若兩筆交易同時修改同一個範圍，必須明確拒絕、轉換座標或執行衝突合併。本版僅提供基礎交易記錄與部分區塊位移更新，尚未達到完整同步編輯器的安全等級。

## 9. 真實檔案／函數對照
`PLUGIN/SegmentLoader/segment.js`: `SegmentDocument.init`, `index`, `getLines`, `replaceLines`, `createBlock`, `checkBlock`, `exportBlob`；`PLUGIN/FileManager/file-manager.js`: `FileManager.open`, `save`, `close`；`BASE/main.js`: `render`, `goto` 事件、文件分頁；`local-powershell/shell.js`: `exec`。

## 10. 參考來源
舊版 Cluster v0.0.4 opt13.2 ZIP 中 `style.css`；https://developer.mozilla.org/en-US/docs/Web/API/Blob/slice ; https://developer.mozilla.org/en-US/docs/Web/API/File_System_API ; https://codemirror.net/docs/guide/ 。

## 11. PowerShell PR 測試附件與方法
詳見 `PR_Test_Report.md` 與 `tests/smoke.mjs`。`node tests/smoke.mjs` 只驗證切片初始化、索引、行讀取、區塊座標與匯出接口，不能取代瀏覽器端 150 分驗收。測試結果：PASS（單元測試）；其他 PR 項目 NOT RUN / PARTIAL / FAIL，依 PR_Test_Report.md。
