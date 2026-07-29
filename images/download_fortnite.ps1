$ProgressPreference = 'SilentlyContinue'
$dest = "c:\Users\ayman\OneDrive\Desktop\gamearchive\images"
Set-Location $dest

# Known working Fortnite image URLs from various public CDNs
$downloads = @(
    @{ File="fortnite_ss0.jpg"; Url="https://cdn2.unrealengine.com/fortnite-chapter-5-season-4-keyart-3840x2160-3840x2160-58f95b1c15e8.jpg" },
    @{ File="fortnite_ss0.jpg"; Url="https://cdn2.unrealengine.com/14br-consoles-background-702x906-702x906-f4e5d128e7dd.jpg" },
    @{ File="fortnite_ss0.jpg"; Url="https://helios-i.mashable.com/imagery/articles/02u4oZRVCfDjIXXnb01mbDi/hero-image.fill.size_1200x1200.v1611612485.jpg" },
    @{ File="fortnite_ss0.jpg"; Url="https://cdn.mos.cms.futurecdn.net/WHjVpEfDgXhNRjGFxcGAoH.jpg" },
    @{ File="fortnite_ss1.jpg"; Url="https://cdn.mos.cms.futurecdn.net/L7xv4gNuVY5eF8TvZoJDcL.jpg" },
    @{ File="fortnite_ss2.jpg"; Url="https://cdn.mos.cms.futurecdn.net/aKPQQRp9cALbAUVSGsQz5G.jpg" },
    @{ File="fortnite_ss3.jpg"; Url="https://assets.xboxservices.com/assets/15/b6/15b66866-50b8-47b0-a95d-2e8e0b64b8f8.jpg" },
    @{ File="fortnite_ss4.jpg"; Url="https://assets.xboxservices.com/assets/6d/85/6d85d7ec-01de-4e00-8eb5-4e3cc9e8cb7a.jpg" }
)

$downloaded = @{}

foreach ($dl in $downloads) {
    # Skip if we already downloaded this file
    if ($downloaded.ContainsKey($dl.File)) { continue }
    
    $outPath = Join-Path $dest $dl.File
    if (Test-Path $outPath) {
        $size = (Get-Item $outPath).Length
        if ($size -gt 5000) {
            Write-Host "SKIP $($dl.File) ($size bytes)"
            $downloaded[$dl.File] = $true
            continue
        }
    }
    
    Write-Host "Trying $($dl.Url) ..."
    try {
        Invoke-WebRequest -Uri $dl.Url -OutFile $outPath -UseBasicParsing -TimeoutSec 15 -Headers @{
            "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        $size = (Get-Item $outPath).Length
        if ($size -gt 5000) {
            Write-Host "  OK: $($dl.File) ($size bytes)"
            $downloaded[$dl.File] = $true
        } else {
            Write-Host "  TOO SMALL: $size bytes"
            Remove-Item $outPath -Force
        }
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)"
        if (Test-Path $outPath) { Remove-Item $outPath -Force }
    }
}

# List what we have
Write-Host "`n--- Downloaded Fortnite files ---"
Get-ChildItem $dest -Filter "fortnite*" | ForEach-Object { Write-Host "$($_.Name) - $($_.Length) bytes" }
