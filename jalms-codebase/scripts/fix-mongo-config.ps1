# Check for Admin privileges
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Please run this script as Administrator!" -ForegroundColor Red
    exit
}

$ConfigPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg"

if (!(Test-Path $ConfigPath)) {
    Write-Host "Config file not found at $ConfigPath" -ForegroundColor Red
    exit
}

$ConfigContent = Get-Content $ConfigPath

if ($ConfigContent -match "replSetName") {
    Write-Host "Replication already configured." -ForegroundColor Yellow
} else {
    Write-Host "Stopping MongoDB Service..."
    Stop-Service MongoDB

    Write-Host "Adding replication config..."
    Add-Content $ConfigPath "`nreplication:`n  replSetName: rs0"

    Write-Host "Starting MongoDB Service..."
    Start-Service MongoDB
    Write-Host "MongoDB restarted with replication enabled." -ForegroundColor Green
}
