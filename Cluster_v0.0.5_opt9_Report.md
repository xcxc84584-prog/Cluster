# Cluster v0.0.5 opt9｜更新報告

## 0. 使用者提示詞
繼續修正 opt8 的 PR14（完整翻譯與可擴充性）、PR15（大檔索引快取）、PR16（換行跳行與引號配對）、PR18（Explorer 完整操作）。保留 v0.0.4 opt13.2 風格及 BLP 架構。

## 1. 部署、驗證、回滾
解壓後以 `python -m http.server 8080` 啟動，開啟 `/BASE/`；可回滾至 opt8 ZIP。**切勿在有未保存草稿時清除瀏覽器網站資料。**

## 2. 修改差異
- [FIX-001] `PLUGIN/EditorAssist/editor-assist.js`：捕獲階段獨佔 Enter/Tab 事件，避免兩次處理。
- [MOD-001] `link_plugin_CEXP/explorer-ui.js`：顯示具名操作、F2 重新命名、Delete 刪除確認。
- [MOD-002] `BASE/style.css`：保留原版深色風格，顯示 Explorer 操作控制。

## 3. 新增功能
- [ADD-001] `PLUGIN/SegmentLoader/segment.js`：索引完成即寫入 IndexedDB，下次先查詢快取。
- [ADD-002] `PLUGIN/I18n/i18n.js`：可擴充中英文字典。
- [ADD-003] `PLUGIN/EditorAssist/editor-assist.js`：`""`、`''`、括號配對、Shift+Tab。

## 4. 程式潛在問題
行號索引快取依名稱、大小、修改時間匹配；若外部程序保留修改時間卻變更內容，可能誤用快取。大量行數的 Float64Array 可能受到 IndexedDB 配額限制。Explorer 移動及重新命名仍受瀏覽器 File System API 權限約束。

## 5. LCP / INP / CLS 與負載效能
未在實際瀏覽器量測 LCP、INP、CLS；不得填寫虛構數據。索引冷啟動 O(N)；命中快取時仍需從 IndexedDB 載入 O(L) 個行位移，L 為行數。

## 6. 網路安全
IndexedDB 快取可能暴露文件元資料，避免將其作為秘密存放處；檔案操作需明確權限，刪除前二次確認；不得將 PowerShell 輸入傳遞到 OS Shell。

## 7. 知識點目錄
IndexedDB、File API、DOM capture event、selectionStart、textarea.setRangeText、BLP Adapter、i18n dictionary。

## 8. 知識點入門說明
IndexedDB 為瀏覽器提供非同步物件儲存，可用於保留大型索引，但寫入可能受配額限制。事件捕獲階段先於一般事件監聽器執行，搭配 preventDefault 和 stopImmediatePropagation 可避免同一按鍵被多個模組重複處理。字典式 i18n 把 UI 文案與業務邏輯分離，擴充時增加鍵值即可。

## 9. 檔案與函數座標
`PLUGIN/EditorAssist/editor-assist.js`：keydown；`PLUGIN/SegmentLoader/segment.js`：SegmentDocument.index；`PLUGIN/I18n/i18n.js`：apply；`link_plugin_CEXP/explorer-ui.js`：draw、bindLongPress。精確行號請依交付檔案檢視。

## 10. 參考資料
- https://github.com/microsoft/vscode
- https://github.com/codemirror/view
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement/setRangeText

## 11. PR 測試附件
詳見 `PR_Test_Report.md`。
