# Cluster v0.0.6 opt2 — Window 滾動與 V 合併進度

## 基底
使用 `Cluster_v0.0.5_opt14(5).zip` 衍生的 `v0.0.6 opt1` V Journal 原型；未使用其他版本代替。

## 修改
1. `BASE/v-journal.js`：狀態精簡為「已同步／待同步／失敗衝突」、進度條與百分比；嵌入既有 footer 的 `#notice` 旁。
2. `BASE/style.css`：移除獨立浮動狀態框，紅黃綠狀態配色，窄螢幕縮排。
3. `BASE/cluster-standalone.js`：大型文件在 textarea 上下邊界滑動時切換 160 行 Window（每次約 80 行），保留行跳轉。
4. `BASE/cluster-standalone.js`：大型文件 V 視窗整合成不重疊 byte-range patches，顯示準備／寫入／提交階段進度。

## 重要限制
- 大文件只支援**不改變行數**、且不重疊的 Window 操作安全整合；跨行新增刪除、重疊修改仍會阻止正式儲存。V 仍留在 IndexedDB。
- Window 滾動為 textarea 邊界觸發的邏輯換頁，不是具有全文件捲軸比例的完整虛擬滾動；單行過長、換行顯示與 IME 邊界情況仍需實測。
- 現有 V Journal 仍採整個 Window 文字快照，尚未實現真正的 CRUD 操作 WAL 與跨 Window 座標轉換。
- 進度代表 Blob 串流寫入與提交階段，不代表物理磁碟落盤比例。
- 使用者在不同瀏覽器或清除 IndexedDB 後，V 無法自動恢復。

## 驗證
- `node --check BASE/cluster-standalone.js`：PASS
- `node --check BASE/v-journal.js`：PASS
- 瀏覽器端 UI / 1 GiB 實測：NOT RUN

## 本地部署
解壓 ZIP，於包含 `index.html` 的目錄執行 `python -m http.server 8765`，開啟 `http://localhost:8765/`。先用測試文件驗證，勿直接覆寫重要資料。
