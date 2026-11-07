# Cluster Terminal｜一次安裝教學（Windows）

## 首次安裝（只需一次）

1. 安裝 [Node.js LTS](https://nodejs.org/en/download)（含 npm）。
2. 在 [Cluster 網頁](https://xcxc84584-prog.github.io/Cluster/) 開啟 Terminal，點擊 **下載一次性安裝程式**，取得 `Install-Cluster-Terminal.cmd`。
3. **先確認** GitHub 的程式碼可信，再雙擊 `.cmd`，選擇 Y。Windows 可能顯示未簽署檔案警告；不確定時不要執行。
4. 安裝程式從公開 GitHub `main` 下載原始碼，將 Agent 安裝在 `%LOCALAPPDATA%\ClusterTerminalAgent\app`，執行 `npm install`，在 Windows 使用者 Startup 建立捷徑，並立即嘗試啟動。
5. 安裝視窗顯示 `PAIRING TOKEN`（64 位十六進位字元），複製至網頁 Terminal，勾選 **Remember pairing**，按 **Connect**。
6. 首次綁定工作區時輸入對應的 Windows 絕對資料夾路徑；後續可沿用。

## 日常使用

登入 Windows → 開啟 Cluster → 點 Terminal。**不必再手動開啟外部 PowerShell**。若無法連線，先確認 Windows Startup 是否啟動 Agent。

## 快速命令（已下載 opt9 ZIP）

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Cluster_v0.0.6_opt9_Terminal_Installer.zip" "$env:USERPROFILE\Downloads\Cluster-opt9" -Force
& "$env:USERPROFILE\Downloads\Cluster-opt9\agent_terminal\install-once.ps1"
```

若 PowerShell 阻擋腳本，使用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Cluster-opt9\agent_terminal\install-once.ps1"
```

## 重新安裝與升級

安裝程式遇到舊 Agent 占用 `127.0.0.1:43879` 時會拒絕覆寫，請先停止舊 Agent，再重跑安裝程式。不要終止其他 Node.js 專案。

## 解除安裝

刪除 Startup 裡的 `Cluster Terminal Agent.lnk`，停止 Agent，刪除 `%LOCALAPPDATA%\ClusterTerminalAgent`。刪除前請先備份需要的設定；這會移除配對 Token。

## 安全與限制

- 本地 Agent 以目前 Windows 帳號權限執行，具有執行命令的能力。
- GitHub Pages 無法直接安裝本機程式，首次需要使用者執行安裝程式。
- `Remember pairing` 會把憑證存入瀏覽器 localStorage，僅建議私人可信任電腦使用。
- 安裝腳本下載 GitHub `main` 的**當時最新內容**，不是經雜湊固定的版本。請先檢查程式碼，勿在不可信網路或來源執行。
- Agent 限制 localhost、指定 HTTPS origin 與配對 Token；但不等於零風險。
- Windows 真機安裝、開機自啟動及 node-pty 尚待實測。
