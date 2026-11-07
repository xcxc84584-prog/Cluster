# Cluster v0.0.6 opt4 — 文件獨立進度與合併後 Window 重載修正

## 基底
以 v0.0.6 opt3 CrossLine Patch 為直接修正基底，保留其 v0.0.5 opt14 的來源結構。

## 變更
- 每份 SegmentDocument 持有獨立 saveState（kind、detail、progress）。
- status 只在該文件為目前 active 時更新右下角 UI；切換頁籤時讀取該文件自己的狀態。
- 單文件 saveBusy 防止重複進入儲存管線；不同文件可保有各自狀態。
- 合併提交完成後，等待進行中的索引工作，清空舊索引與快取，重置 Window 起點與 render token，再重新建立新文件索引。
- 索引重建使用 indexPromise 單一執行任務，避免 render 重入重複索引。

## 狀態
綠：原始文件同步；黃：V 已記錄但未合併、或正在合併；紅：V 失敗或提交衝突。

## 已驗證
- `node --check BASE/cluster-standalone.js`：PASS。

## 未驗證與限制
- 尚未完成瀏覽器實測、1GB 壓力測試；不能保證完全排除崩潰。
- 目前仍以完整 lineStarts 陣列建立行索引，大量短行文件可能佔用顯著記憶體。
- 跨 Window 重疊編輯及行號動態重定位仍未完成。
- V Journal 仍在 IndexedDB，未實作獨立實體 V 檔。
