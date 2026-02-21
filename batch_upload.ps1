$files = git ls-files --others --exclude-standard
$batchSize = 20
$batchCount = 0
$currentBatch = @()

$totalFiles = ($files | Measure-Object).Count
Write-Host "Total files to process: $totalFiles"

foreach ($f in $files) {
    if ($f -match "site/\.gitignore") {
        $currentBatch += $f
        continue
    }
    
    $currentBatch += $f
    
    if ($currentBatch.Count -ge $batchSize) {
        $batchCount++
        Write-Host "Processing batch $batchCount... ($batchSize files)"
        foreach ($file in $currentBatch) {
            git add "`"$file`""
        }
        git commit -m "Batch part $batchCount"
        git push origin main
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Push failed on batch $batchCount"
            exit 1
        }
        $currentBatch = @()
    }
}

if ($currentBatch.Count -gt 0) {
    $batchCount++
    Write-Host "Processing final batch $batchCount... ($($currentBatch.Count) files)"
    foreach ($file in $currentBatch) {
        git add "`"$file`""
    }
    git commit -m "Batch part $batchCount"
    git push origin main
}
Write-Host "All done!"
