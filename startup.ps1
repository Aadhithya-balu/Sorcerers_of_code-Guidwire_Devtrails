#!/usr/bin/env pwsh
$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$currentUser = $env:USERNAME

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  RakshitArtha Complete System Startup" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# ============ ENVIRONMENT SETUP ============
Write-Host "Setting up environment variables..." -ForegroundColor Yellow
$env:ANDROID_HOME = "C:\Users\$currentUser\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\$currentUser\AppData\Local\Android\Sdk"
$env:GRADLE_USER_HOME = "C:\Users\$currentUser\.gradle"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;$env:ANDROID_HOME\emulator;$env:PATH"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "OK: Environment variables set (User: $currentUser)" -ForegroundColor Green
Write-Host "  - ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Gray
Write-Host ""

# ============ KILL OLD PROCESSES & CLEAN PORTS ============
Write-Host "Stopping old processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process gradle -ErrorAction SilentlyContinue | Stop-Process -Force

# Clean up ports
Write-Host "Cleaning up ports (5000, 3000, 8081)..." -ForegroundColor Yellow
$ports = @(5000, 3000, 8081)
foreach ($port in $ports) {
    $netstatOutput = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    if ($netstatOutput) {
        $pids = $netstatOutput -split '\s+' | Where-Object {$_ -match '^\d+$'} | Get-Unique
        foreach ($pid in $pids) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  - Killed process on port $port (PID: $pid)" -ForegroundColor Yellow
            } catch {}
        }
    }
}

Write-Host "OK: Old processes stopped" -ForegroundColor Green
Start-Sleep -Seconds 2
Write-Host ""

# ============ START INSURANCE BACKEND ============
Write-Host "Starting Insurance Backend (Port 5000)..." -ForegroundColor Cyan
$insurancePath = Join-Path $projectRoot 'Backend\insurance-module'
Start-Process powershell -WorkingDirectory $insurancePath -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal
Write-Host "OK: Insurance Backend started in new window" -ForegroundColor Green
Start-Sleep -Seconds 4
Write-Host ""

# ============ START AUTOMATION BACKEND ============
Write-Host "Starting Automation Backend (Port 3000)..." -ForegroundColor Cyan
$automationPath = Join-Path $projectRoot 'automation-system'
Start-Process powershell -WorkingDirectory $automationPath -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal
Write-Host "OK: Automation Backend started in new window" -ForegroundColor Green
Start-Sleep -Seconds 4
Write-Host ""

# ============ START FRONTEND DEV SERVER (METRO) ============
Write-Host "Starting Frontend Dev Server (Metro on Port 8081)..." -ForegroundColor Cyan
$frontendPath = Join-Path $projectRoot 'FRONTEND'
Start-Process powershell -WorkingDirectory $frontendPath -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal
Write-Host "OK: Metro dev server started in new window" -ForegroundColor Green
Start-Sleep -Seconds 5
Write-Host ""

# ============ SETUP ADB TUNNELS ============
Write-Host "Setting up ADB reverse tunnels..." -ForegroundColor Yellow
if (-not (Test-Path $adb)) {
    Write-Host "WARN: ADB not found at $adb. Skipping ADB setup." -ForegroundColor Yellow
} else {
    try {
        & $adb start-server 2>&1 | Out-Null
        $deviceLines = & $adb devices | Select-String -Pattern "device$"
        if ($deviceLines.Count -gt 0) {
            Write-Host "Found Android device(s). Configuring tunnels..." -ForegroundColor Green
            & $adb reverse tcp:8081 tcp:8081 2>&1 | Out-Null
            & $adb reverse tcp:5000 tcp:5000 2>&1 | Out-Null
            & $adb reverse tcp:3000 tcp:3000 2>&1 | Out-Null
            Write-Host "OK: ADB tunnels configured" -ForegroundColor Green
        } else {
            Write-Host "WARN: No Android device detected" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "WARN: ADB setup failed" -ForegroundColor Yellow
    }
}
Write-Host ""

# ============ BUILD & DEPLOY APP ============
Write-Host "Attempting to deploy app (Optional)..." -ForegroundColor Cyan
$frontendPath = Join-Path $projectRoot 'FRONTEND'
if (Test-Path $adb) {
    $deviceLines = & $adb devices | Select-String -Pattern "device$"
    if ($deviceLines.Count -gt 0) {
        Write-Host "Running: npx react-native run-android" -ForegroundColor Yellow
        Push-Location $frontendPath
        npx react-native run-android --no-packager
        Pop-Location
    }
}

Write-Host "====================================================" -ForegroundColor Green
Write-Host "  SYSTEM READY AND RUNNING" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Started:" -ForegroundColor Cyan
Write-Host "  1. Insurance Backend (5000)" -ForegroundColor Gray
Write-Host "  2. Automation Backend (3000)" -ForegroundColor Gray
Write-Host "  3. Metro Dev Server (8081)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop: CTRL+C in the windows or 'Get-Process node | Stop-Process -Force'" -ForegroundColor Yellow
