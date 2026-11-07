# Cluster v0.0.5 opt14｜sPR1 修復報告

## 0. 使用者提示詞
請你提交opt14，嘗試通過測試。

## 1. 部署、驗證與回滾
解壓 ZIP 至新的專案目錄，以 HTTP 服務提供 `BASE/index.html`。用原始 `scriptPR1_version4` 在 Windows Chromium 執行 200 份文件的完整回歸測試。回滾方式：還原原版 opt13 ZIP；不要覆蓋舊版發布物。

## 2. 本次修改內容
[FIX-PR1-001] `BASE/cluster-standalone.js` → `SegmentDocument.getLines()`：修正以最後一個已知換行索引錯誤決定讀取結尾的問題。當請求行範圍超過最後一個換行索引時，使用 `this.size`（EOF），不再讀取 `end+1` 位元組。避免大型單行文件只讀到首位元組。

## 3. 本次增加內容
未新增對外功能；僅增加程式碼修復註記。

## 4. 代碼潛在問題
大型文件的全行讀取仍可能造成 textarea 大量配置。`getLines` 仍採行號陣列索引，其他索引邊界情境需額外測試。多分頁反覆重建 DOM 可能有成本。

## 5. 網頁效能分析
未在可用環境完成瀏覽器實測，因此 LCP、INP、CLS 與負載曲線均標示 NOT TESTED；不可宣稱改善幅度。

## 6. 網路安全性
本修復不新增網路端點；仍須檢查既有插件的命令權限、敏感日誌與本地檔案操作。此版本未進行安全滲透測試。

## 7. 知識點目錄
File/Blob slice、TextDecoder、EOF、行號索引、Playwright 回歸測試。

## 8. 知識點簡述
**EOF 與行號索引：** 文本的換行索引通常只儲存每一行的起點。對於完全沒有換行符號的文件，索引可能只有 `0`，但文件仍然可能有數百 KiB。讀取一段行範圍時，如果沒有下一行的起點，正確的結束位移是文件大小（EOF），而不是最後一個已知行起點。`Blob.slice(start,end)` 的 end 是不包含的上界，因此使用 EOF 可以準確取得最後一行的全部內容。回歸測試應包含沒有換行的單行文件、末尾有換行的文件、多行文件，以及跨切片邊界的文件。此處修正只處理讀取邊界，不等於已完成所有行號索引的驗證。

## 9. 程序檔案與函數座標
`BASE/cluster-standalone.js` → `SegmentDocument.getLines`，標註 `[FIX-PR1-001]`。實際行號以解壓後檔案搜尋標註為準。

## 10. 參考資料
隨使用者提供的 `scriptPR1_version4(1).zip`、`PRex.md`、`sGWMP_v1.1.0(10).md` 與 opt13 原始碼。

## 11. PR 測試附件與方法
- 原始使用者回報：`successful=140/200 score=70.00/100 status=FAIL`（opt13）。
- opt14 JavaScript 語法：PASS（`node --check`）。
- opt14 完整 sPR1：NOT RUN。嘗試使用本機 Chromium/Playwright 進行測試，但瀏覽器對 localhost 回報 `ERR_BLOCKED_BY_ADMINISTRATOR`，無法取得可信的 200/200 結果。
- opt14 FPR 中英文 UI：NOT RUN（未修改 UI）。
- opt14 FPR LOG REPORT：NOT RUN。
- opt14 FPR Dependency Analysis：局部靜態檢查已做；新舊兩層完整相依圖 NOT RUN。
- 驗收狀態：PENDING，需在可執行環境以原始腳本重測。
