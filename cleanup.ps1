# Kill conflicting processes on common Expo/React Native ports
# This script kills processes that might block Expo from starting

$ErrorActionPreference = "SilentlyContinue"

$ports = @(8081, 19000, 19001, 19002, 3000)
$processNames = @("node", "metro", "react-native", "expo")

Write-Host "Checking for processes using common Expo/React Native ports..." -ForegroundColor Cyan

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Killing process $($process.ProcessName) (PID: $processId) using port $port" -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
        }
    }
}

Write-Host "Cleanup complete!" -ForegroundColor Green

