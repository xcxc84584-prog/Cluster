# Cluster v0.0.5 opt12｜EPR1 水平 X 軸與行號防飄移

## 0 使用者提示詞
EPR1 (100分): 行號出現飄移問題，初步推斷為過長文本自動換行導致，增加可移動式 x 軸，參考 GitHub。

## 1 部署、驗證與回滾
完整解壓 ZIP，使用 `python -m http.server 8080`，瀏覽 `/BASE/`。回滾使用 opt11 ZIP；本版不修改用戶文件格式。

## 2 修改內容
[FIX-EPR1-001] `BASE/style.css`：禁用 textarea 軟換行，讓 gutter 行號與文字邏輯行一對一。保留既有 UI。

## 3 新增內容
[ADD-EPR1-001] `PLUGIN/HorizontalAxis/horizontal-axis.js`：可拖動 X 軸，監控水平捲動與可視寬度；[ADD-EPR1-002] `BASE/style.css`：深色水平滑桿。

## 4 代碼潛在問題
textarea.scrollWidth 的量測可能在極端長行下昂貴；每 500ms 檢查顯示中的編輯器。虛擬大文件的每行 textarea 仍使用各自的原生 X 捲動。

## 5 效能
預期換行禁用後邏輯行高固定，減少 gutter 飄移；LCP/INP/CLS 未以真實瀏覽器測量，無法宣稱改善。負載效能曲線尚未實測。

## 6 安全性
新增 Plugin 無網路存取、無文件寫入、不存取敏感資料；保留既有自動存儲邏輯。

## 7 知識點目錄
CSS `white-space:pre`、`scrollLeft`、`scrollWidth`、`clientWidth`、`MutationObserver`、`requestAnimationFrame`。

## 8 知識點入門說明
`white-space:pre` 使瀏覽器保留原始換行而不依容器寬度自動折行，因此文字與行號可以採用固定行高。`scrollWidth` 表示可捲動內容寬度，`clientWidth` 是可見寬度，兩者差值就是可移動的 X 軸範圍。滑桿修改 `scrollLeft`，文字編輯區的水平捲動事件則回寫滑桿位置。`requestAnimationFrame` 合併密集 UI 更新，減少重複繪製。

## 9 真實檔案與函數座標
- `PLUGIN/HorizontalAxis/horizontal-axis.js`: `update()`、`schedule()`；使用 `rg -n` 查詢精確行號。
- `BASE/style.css`: [FIX-EPR1-001]、[ADD-EPR1-002]。

## 10 參考來源
- https://github.com/codemirror/view/blob/main/src/editorview.ts
- https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IEditorOptions.html

## 11 PR 測試附件
參考 `PR_Test_Report.md`。實機 EPR1 尚未驗收，不預先計分。
