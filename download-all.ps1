param(
    [string]$OutputDir = "$PSScriptRoot",
    [string]$CdnBase = "https://res.xxh5.z7xz.com/xxh5dev",
    [string]$PkBase = "https://dldl.50pk.com",
    [switch]$SkipJs,
    [switch]$SkipSkins,
    [switch]$SkipCommon
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# --- Step 1: Download JS files from 50PK ---
if (-not $SkipJs) {
    Write-Host "=== Downloading JS files from 50PK ===" -ForegroundColor Cyan
    $jsFiles = @{
        "qq_res/enter.js"     = "$OutputDir\enter.js"
        "rjs/d3j4a5s8d3.js"  = "$OutputDir\d3j4a5s8d3.js"
    }
    foreach ($urlPath in $jsFiles.Keys) {
        $url = "$PkBase/$urlPath"
        $out = $jsFiles[$urlPath]
        New-Item -ItemType File -Path $out -Force | Out-Null
        Write-Host "  Downloading $url ..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        Write-Host "    -> $out ($((Get-Item $out).Length / 1KB -as [int]) KB)" -ForegroundColor Green
    }
}

# --- Step 2: Download CDN base files ---
if (-not $SkipCommon) {
    Write-Host "=== Downloading CDN base files ===" -ForegroundColor Cyan
    $baseFiles = @(
        "cc.js",
        "skin.js"
    )
    foreach ($f in $baseFiles) {
        $url = "$CdnBase/$f"
        $out = "$OutputDir\$f"
        New-Item -ItemType File -Path $out -Force | Out-Null
        Write-Host "  Downloading $url ..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        Write-Host "    -> $out ($((Get-Item $out).Length / 1KB -as [int]) KB)" -ForegroundColor Green
    }
}

# --- Step 3: Parse skin.js and download all skin resources ---
if (-not $SkipSkins) {
    Write-Host "=== Downloading skin resources from skin.js ===" -ForegroundColor Cyan

    $skinJsPath = "$OutputDir\skin.js"
    if (-not (Test-Path $skinJsPath)) {
        Write-Host "  ERROR: skin.js not found at $skinJsPath" -ForegroundColor Red
        Write-Host "  Please place skin.js in the output directory first." -ForegroundColor Yellow
        return
    }

    $skinJs = Get-Content -LiteralPath $skinJsPath -Raw

    $matches = [regex]::Matches($skinJs, '"((skins/skin_[^/]+/(?:[^"]+)))"')
    $allPaths = $matches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    Write-Host "  Found $($allPaths.Count) unique skin resource paths" -ForegroundColor Yellow

    $total = $allPaths.Count
    $count = 0
    foreach ($path in $allPaths) {
        $count++
        $url = "$CdnBase/$path"
        $out = "$OutputDir\$path"
        New-Item -ItemType File -Path $out -Force | Out-Null
        Write-Progress -Activity "Downloading skin resources" -Status "$count / $total - $path" -PercentComplete ($count / $total * 100)
        try {
            Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        } catch {
            Write-Host "  FAILED: $path ($($_.Exception.Message))" -ForegroundColor Red
        }
    }
    Write-Progress -Activity "Downloading skin resources" -Completed
    Write-Host "  Skin resources done." -ForegroundColor Green
}

# --- Step 4: Download common/shared resources ---
if (-not $SkipCommon) {
    Write-Host "=== Downloading common resources ===" -ForegroundColor Cyan

    $commonFiles = @(
        "img/x5_login.json",
        "img/x5_createrole.json",
        "img/loadingFlower.png",
        "img/loadingRound.png",
        "img/bottom_1.jpg",
        "img/bottom_2.jpg",
        "img/bgqc.jpg",
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

    foreach ($f in $commonFiles) {
        $url = "$CdnBase/$f"
        $out = "$OutputDir\$f"
        New-Item -ItemType File -Path $out -Force | Out-Null
        Write-Host "  Downloading $url ..." -ForegroundColor Gray
        try {
            Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
            Write-Host "    -> $out ($((Get-Item $out).Length / 1KB -as [int]) KB)" -ForegroundColor Green
        } catch {
            Write-Host "  SKIPPED: $f (404 or error)" -ForegroundColor DarkYellow
        }
    }
}

Write-Host "=== All done! ===" -ForegroundColor Cyan
Write-Host "Output directory: $OutputDir" -ForegroundColor White
