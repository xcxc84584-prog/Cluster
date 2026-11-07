# Cluster v0.0.5 opt8 更新報告

## 0 使用者提示詞
opt8：修正 PR10、PR13、PR15、PR16、PR18，維持 opt13.2 原版 UI，依 sGWMP v1.1.0 及 BLP 架構實作。

## 1 部署、驗證、回滾
解壓縮後執行 `python -m http.server 8080`，使用 `http://localhost:8080/BASE/`。請使用支援 File System Access API 的 Chromium。回滾：改回 opt7 ZIP；瀏覽器 IndexedDB 為不同版本共用資料，回滾前先備份原始文件。

## 2 修改差異
- [FIX-001] BASE/cluster-standalone.js：解除 autoSyncToggle 禁用。
- [MOD-001] BASE/enhancements.js：移除簡化 Explorer，避免雙重事件註冊。
- [MOD-002] BASE/index.html：註冊 CEXP 核心與 LINK，及 EditorAssist、WorkspacePersistence。

## 3 新增功能
- [ADD-001] plugin_CEXP/explorer-core.js：復用 opt13.2 原版 Explorer 核心。
- [ADD-002] link_plugin_CEXP/explorer-ui.js：復用 opt13.2 原版 Explorer UI。
- [ADD-003] link_plugin_CEXP/host-adapter.js：Cluster FileManager 到 CEXP 的 LINK。
- [ADD-004] PLUGIN/WorkspacePersistence/persistence.js：IndexedDB 工作階段、草稿、Block、部分行號索引持久化；500ms debounce。
- [ADD-005] PLUGIN/EditorAssist/editor-assist.js：括號自動配對、跳過、成對刪除、Shift+Tab、花括號換行。

## 4 代碼問題
- IndexedDB 存儲大索引有配額及記憶體成本；超過 100 萬行的索引未快取。
- FileHandle 重新載入後若權限未授予，需使用者再次授權。
- opt7 小文件與 opt8 IndexedDB 同時儲存，後續應合併。
- Explorer UI 原版邏輯與新 LINK 的 API 適配需要實際瀏覽器回歸驗證。

## 5 效能
- LCP/INP/CLS：尚未以瀏覽器量測，不宣稱改善數值。
- 自動保存 debounce 500ms；非磁碟寫入完成保證。
- 大檔案索引可在未修改且 size/lastModified 相同時重用；首次仍需建立。
- 索引快取限制：小於 100 萬行；超出時重新掃描。

## 6 安全
- IndexedDB 依 origin 隔離，但同源腳本可讀取；禁止在不受信任網站執行。
- 實體檔案寫回僅使用使用者授權的 FileHandle。
- 自動保存前需防範外部檔案修改與覆蓋衝突；目前仍須進一步測試。

## 7 知識點
IndexedDB、File System Access API、debounce、line offset index、textarea selection、BLP、sGWMP。

## 8 入門說明
IndexedDB 能儲存瀏覽器本地結構化資料與可序列化的檔案 Handle，適合保存編輯狀態，但不保證使用者授權永久有效。debounce 把連續鍵盤事件合併成較少寫入，降低存儲負擔。行號索引紀錄每一行起始位元組位置，可加快隨機行號定位，但大文件索引本身也需要記憶體和儲存空間。LINK 層將 Explorer 的檔案操作與 BASE 文件分頁串接，讓 Explorer Plugin 保持可移植。

## 9 檔案與函數座標
詳見附件 `tests/opt8-function-map.md`，以交付檔案實際行號為準。

## 10 參考資料
- https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
- https://github.com/codemirror/commands/blob/main/src/commands.ts
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- 使用者提供 Cluster v0.0.4 opt13.2 CEXP 原始碼（主要 UI/行為基準）

## 11 PR 測試附件
參見 `PR_Test_Report.md`。靜態檢查不等於瀏覽器驗收，所有 PR 得分由使用者測試後確定。
