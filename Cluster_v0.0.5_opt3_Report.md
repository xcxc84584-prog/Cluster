# Cluster v0.0.5 opt3 更新報告

## 0. 使用者原始提示詞
PR1、2、3、4、8、9 pass；PR5 0 分，改由「建立區塊」UI 測試；PR6 30 分，未測多個大檔；PR7 0 分，外部編輯未同步。

## 1. 部署、驗證與回滾
在解壓根目錄執行 `python -m http.server 8080`，開啟 `/BASE/`；PowerShell 位於 `/local-powershell/`。回滾請保留原版本資料夾並切換服務根目錄。

## 2. 修改內容
[MOD-001] BASE/index.html 啟用原本保留的區塊目錄與建立區塊按鈕。
[MOD-002] BASE/opt1.css 保留舊版外觀並增加區塊行號標記。
[MOD-003] PLUGIN/FileManager/file-manager.js 儲存後更新 File 物件，避免外部變更判定使用過期版本。

## 3. 新增內容
[ADD-001] BASE/opt1.js 區塊建立 Dialog、命名、顯示、定位、查看、刪除；BlockID 於文件工作階段內固定。
[ADD-002] BASE/opt1.js 2.5 秒外部檔案輪詢；無本地未存修改時重新載入；衝突時停止覆寫並回報。
[ADD-003] PLUGIN/SegmentLoader/segment.js 小檔編輯後區塊座標更新。

## 4. 潛在問題
區塊尚未永久寫入文件旁 JSON；大型文件區塊修改與編輯中快取仍有侷限。外部同步需 File System Access API 和已授權的 Handle；非 Handle 選檔無法自動同步。外部同步是單向重新載入，不是 PR7 完整雙向合併。多個 1GB 文件尚未實測。

## 5. LCP/INP/CLS 與負載效能
未進行實際瀏覽器量測。外部輪詢每 2.5 秒一次，對多文件數量的效能尚待驗證；避免一次性全文載入的分片設計維持不變。

## 6. 網路安全風險
不提供遠端檔案存取。檔案權限由瀏覽器控制。Log 可能包含文件名稱及區塊內容，不應公開分享；目前 localStorage 不加密。

## 7. 知識點目錄
File System Access API；File.lastModified；Anchor 行號更新；單一狀態來源；衝突偵測。

## 8. 入門說明
**File System Access API**：瀏覽器在使用者授權後可保留檔案 Handle。重新呼叫 `getFile()` 可以取得目前磁碟版本，藉由修改時間與大小判斷是否變更。此能力依瀏覽器及執行來源而異，不能對所有 `input[type=file]` 選取的文件假設具備原路徑存取能力。

**Anchor 更新**：使用固定 BlockID 代表區塊身分，起訖行號只是當下位置。編輯插入或刪除換行時，需要更新座標。簡單的前後共同區段推算能處理部分情況，但複雜多點編輯仍需更完整的交易模型。

**衝突偵測**：當外部磁碟文件與編輯器內未儲存內容同時變更時，不可直接覆蓋任一方。應保留兩個版本並要求使用者選擇合併或另存。第一版僅偵測並輸出 Log，沒有三方合併。

## 9. 真實檔案與函數
BASE/opt1.js：`updateBlockDirectory`、`getBlockContent`、`pollExternal`；PLUGIN/SegmentLoader/segment.js：`syncSmallBlocks`；PLUGIN/FileManager/file-manager.js：`save`。

## 10. 參考資料
MDN File System Access API；MDN File.lastModified；原 Cluster v0.0.4 opt13.2 UI。

## 11. PR 測試附件
參考 `PR_Test_Report.md`。單元測試 PASS，瀏覽器整合及大型文件測試 NOT RUN。
