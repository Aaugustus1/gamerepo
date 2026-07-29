$ProgressPreference = 'SilentlyContinue'
$dest = "c:\Users\ayman\OneDrive\Desktop\gamearchive\images"

$downloads = @(
    @{ File="it_takes_two_box_art.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/library_600x900_2x.jpg" },
    @{ File="it_takes_two_header.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/header.jpg" },
    @{ File="it_takes_two_ss0.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/ss_3e59753eefaba9a7704a18e902b48e8d38e95e0b.1920x1080.jpg" },
    @{ File="it_takes_two_ss1.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/ss_6e987a0678b013bfd0073a9ac4703e1f04ca4dea.1920x1080.jpg" },
    @{ File="it_takes_two_ss2.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/ss_fdac523e3ea4d2f32a44449bb8c224857563bd7d.1920x1080.jpg" },
    @{ File="it_takes_two_ss3.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/ss_4a62bc8fa398fc5b2094a6225dc5ecff9485f824.1920x1080.jpg" },
    @{ File="it_takes_two_ss4.jpg"; Url="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426210/ss_a15164ddd357ab3c0b2aff575a6b215b2d91b406.1920x1080.jpg" }
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
