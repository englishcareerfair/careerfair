# CareerFair Telemetry Google Drive Sync Utility
param(
    [string]$SourcePath = "telemetry_logs",
    [string]$RemoteDestination = "gdrive:careerfair_telemetry"
)

$rcloneBin = "C:\Users\shwet\tools\rclone\rclone.exe"
if (!(Test-Path $rcloneBin)) {
    $rcloneBin = (Get-Command rclone -ErrorAction SilentlyContinue).Source
}

if (!$rcloneBin) {
    Write-Error "rclone is not found in C:\Users\shwet\tools\rclone\rclone.exe or PATH."
    exit 1
}

Write-Host "Syncing from '$SourcePath' to '$RemoteDestination' via rclone..." -ForegroundColor Cyan
& $rcloneBin copy $SourcePath $RemoteDestination --progress --stats 2s
Write-Host "Sync completed successfully." -ForegroundColor Green
