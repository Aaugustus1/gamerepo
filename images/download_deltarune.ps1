$ProgressPreference = 'SilentlyContinue'
$dest = $PSScriptRoot
if (-not $dest) { $dest = "c:\Users\nizar\Desktop\gamearchive\images" }

$downloads = @(
    @{ File="deltarune_box_art.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/library_600x900_2x.jpg" },
    @{ File="deltarune_header.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/header.jpg" },
    @{ File="deltarune_ss0.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/ss_b19eda9efcabf0fe27741eb126427048541780f0.1920x1080.jpg" },
    @{ File="deltarune_ss1.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/ss_3fb0a253a8fa2f08a49f982d8c1e93c283e27f6d.1920x1080.jpg" },
    @{ File="deltarune_ss2.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/ss_0d6b9f18eb6af166ae23a2c6b3148865eedb362d.1920x1080.jpg" },
    @{ File="deltarune_ss3.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/ss_373f7aa9cd0f38423fadc4de77dece8e488bb7b1.1920x1080.jpg" },
    @{ File="deltarune_ss4.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1671210/ss_ba1b1cd502e6a7f8aa5b9d5a39485ff32b84dc23.1920x1080.jpg" }
)

foreach ($dl in $downloads) {
    $outPath = Join-Path $dest $dl.File
    Write-Host "Downloading $($dl.File) from $($dl.Url)..."
    try {
        Invoke-WebRequest -Uri $dl.Url -OutFile $outPath -UseBasicParsing -TimeoutSec 15 -Headers @{
            "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        $size = (Get-Item $outPath).Length
        Write-Host "  Success: $($dl.File) ($size bytes)"
    } catch {
        Write-Host "  Failed: $($_.Exception.Message)"
    }
}
