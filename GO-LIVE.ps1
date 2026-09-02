# GO-LIVE.ps1 - Deploy Nexus website to your Niyamstack server
# Run this in PowerShell on your computer

$ErrorActionPreference = "Stop"

Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  NEXUS - Go Live on Niyamstack Server" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "This will connect to your server and install the website."
Write-Host "You need: server IP address, SSH username, and password."
Write-Host ""

$serverIp = Read-Host "Enter your server IP address"
$sshUser = Read-Host "Enter SSH username (usually root or ubuntu)"
$adminPass = Read-Host "Enter admin password for website login" -AsSecureString
$adminPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPass)
)

$projectRoot = $PSScriptRoot
$setupScript = Join-Path $projectRoot "deploy\server-setup.sh"

if (-not (Test-Path $setupScript)) {
    Write-Host "ERROR: deploy\server-setup.sh not found." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "Connecting to ${sshUser}@${serverIp} ..." -ForegroundColor Cyan
Write-Host "You may be asked for your SERVER password (not website password)." -ForegroundColor Yellow
Write-Host ""

$envVars = "ADMIN_USERNAME=NexusITAcademy ADMIN_PASSWORD=$adminPassPlain SESSION_SECRET=nexus-live-$(Get-Random)"

# Copy setup script to server and run it
scp "$setupScript" "${sshUser}@${serverIp}:/tmp/nexus-setup.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not copy files. Check IP, username, and server password." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

ssh "${sshUser}@${serverIp}" "chmod +x /tmp/nexus-setup.sh && $envVars bash /tmp/nexus-setup.sh"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment finished!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Website: https://nexusitacad.niyamstack.com/" -ForegroundColor White
Write-Host "  Admin:   https://nexusitacad.niyamstack.com/admin/" -ForegroundColor White
Write-Host ""
Write-Host "  Admin ID: NexusITAcademy" -ForegroundColor White
Write-Host ""
Write-Host "If site does not open yet, ask Niyamstack to point" -ForegroundColor Yellow
Write-Host "nexusitacad.niyamstack.com to this server IP: $serverIp" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to close"
