# Cluster v0.0.6 opt9｜一次安裝 Terminal 報告

## 目標
一次安裝後，登入 Windows 自動啟動本地 Agent；開啟 GitHub Pages 的 Cluster 即可使用 PowerShell。

## 變更
- 網頁 Terminal 安裝教學、`.cmd` 下載連結、Markdown 操作手冊。
- 一次性安裝腳本：安裝到 LOCALAPPDATA、npm 安裝、建立 Startup 捷徑、立即背景啟動、顯示配對 Token。
- 網頁可下載的 bootstrap `.cmd`，從公開 GitHub main 下載已部署的 Agent 安裝程式。
- 監聽埠已被占用時顯示清楚提示，而不是未處理例外。

## 風險及驗收
- GitHub main 上須先部署 opt9，網頁的 bootstrap 才能下載安裝程式。
- 首次需安裝 Node.js，手動執行安裝程式並配對；無法由純網頁靜默安裝。
- 現有 opt8 Agent 運行時應先停止，再升級；不自動終止程序。
- 已執行靜態語法與檔案完整性檢查；Windows 真機功能尚未驗證。
