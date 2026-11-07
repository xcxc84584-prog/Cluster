# Cluster v0.0.5 opt11｜更新報告

## 0. 使用者提示詞
「繼續」；延續 opt10 驗收：PR14 英文模式「工具」仍為中文（扣2分）；Explorer file/fold 關閉時相關編輯文件需同步關閉（扣10分）；維持 opt13.2 UI 與 BASE–LINK–PLUGIN。

## 1. 部署、驗證與回滾
解壓 ZIP，於根目錄執行 `python -m http.server 8080`，瀏覽 `http://localhost:8080/BASE/`。以全新資料夾部署，避免與舊版混用。回滾：停止伺服器並改用 opt10 ZIP；瀏覽器本地資料應先備份，勿直接清除。

## 2. 修改內容
- [FIX-OPT11-001] `link_plugin_CEXP/host-adapter.js`：LINK 層新增批次關閉編輯分頁，對未保存修改提供確認，並只觸發一次 FileManager 更新。
- [FIX-OPT11-002] `link_plugin_CEXP/explorer-ui.js`：原版 Explorer 操作列增加「⊟」關閉相關編輯分頁（非刪除磁碟檔案），資料夾遞迴關閉已知子文件。
- [FIX-OPT11-003] `PLUGIN/I18n/i18n.js`：工具標題及自動同步選項使用穩定 `data-i18n` 鍵值；兩種語言明確定義。

## 3. 新增內容
新增 Explorer → LINK → FileManager 的批次分頁關閉 API `ClusterTabs.closeNodes(nodes)`。保留 opt10 Explorer 的其他結構與 CSS。

## 4. 潛在代碼問題
Explorer 尚未展開且未載入的子節點不會列於前端遞迴清單；FileHandle 比對使用物件識別，若瀏覽器返回不同實例，可能無法對應。需實機驗證資料夾深層操作。關閉未保存文件採確認流程，需確認草稿復原符合預期。

## 5. 效能分析
關閉分頁由逐檔 `notify()` 改為單次批次 `notify()`，預期降低 UI 重繪。未實測 LCP/INP/CLS；不能聲稱性能改善幅度。批次篩選時間約 O(D+N×D)，D 為開啟文件數、N 為選中節點子文件數。

## 6. 安全性
不直接執行 shell 命令；Explorer「⊟」只關閉分頁、不刪除檔案。對未保存編輯提示確認。瀏覽器本地存儲與檔案權限沿用 opt10。

## 7. 知識點目錄
DOM 事件；插件 Adapter；事件通知批次化；樹狀結構遞迴；i18n 字典；資料完整性。

## 8. 知識點簡述
**Adapter 與事件邊界：** Explorer 不應直接查找編輯器 DOM 並移除分頁，因為這會讓 UI 插件依賴 BASE 內部結構。LINK 層以穩定 API 接收 Explorer 指令，再交給 FileManager 修改文件集合，最後透過原有通知機制更新畫面。這樣可獨立替換 Explorer 或 FileManager，而不必同步改寫兩端核心。

**批次關閉與資料安全：** 若逐個關閉文件，每次都重繪編輯器，可能出現短暫錯誤活動分頁，並增加負載。批次操作先計算完整待關閉集合、檢查未保存狀態，再一次性變更文件集合。對未保存文件先詢問，避免靜默遺失。需注意：使用者選擇確認關閉，不代表資料已經寫入磁碟，草稿復原仍需另外驗證。

**i18n 鍵值：** 以固定識別碼對應不同語言的文字，比根據現有中文或英文內容搜尋替換更可靠。動態 UI、圖示、空白與 DOM 重新渲染可能改變顯示字串；鍵值則不受這些因素影響。新功能需同步加入兩種語言並在測試中切換確認。

## 9. 程序檔案與函數座標
- `link_plugin_CEXP/host-adapter.js`：`closeBatch`、`ClusterTabs.closeNodes`（見 [FIX-OPT11-001]）。
- `link_plugin_CEXP/explorer-ui.js`：`descendants`、`closeEditorTabs`、`draw`（見 [FIX-OPT11-002]）。
- `PLUGIN/I18n/i18n.js`：`applyToolKeys`（見 [FIX-OPT11-003]）。

## 10. 參考來源
- https://github.com/microsoft/vscode
- https://github.com/codemirror/dev
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- 使用者提供 `sGWMP_v1.1.0`、`編寫日誌管理`、`Cluster_v0.0.4_opt13.2`。

## 11. PR 測試附件
詳見 `PR_Test_Report.md`。語法、SegmentLoader smoke、gutter 回歸測試已執行；瀏覽器實機測試未執行。
