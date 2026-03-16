$content = Get-Content "c:\Users\Lincoln\Desktop\New folder\Mobile-App new3\Mobile-App\MobileApp\app\dashboard.tsx" -Raw
$newContent = $content -replace '(\s+\)\}\s*\)\s*;\s*$)', '$1' + "`n`n      { renderScreenOverlay() }`n    );"
Set-Content -Path "c:\Users\Lincoln\Desktop\New folder\Mobile-App new3\Mobile-App\MobileApp\app\dashboard.tsx" -Value $newContent
Write-Host "Done"

