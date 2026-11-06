# Allow Fundora LAN access (ports 5173 + 3000) on Private Wi-Fi.
# Right-click → Run with PowerShell as Administrator, or approve UAC when prompted.
$ErrorActionPreference = "Stop"

Get-NetFirewallRule -DisplayName "Node.js JavaScript Runtime" -ErrorAction SilentlyContinue | ForEach-Object {
  $app = $_ | Get-NetFirewallApplicationFilter
  if ($_.Action -eq "Block" -and "$($_.Profile)" -match "Private" -and $app.Program -like "*\nodejs\node.exe") {
    Disable-NetFirewallRule -Name $_.Name
    Write-Host "Disabled Node.js Private BLOCK: $($_.Name)"
  }
}

$allowName = "Fundora Node Private Allow"
if (-not (Get-NetFirewallRule -DisplayName $allowName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $allowName -Direction Inbound -Action Allow `
    -Program "C:\Program Files\nodejs\node.exe" -Protocol TCP -Profile Private | Out-Null
  Write-Host "Created: $allowName"
} else {
  Enable-NetFirewallRule -DisplayName $allowName
  Write-Host "Enabled: $allowName"
}

$portName = "Fundora LAN Ports 5173 3000"
if (-not (Get-NetFirewallRule -DisplayName $portName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $portName -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort 5173,3000 -Profile Private | Out-Null
  Write-Host "Created: $portName"
} else {
  Enable-NetFirewallRule -DisplayName $portName
  Write-Host "Enabled: $portName"
}

Write-Host ""
Write-Host "Done. On another device open:"
Write-Host "  http://$((Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -and $_.IPAddress -notlike '169.*' }).IPAddress):5173"
Write-Host "  http://$((Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -and $_.IPAddress -notlike '169.*' }).IPAddress):3000"
pause
