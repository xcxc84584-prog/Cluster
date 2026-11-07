# Cluster v0.0.5 opt2｜PR1 行號欄修復

## 0. 原始提示詞
「15分(2,3,4 pass),PR1:UI介面出現多重數字問題」，附畫面顯示行號「1 2 3」、「4 5 6」擠在同一列。

## 1. 部署、驗證與回滾
解壓 ZIP，在專案根目錄執行 `python -m http.server 8080`，開啟 `http://127.0.0.1:8080/BASE/`。如需回滾，使用原 opt1 ZIP 重新部署。

## 2. 修改差異與程式碼標註
- `[FIX-001]` `BASE/opt1.js`：以每行一個 `span.line-number` 取代純文字 `\n` 連接的行號；小檔編輯後更新行號數量。
- `[FIX-002]` `BASE/opt1.css`：強制每個行號佔獨立行，固定高度與行距，沿用舊版樣式。

## 3. 新增功能與標註
新增 `tests/gutter-regression.mjs`，靜態驗證行號 DOM 和 CSS 防回歸規則；不新增 UI 控件。

## 4. 潛在問題
目前小檔行號渲染上限 5000 行；換行與字體、軟換行可能造成超長行視覺行數和物理行數不同。大型文件測試尚未完成。

## 5. 效能分析
只更新行號 DOM；小檔最多 5000 個 span，可能比文字節點有較高 DOM 成本。LCP/INP/CLS 尚未在瀏覽器測量。

## 6. 網路安全
本次變更不新增網路請求。行號以 `textContent` 插入，不解析使用者輸入為 HTML。

## 7. 知識點目錄
CSS `white-space`、DOM `textContent`、`DocumentFragment`、文字行與視覺行。

## 8. 知識點入門說明
`white-space:normal` 會將 HTML 文字節點內的換行當成可折疊空白，因此用 `1\n2\n3` 指定行號，不代表瀏覽器一定畫出三行。更可靠的方式是為每個實體行號建立獨立元素，搭配 `display:block` 和固定行高。`DocumentFragment` 可先在記憶體中組合多個行號節點，再一次性替換容器內容，減少逐一操作造成的重排風險。此方法也讓後續區塊標記能針對個別行號加入樣式。要注意原生 textarea 的軟換行可能讓一個實體行顯示為多個視覺行，因此超長行的對齊仍需獨立驗證。

## 9. 真實檔案、函數與行號
- `BASE/opt1.js`：`renderGutter`、`refreshSmallGutter`、`render`、`editor input`。
- `BASE/opt1.css`：末尾 `[FIX-002]` 規則。
- `tests/gutter-regression.mjs`：靜態回歸測試。

## 10. 參考來源
舊版 `BASE/style.css` 原始行號樣式、使用者提供的錯誤截圖。

## 11. PR 測試
- 使用者驗收：PR2、PR3、PR4 = PASS，合計 15/150。
- opt2：JavaScript 語法檢查與靜態行號回歸測試依實際執行結果。
- PR1 實際瀏覽器畫面：NOT RUN，待使用者重新驗收。
