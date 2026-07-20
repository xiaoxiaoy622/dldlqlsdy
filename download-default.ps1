param(
    [string]$OutputDir = "$PSScriptRoot",
    [string]$CdnBase = "https://res.xxh5.z7xz.com/xxh5dev",
    [string]$PkBase = "https://dldl.50pk.com"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# === 1. JS files from 50PK ===
Write-Host "=== [1/4] Downloading JS files from 50PK ===" -ForegroundColor Cyan
$jsMap = @{
    "qq_res/enter.js"     = "enter.js"
    "rjs/d3j4a5s8d3.js"  = "d3j4a5s8d3.js"
}
foreach ($src in $jsMap.Keys) {
    $url = "$PkBase/$src"
    $out = "$OutputDir\$($jsMap[$src])"
    New-Item -ItemType File -Path $out -Force | Out-Null
    Write-Host "  $src ..." -NoNewline
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host " $((Get-Item $out).Length / 1KB -as [int]) KB" -ForegroundColor Green
}

# === 2. CDN engine files ===
Write-Host "=== [2/4] Downloading engine files from CDN ===" -ForegroundColor Cyan
$cdnRoot = @(
    "cc.js"
)
foreach ($f in $cdnRoot) {
    $url = "$CdnBase/$f"
    $out = "$OutputDir\$f"
    New-Item -ItemType File -Path $out -Force | Out-Null
    Write-Host "  $f ..." -NoNewline
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host " $((Get-Item $out).Length / 1KB -as [int]) KB" -ForegroundColor Green
}

# === 3. Login UI atlas + sprites ===
Write-Host "=== [3/4] Downloading login UI resources from CDN ===" -ForegroundColor Cyan
$imgFiles = @(
    "img/x5_login.json",
    "img/x5_login.png",
    "img/x5_createrole.json",
    "img/x5_createrole.png",
    "img/denglu_img_logo.png",
    "img/loadingFlower.png",
    "img/loadingRound.png",
    "img/bgqc.jpg"
)
foreach ($f in $imgFiles) {
    $url = "$CdnBase/$f"
    $out = "$OutputDir\$f"
    New-Item -ItemType File -Path $out -Force | Out-Null
    Write-Host "  $f ..." -NoNewline
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host " $((Get-Item $out).Length / 1KB -as [int]) KB" -ForegroundColor Green
}

# === 4. Config files (protocol, privacy, age) ===
Write-Host "=== [4/4] Downloading config files from CDN ===" -ForegroundColor Cyan
$cfgFiles = @(
    "img/userProtocol.json", "img/userProtocol_qq.json",
    "img/userProtocol_ad.json", "img/userProtocol_hjy.json",
    "img/userProtocol_hjy2.json", "img/userProtocol_nb.json",
    "img/userProtocol_oppo.json", "img/userProtocol_ql.json",
    "img/userProtocol_xy.json", "img/userProtocol_yl.json",
    "img/privacyPolicy.json", "img/privacyPolicy_qq.json",
    "img/privacyPolicy_hjy.json", "img/privacyPolicy_hjy2.json",
    "img/privacyPolicy_nb.json", "img/privacyPolicy_oppo.json",
    "img/privacyPolicy_ql.json", "img/privacyPolicy_xy.json",
    "img/privacyPolicy_yl.json",
    "img/ageTip.json", "img/ageTip_ios.json"
)
foreach ($f in $cfgFiles) {
    $url = "$CdnBase/$f"
    $out = "$OutputDir\$f"
    New-Item -ItemType File -Path $out -Force | Out-Null
    Write-Host "  $f ..." -NoNewline
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        Write-Host " $((Get-Item $out).Length / 1KB -as [int]) KB" -ForegroundColor Green
    } catch {
        Write-Host " skipped (404)" -ForegroundColor DarkYellow
    }
}

Write-Host "`n=== All done! ===" -ForegroundColor Cyan
Write-Host "Output: $OutputDir" -ForegroundColor White
Get-ChildItem -Path $OutputDir -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($OutputDir.Length + 1)
    Write-Host "  $rel ($($_.Length / 1KB -as [int]) KB)" -ForegroundColor Gray
}
