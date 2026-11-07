# Cluster v0.0.5 opt6｜更新報告

## 0 原始提示詞
繼續：依前次 PR 133/150 驗收修復區塊目錄 UI、開啟即同步與行號置中及上下切片預載。

## 1 部署、驗證、回滾
解壓 ZIP，直接開啟 `index.html` 或執行 `python -m http.server 8080`。建議 localhost/HTTPS 以支援原生 File System Access API。回滾時使用 opt5 ZIP，請先備份未儲存文件。

## 2 修改差異與程式碼標註
- [FIX-PR5] 區塊目錄改回舊版 `block-directory-row`、`block-directory-item`、`block-directory-delete` 結構；刪除 opt3 覆寫 CSS。
- [FIX-PR7] 開啟舊檔優先呼叫 `showOpenFilePicker` 取得可持續讀取的 Handle，立即建立外部監控基準。保留一般 input 備援。
- [FIX-PR8] 行號置中捲動、可見行數計算、鄰近切片預取。

## 3 新增功能
- [ADD-001] FileHandle 可用時，開啟即監控外部修改。
- [ADD-002] 恢復視窗可見時立即檢查外部修改。

## 4 潛在問題
一般 `input[type=file]` 取得的 File 沒有持續存取磁碟的 Handle，不能宣稱外部同步；直接 `file://` 開啟時原生 Picker 可能不可用。對於同時有本地未儲存修改及外部變更的情況，系統保留本地內容並回報衝突，尚無三方合併。

## 5 LCP / INP / CLS 與負載效能
未在真實瀏覽器量測。行號跳轉預取最多三個 250 KiB 切片；原始大檔索引仍可能占用大量記憶體。

## 6 網路安全風險
本地檔案權限須由使用者授權；禁止將文件內容寫入 Log。對外部修改採不覆寫未儲存內容的保護策略。

## 7 知識點目錄
File System Access API、Viewport Virtualization、Line Index、FileHandle 權限。

## 8 知識點入門說明
File System Access API 可在支援的瀏覽器中，經使用者操作取得本地檔案的 Handle。與一般檔案上傳不同，Handle 可再次呼叫 getFile() 取得磁碟上的最新快照，因此可以在開啟文件後輪詢外部變化；但權限可能失效，而且瀏覽器並非全部支援。若使用 input[type=file] 備援，只能取得選取當下的 File 物件，不可假裝已建立外部監控。Viewport Virtualization 是只載入與繪製畫面附近的文字，不把全部大文件渲染到 DOM。行號跳轉時應先利用索引定位切片，再把目標行放在視窗中間，並預取相鄰切片，以降低接下來上下捲動的等待。對大檔案而言，索引記憶體成本與實際文字載入成本必須分開衡量。

## 9 檔案、函數與行號
`BASE/opt1.js`：`updateBlockDirectory`、`clusterGoLine.onclick`、`action.open`、`pollExternal`；`BASE/opt1.css`：舊版 UI 覆寫修正；`BASE/cluster-standalone.js`：可直接開啟的整合版本。行號以交付檔案實際內容為準。

## 10 參考來源
- https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
- https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/getFile
- v0.0.4 opt13.2 原始 UI/CSS

## 11 PR 測試附件與方法
`PR_Test_Report.md`。靜態語法與基礎單元測試獨立記錄，瀏覽器 PR5/7/8 尚待使用者實測。不得把未測試視為 PASS。
