$filePath = "c:\Users\Lincoln\Desktop\New folder\Mobile-App new3\Mobile-App\MobileApp\app\dashboard.tsx"
$content = Get-Content $filePath -Raw

# Find the position of the last "    );"
$pattern = '(\s+\)\}\s*\)\s*;)'
if ($content -match $pattern) {
    $match = $matches[0]
    $newContent = $content -replace [regex]::Escape($match), ($match + "`n`n      { renderScreenOverlay() }")
    Set-Content -Path $filePath -Value $newContent
    Write-Host "File updated successfully"
} else {
    Write-Host "Pattern not found"
}

