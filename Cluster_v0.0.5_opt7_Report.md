# Cluster v0.0.5 opt7｜更新報告

## 0. 使用者原始提示詞
保持 v0.0.4 opt13.2 UI；製作前瀏覽 GitHub；代碼簡潔；PR10–PR18（狀態恢復、PowerShell CMD/Markdown、Log 清理、持續保存、中英雙語、索引記憶、編輯手感、Block 持久化、Explorer Plugin）。

## 1. 部署、驗證與回滾
解壓後執行 `python -m http.server 8080`，瀏覽 `http://localhost:8080/BASE/` 和 `/local-powershell/`。回滾直接重新部署 opt6 ZIP。此版沒有變更 opt6 核心 API。注意：不同 origin 的 localStorage/權限彼此隔離。

## 2. 本次修改內容
- [MOD-001] BASE/index.html：在原版工具選單增加語言選擇；啟用 Explorer 入口。
- [MOD-002] BASE/cluster-standalone.js：檔案開啟事件、選擇事件、7 日 Log 篩選。
- [MOD-003] local-powershell/shell.js：Markdown 格式 help 清單、Log 清理命令。

## 3. 新增功能
- [ADD-001] BASE/enhancements.js：編輯狀態快照、文件分頁恢復（小文件）。
- [ADD-002] Block metadata localStorage 持久化、區塊重新命名按鈕。
- [ADD-003] 650 ms debounce 草稿快照（小文件），不等於實體磁碟寫入。
- [ADD-004] 中英文字標籤切換（首批主要操作）。
- [ADD-005] Tab 空格縮排與 Enter 保留縮排。
- [ADD-006] Explorer 基本 Folder 樹、展開、開檔、同 Folder 拖曳排序、可寫時儲存 JSON。

## 4. 程式潛在問題
- 尚未實作 PR15 大檔行號索引持久化。
- Explorer 跨 Folder 實體搬移尚未實作，拖曳時會拒絕並記錄原因。
- Block 的 filename key 在不同路徑同名文件間可能衝突；需要 FileSystemHandle identity。
- 恢復小文件快照不代表取得原檔案寫入權限；大檔內容不會寫入 localStorage。
- 自動草稿 checkpoint 並非可靠的 5 秒內實體文件同步；PR13 尚未通過。
- 多語言僅涵蓋主操作標籤，未涵蓋全部提示文字。

## 5. LCP、INP、CLS 與負載效能
未執行瀏覽器 Lighthouse，故不提供虛構數值。新增操作採事件監聽、650ms 延遲寫入；大型文件不序列化到 localStorage。Explorer 的資料夾展開會掃描子項目，極大目錄仍可能延遲。

## 6. 網路安全風險
瀏覽器 FileSystemHandle 需要授權；JSON 排序檔只能在有寫入權限時建立。使用 textContent 渲染檔名，避免 HTML 注入。LocalStorage 資料不加密，不應儲存敏感文件內容；目前小文件草稿保存到本機瀏覽器儲存，使用者應注意此風險。

## 7. 所需知識點目錄
1. DOM 事件與單一狀態來源；2. File System Access 權限；3. Debounce；4. localStorage 限制；5. Explorer Tree；6. 日誌保留策略。

## 8. 知識點入門說明
**DOM 事件與狀態來源：** 編輯器 UI 只應反映文件模型的狀態。將功能以事件掛接至原有按鈕，能減少舊版 UI 被重寫造成的回歸問題。但事件必須避免形成循環，且非同步更新要考慮文件切換後的過期結果。

**File System Access：** 網頁可取得檔案或資料夾 Handle，但授權由瀏覽器和使用者控制。即使 Handle 被儲存，重新開啟後也可能需要再次授權。不得把本地草稿保存等同於成功覆寫磁碟檔案。

**Debounce：** 使用者連續輸入時，不必每個按鍵都同步寫入儲存空間。Debounce 在短暫停頓後才保存，可降低寫入頻率，但突然斷電時可能遺失最後一小段尚未保存的變更。

**localStorage 限制：** 這是一種簡單同步式鍵值儲存，容量有限且寫入可能阻塞主執行緒。適合小型偏好和短文本快照，不適合 1 GB 文件或大型行號索引。正式大檔索引應改用 IndexedDB 或 OPFS。

**Explorer Tree：** Folder Tree 以節點表示文件與資料夾。展開資料夾時再讀取內容可減少初次載入，但拖曳排序與實體檔案搬移是不同操作，不能混淆；跨資料夾搬移必須先完成安全檢查。

**日誌保留：** 永久保存全部運行日誌可能造成儲存空間耗盡，甚至暴露文件名稱等資訊。可設定保留天數、最大筆數與手動清除命令；正式版應加入匯出與匿名化機制。

## 9. 真實檔案／函數對照
- `BASE/enhancements.js`：snapshot、saveBlocks、restoreBlocks、translate、scan、saveOrder、draw。
- `BASE/cluster-standalone.js`：emit、FileManager.open/select。
- `local-powershell/shell.js`：exec（help、log、log prune、log clear）。

## 10. 參考來源
- https://github.com/codemirror/view/blob/main/src/editorview.ts
- https://github.com/microsoft/vscode-docs/blob/main/docs/editing/getting-started/userinterface.md
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- https://developer.chrome.com/docs/capabilities/web-apis/file-system-access

## 11. PR 測試附件與方法
參考 `PR_Test_Report.md`。僅 JavaScript 靜態語法測試為 PASS，PR10–PR18 真實瀏覽器端到端測試尚未執行，不宣稱通過。
