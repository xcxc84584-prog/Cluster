# Cluster v0.0.5 opt10｜更新報告
## 0. 使用者提示詞
繼續：根據 opt9 驗收，修復自動同步造成內容損失、選單互斥、PR15 索引重建，PR14 語言及 PR18 回退 opt8。
## 1. 部署、驗證與回滾
解壓 ZIP；執行 `python -m http.server 8080`；瀏覽 `http://localhost:8080/BASE/`。回滾到 opt8 ZIP。**切換版本前請先備份實體文件及瀏覽器草稿。**
## 2. 修改差異
- [FIX-001] WorkspacePersistence: 分離草稿 checkpoint 與磁碟寫入，3.5 秒空閒後寫入，防止 notify 重繪覆蓋編輯內容。
- [MOD-001] Explorer UI 與 CSS 回退 opt8 原版。
- [FIX-002] File 選單開啟時關閉 Blocks。
## 3. 新增功能
- [ADD-001] IndexCache 插件：以檔名、大小、修改時間辨識相同文件；IndexedDB 儲存 Uint32 行號索引。
- [MOD-002] i18n 增補主要標籤。
## 4. 代碼潛在問題
大檔行號索引可消耗大量 IndexedDB 空間；若瀏覽器配額不足會回退完整重建。mtime 與 size 不是強內容校驗。大檔的 pendingView 仍只做瀏覽器草稿 checkpoint，**不會自動寫回磁碟**。
## 5. 效能分析
索引快取命中時省去全文位元組掃描，但 Array.from() 仍需 O(行數) 記憶體初始化。LCP、INP、CLS 未於真實瀏覽器量測；無法宣稱改善數值。
## 6. 安全風險
FileSystemFileHandle 權限須由使用者授予；IndexedDB 儲存草稿，清除站點資料可能遺失；保留獨立備份。不可將檔名/mtime 當密碼學驗證。
## 7. 知識點
IndexedDB、typed array、debounce、版本戳、競態條件、File System Access API。
## 8. 知識點入門
IndexedDB 可保存大量結構化資料；typed array 讓每個行號偏移使用固定寬度整數，減少儲存成本。Debounce 是等輸入暫停一段時間後才執行工作，可減少磁碟寫入。版本戳用於確定待寫入的資料是否仍與使用者目前的編輯版本相符，避免過時的非同步操作覆蓋新內容。File System Access API 的寫入權限受瀏覽器及使用者授權限制。上述機制不能取代完整的交易式儲存與復原測試。
## 9. 程序位置
`PLUGIN/WorkspacePersistence/persistence.js` checkpoint/scheduleDiskSave；`PLUGIN/IndexCache/index-cache.js` restore/store；`BASE/cluster-standalone.js` SegmentDocument.index wrapper / menu handler；`link_plugin_CEXP/explorer-ui.js` opt8 restored。
## 10. 參考資料
https://github.com/microsoft/vscode ; https://github.com/codemirror/view ; https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API ; https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
## 11. PR 測試附件
見 `PR_Test_Report.md`。實機驗收待使用者執行。
