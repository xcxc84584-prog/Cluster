# Cluster v0.0.5 opt13｜水平捲軸原生化

## 0. 使用者提示詞
「pass,但是UI滑動的設計能否做成和滑動y軸一樣?」

## 1. 部署、驗證與回滾
解壓 ZIP 並依原本 Cluster 靜態網站部署方式使用。回滾為 opt12 完整 ZIP。

## 2. 修改差異
[MOD-EPR1-002] 移除 X 軸額外滑桿、數字、定時器；改用 textarea 原生水平捲軸。CSS X/Y 同樣 10px 寬度與色系。

## 3. 新增功能
原生水平捲軸會自動依文字寬度改變滑塊比例，支援滑鼠拖動、觸控板、Shift+滾輪（視瀏覽器而定）。

## 4. 潛在問題
各瀏覽器/作業系統可能採用隱藏式 overlay 捲軸；這與原生 Y 軸行為一致。部分超大檔虛擬逐行編輯器仍由其自身實作決定捲動行為。

## 5. LCP / INP / CLS / 負載效能
移除 500ms 輪詢、MutationObserver 與滑桿測量；理論上減少主執行緒負擔，未量測真實 LCP/INP/CLS。

## 6. 安全
未新增外部 API、網路權限或儲存機制；不修改編輯文字內容。

## 7. 知識點
CSS overflow、textarea wrap=off、scrollbar-width、::-webkit-scrollbar、原生捲動。

## 8. 入門說明
瀏覽器的 textarea 同時具有水平和垂直捲動能力。當 wrap=off 且文字寬度大於可視寬度時，瀏覽器可顯示水平捲軸。先前 opt12 用 input[type=range] 模擬水平捲動，滑桿外觀與 Y 軸不同，且需要持續計算 scrollWidth 和 scrollLeft。本版交回瀏覽器處理，減少狀態同步和額外事件，並讓 X/Y 的外觀統一。行號每一邏輯行對應固定高度，仍須確保禁止自動折行。

## 9. 實際檔案對照
- `BASE/style.css`：結尾 [MOD-EPR1-002] 原生捲軸樣式。
- `PLUGIN/HorizontalAxis/horizontal-axis.js`：第 1–17 行，設定 wrap=off。
- `PLUGIN/HorizontalAxis/manifest.json`：版本 1.1.0。

## 10. 參考來源
- MDN CSS overflow: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow
- MDN textarea wrap: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea
- CodeMirror: https://github.com/codemirror/view

## 11. PR 測試
JavaScript 語法與 ZIP 完整性 PASS。真實瀏覽器視覺/操作測試 NOT RUN，需使用者驗收。
