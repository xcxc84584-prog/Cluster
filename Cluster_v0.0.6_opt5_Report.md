# Cluster v0.0.6 opt5 — 英文模式動態文字修正

## 基底
使用 `Cluster_v0.0.6_opt4_PerFile_Status_WindowFix.zip` 的解壓版本作為基底，保留 V Journal、Window 與儲存狀態程式。

## 問題
原有 `PLUGIN/I18n/i18n.js` 以固定選擇器及首次讀取文字進行翻譯；Explorer、Blocks 的動態文字未完整列入翻譯範圍。重新渲染後會顯示中文。

## 修改
- `PLUGIN/I18n/dynamic-i18n.js`：新增動態 UI 文字翻譯適配層，支援雙向翻譯、Blocks 動態數量與動態提示；MutationObserver 僅監控 Explorer、Blocks、空白畫面及少量應用介面，不監控編輯器內容。
- `BASE/index.html`：於原本 I18n 腳本後載入新增模組。
- 不修改使用者文件內容、V Journal、儲存管線。

## 英文對應
- `尚未載入工作區 · 按 ＋ 加入本地資料夾` → `No workspace loaded · Press + to add a local folder`
- `0 個區塊` → `0 Blocks`
- `目前文件沒有區塊` → `No blocks in the current file`
- `選擇「檔案」建立或開啟文件` → `Choose File to create or open a document`
- `就緒` → `Ready`

## 驗證
- `node --check PLUGIN/I18n/dynamic-i18n.js`：PASS。
- `node --check PLUGIN/I18n/i18n.js`：PASS。
- 英文／中文實際切換及 Explorer/Blocks 互動：尚未在瀏覽器實測。

## 限制
- 此版修正已知的 UI 字串，不保證涵蓋整個專案的所有錯誤訊息與對話框。
- 後續建議把 UI 字串集中到穩定 `data-i18n` key 的雙語字典，逐步淘汰以文字匹配為基礎的翻譯。
