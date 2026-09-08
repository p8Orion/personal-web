<#
  Re-encodes src/content/images to WebP from the jpg/png originals and mirrors
  the result into public/images.

  The first pass at this used ffmpeg's libwebp defaults, which left the photos
  only 25-40% lighter than their JPEGs and 4-a barely 11%. Two things were
  missing: compression_level was at its default 4 instead of 6, and nothing was
  resized, even though the panel is 36rem and the lightbox 32rem, so no image
  is ever shown wider than 512 CSS px.

  Usage:  powershell scripts/images-to-webp.ps1 [-Quality 78] [-MaxWidth 1200] [-DryRun]
  -DryRun encodes into a temp dir and reports sizes without touching anything.
#>
param(
  [switch]$DryRun,
  [int]$Quality = 78,
  # 512 CSS px at the lightbox, so 1200 still has headroom past a 2x display.
  [int]$MaxWidth = 1200,
  [string]$Source = 'src/content/images',
  [string]$Mirror = 'public/images'
)

$ErrorActionPreference = 'Stop'

$cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
$ffmpeg = if ($cmd) { $cmd.Source } else { $null }
if (-not $ffmpeg) {
  $winget = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe'
  if (Test-Path $winget) { $ffmpeg = $winget }
}
if (-not $ffmpeg) { throw 'ffmpeg not found. winget install Gyan.FFmpeg' }

# OrionNebula is a fullscreen overlay, not a 512px card. Capping it at MaxWidth
# (and serving the result through a 1920 canvas) is what made desktop look
# low-res. The nebula reads the jpg directly; leave it out of this pass.
$originals = Get-ChildItem $Source -File | Where-Object {
  $_.Extension -match '^\.(jpg|jpeg|png)$' -and $_.BaseName -ne 'OrionNebula'
} | Sort-Object BaseName
if (-not $originals) { throw "No jpg/png originals under $Source" }

$stage = Join-Path ([IO.Path]::GetTempPath()) "webp-$(Get-Random)"
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$rows = foreach ($src in $originals) {
  $out = Join-Path $stage ($src.BaseName + '.webp')
  # Caps width only: every layout that shows these is width-constrained, and a
  # height cap would under-resolve the portrait shots. `min` never upscales.
  $scale = "scale='min($MaxWidth,iw)':-2:flags=lanczos"
  & $ffmpeg -y -hide_banner -loglevel error -i $src.FullName `
    -vf $scale -c:v libwebp -preset picture -compression_level 6 -quality $Quality $out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed on $($src.Name)" }

  $prev = Join-Path $Source ($src.BaseName + '.webp')
  $prevKB = if (Test-Path $prev) { [math]::Round((Get-Item $prev).Length / 1KB) } else { 0 }
  $newKB = [math]::Round((Get-Item $out).Length / 1KB)
  [pscustomobject]@{
    File   = $src.BaseName
    SrcKB  = [math]::Round($src.Length / 1KB)
    OldKB  = $prevKB
    NewKB  = $newKB
    Change = if ($prevKB) { "$([math]::Round(100 * $newKB / $prevKB - 100))%" } else { 'new' }
  }
}

$rows | Format-Table -AutoSize
$old = ($rows | Measure-Object OldKB -Sum).Sum
$new = ($rows | Measure-Object NewKB -Sum).Sum
"TOTAL  old $old KB -> new $new KB  ($([math]::Round(100 - 100 * $new / $old))% lighter)"

if ($DryRun) {
  "Staged in $stage (nothing replaced)."
  return
}

New-Item -ItemType Directory -Path $Mirror -Force | Out-Null
Get-ChildItem $stage -Filter *.webp | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $Source $_.Name) -Force
  Copy-Item $_.FullName (Join-Path $Mirror $_.Name) -Force
}
Remove-Item $stage -Recurse -Force
"Replaced $($rows.Count) files in $Source and mirrored to $Mirror."
