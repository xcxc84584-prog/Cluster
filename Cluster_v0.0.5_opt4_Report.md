# Cluster v0.0.5 opt4 更新報告

## 0. 原始提示詞
「點按檔按完全沒有反應」，承接 opt3 開檔失敗回報。

## 1. 部署、驗證與回滾
在專案根目錄 `python -m http.server 8080`，開啟 `/BASE/`。選擇「檔案 → 開啟舊檔」，檢查選檔視窗、文字與分頁。失敗則回滾 opt2。

## 2. 修改差異與程式碼標註
[FIX-001] `BASE/opt1.js` action.open 改為直接同步呼叫原生 input.click()，避免非同步檔案選取器失敗後退回流程喪失使用者啟動權限。

## 3. 新增功能與標註
[ADD-001] 開檔請求、開檔成功與開檔失敗日誌；逐檔捕捉例外。

## 4. 代碼潛在問題
未取得 FileSystemFileHandle 的檔案不能自動觀測外部磁碟修改；大型檔案行號索引仍有記憶體風險。

## 5. LCP / INP / CLS 與負載效能
本版沒有真實瀏覽器效能量測，不提供虛構數字；開檔流程只改 UI 事件路徑。

## 6. 網路安全風險
原生選檔需要使用者互動；選檔不等於授權任意本機路徑讀寫。Log 不應記錄文件完整內容。

## 7. 知識點目錄
使用者啟動權限、檔案選取器、非同步例外、回歸測試。

## 8. 知識點入門說明
瀏覽器的檔案選取介面通常需要直接由使用者點擊等操作觸發。如果先等待其他非同步流程，再嘗試打開檔案視窗，可能因瀏覽器安全規則而遭拒絕。這次修正採用隱藏的 input[type=file]，在點擊事件中立即呼叫 click()。選擇完成後，onchange 事件才依序處理檔案，因此開啟流程的使用者互動與實際載入被清楚分離。這個設計能減少跨瀏覽器差異，但不保證所有瀏覽器與本機檔案環境完全相同。

## 9. 真實檔案／函數／行號對照
`BASE/opt1.js`：`action.open` 與 `fileInput.onchange`；實際行號請以檔案搜尋定位。

## 10. 參考來源
MDN HTMLInputElement.click()、File API；專案 opt2/opt3 原始碼。

## 11. PowerShell PR 測試附件與方法
`node --check BASE/opt1.js`；`node tests/smoke.mjs`；`node tests/gutter-regression.mjs`。結果均 PASS。實際瀏覽器開檔 NOT RUN。
