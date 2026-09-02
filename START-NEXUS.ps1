# Nexus IT Academy - One-click start (no tech knowledge needed)
# Just run this file in PowerShell, or double-click START-NEXUS.bat

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step($msg) {
    Write-Host ""
    Write-Host ">> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "   OK: $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "   NOTE: $msg" -ForegroundColor Yellow
}

Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  NEXUS IT ACADEMY - Website Starter" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Check Node.js
Write-Step "Checking Node.js (needed to run the website)..."

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Warn "Node.js is not installed yet."
    Write-Host ""
    Write-Host "   Installing Node.js automatically (this may take 2-3 minutes)..." -ForegroundColor Yellow
    Write-Host "   If a popup asks permission, click Yes / Allow." -ForegroundColor Yellow
    Write-Host ""

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    } else {
        Write-Host ""
        Write-Host "   Please install Node.js from: https://nodejs.org" -ForegroundColor Red
        Write-Host "   Download the LTS version, install it, then run this script again." -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to close"
        exit 1
    }

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Host ""
        Write-Host "   Node.js installed! Please CLOSE this PowerShell window," -ForegroundColor Yellow
        Write-Host "   open a NEW PowerShell, and run START-NEXUS.bat again." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to close"
        exit 0
    }
}

Write-Ok ("Node.js " + (node -v))

# Step 2: Install packages (first time only)
Write-Step "Checking website files..."

if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "   First-time setup - downloading packages (1-2 minutes)..." -ForegroundColor Yellow
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}
Write-Ok "All packages ready"

# Step 3: Create .env with your login (if missing)
Write-Step "Setting up admin login..."

$envFile = "$ProjectRoot\.env"
$envContent = @(
    "PORT=3000"
    "NODE_ENV=development"
    "LOCAL_DEV=true"
    "PUBLIC_URL=http://localhost:3000"
    "ADMIN_USERNAME=NexusITAcademy"
    "ADMIN_PASSWORD=GaurHari@109"
    "SESSION_SECRET=nexus-niyamstack-prod-secret-2026"
) -join "`n"
Set-Content -Path $envFile -Value $envContent -Encoding ASCII -NoNewline
Add-Content -Path $envFile -Value "" -Encoding ASCII
Write-Ok "Admin login ready"

# Step 4: Stop old copy if running
Write-Step "Starting website..."

try {
    $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Ok "Stopped old copy"
    }
} catch {
    # ignore
}

# Step 5: Start server
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $ProjectRoot -WindowStyle Hidden
Start-Sleep -Seconds 3

# Check if server is up
try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 10
    Write-Ok "Website is running!"
} catch {
    Write-Host ""
    Write-Host "   Could not start website. Try running as Administrator." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

# Step 6: Open browser
Write-Step "Opening your website in browser..."

Start-Process "http://localhost:3000/"
Start-Sleep -Seconds 1
Start-Process "http://localhost:3000/admin/"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DONE! Your website is running." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Website:  http://localhost:3000/" -ForegroundColor White
Write-Host "  Admin:    http://localhost:3000/admin/" -ForegroundColor White
Write-Host ""
Write-Host "  Admin ID:       NexusITAcademy" -ForegroundColor White
Write-Host "  Admin Password: GaurHari@109" -ForegroundColor White
Write-Host ""
Write-Host "  Live site (after Niyamstack setup):" -ForegroundColor Gray
Write-Host "  https://nexusitacad.niyamstack.com/" -ForegroundColor Gray
Write-Host "  https://nexusitacad.niyamstack.com/admin/" -ForegroundColor Gray
Write-Host ""
Write-Host "  Keep this window open while using the website." -ForegroundColor Yellow
Write-Host "  To stop: close this window or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to close (website keeps running in background)"
