# Cluster v0.0.5 opt1｜從零重構 UI 修正報告

## 0. 使用者原始提示詞
> v0.0.5 opt1

承接上一輪驗收：v0.0.5 得分 0，因為 UI 未保留 v0.0.4 opt13.2 風格。

## 1. 部署、驗證與回滾
在 ZIP 根目錄執行 `python -m http.server 8080`，開啟 `http://127.0.0.1:8080/BASE/`。PowerShell：`http://127.0.0.1:8080/local-powershell/`。回滾：停止伺服器並替換為原 v0.0.5 目錄。注意未儲存文件資料。

## 2. 修改差異與標註
- [FIX-001] `BASE/index.html`：直接移植 opt13.2 原始 DOM，取代 v0.0.5 自建的簡化介面。
- [MOD-001] `BASE/style.css`：完整複製 opt13.2 CSS。
- [MOD-002] `BASE/opt1.js`：新 FileManager 與原始 DOM 事件接線。

## 3. 新增功能
- [ADD-001] 舊版檔案下拉選單、原始分頁、行號欄、底部定位列、狀態列。
- [ADD-002] PowerShell 入口連結，仍為獨立 `/local-powershell/`。
- [ADD-003] 離開頁面前未儲存變更提示。

## 4. 潛在程式問題
SegmentLoader 大檔索引使用完整行首陣列，1 GB 多檔仍有記憶體風險；大型文件修改後索引與重疊編輯尚未完整處理；原始 BlockManager、Explorer 尚未重新實作，相關按鈕已停用。

## 5. LCP / INP / CLS 與負載
未執行真實瀏覽器測量，無可靠數值。原始 CSS 及 DOM 保留，需進行與 opt13.2 同尺寸截圖比較。大型文件載入仍需要瀏覽器壓力測試。

## 6. 網路安全風險
本地檔案 Handle 僅由使用者操作授權。PowerShell 僅為瀏覽器內的命令模擬介面，不能執行 OS PowerShell；Log 存於 localStorage，應避免記錄敏感內容。

## 7. 知識點目錄
DOM 相容、CSS 選擇器、事件適配、Blob.slice、File System Access API、鏈式切片、索引與 UI 回歸測試。

## 8. 知識點入門說明
**DOM 相容與 CSS**：樣式表中的選擇器會依據元素 ID、類別、父子層級和狀態來套用外觀。只複製 CSS 卻重新編排 HTML，常使原本的選單、分頁及工具列失去預期的位置或尺寸。這次改成保留原始 DOM 結構，只替換事件處理程式，能更有效降低視覺差異。不過原始頁面還含有 Explorer 與區塊管理的元素，這些元素必須明確停用或接入新插件，不能讓未實作功能假裝可用。視覺相似也不能只靠靜態檢查確認，仍應在相同視窗尺寸與瀏覽器縮放比例下比對截圖，並實測選單、文件切換及儲存。

**切片與索引**：Blob.slice 讓網頁在不一次讀取完整檔案的情況下，按位元組範圍取出內容。鏈式節點可以描述切片順序，但不代表整份文件已經可以安全地任意編輯。對於行號跳轉，還需要建立換行位置索引，並處理 UTF-8 字元跨位元組切點與 CRLF 換行。若對每一行都建立一個 JavaScript 數字索引，超大文件仍可能造成可觀的記憶體負擔。後續應採用稀疏索引、背景 Worker 與交易式更新，並且實測各種大小的文件。這次保留既有 SegmentLoader，沒有宣稱上述問題已全部解決。

## 9. 真實檔案、函數與行號
- `BASE/index.html`：原始 opt13.2 介面 DOM。
- `BASE/style.css`：原始 opt13.2 CSS。
- `BASE/opt1.js`：`tabs()` 分頁、`render()` 編輯內容、`save()` 儲存、`clusterGoLine` 行號定位。
- `PLUGIN/FileManager/file-manager.js`：`FileManager.open/save/close`。
- `PLUGIN/SegmentLoader/segment.js`：`SegmentDocument.init/index/getLines`。
- `local-powershell/shell.js`：`exec()` 命令解析。

## 10. 參考來源
本機提供的 Cluster v0.0.4 opt13.2 原始檔 `index.html`、`style.css`；Cluster v0.0.5 既有 Plugin 原始碼。

## 11. PowerShell PR 測試與方法
詳見 `PR_Test_Report.md`。已執行 Node.js SegmentLoader smoke 測試 PASS，四個 JavaScript 語法檢查 PASS。未執行實際瀏覽器 UI 視覺驗收、大型文件載入與外部同步測試。
