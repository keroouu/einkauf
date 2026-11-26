# Erzeugt die App-Icons (PNG) mit Bordmitteln von Windows.
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$size, [string]$file) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $c1 = [System.Drawing.Color]::FromArgb(255, 62, 182, 112)
  $c2 = [System.Drawing.Color]::FromArgb(255, 34, 134, 78)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 90
  $g.FillRectangle($brush, $rect)

  $s = $size / 100.0
  $white = [System.Drawing.Color]::White
  $pen = New-Object System.Drawing.Pen $white, (7 * $s)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'

  # Einkaufskorb
  $basket = New-Object System.Drawing.Drawing2D.GraphicsPath
  $basket.AddLines([System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF (22*$s), (42*$s)),
    (New-Object System.Drawing.PointF (78*$s), (42*$s)),
    (New-Object System.Drawing.PointF (70*$s), (78*$s)),
    (New-Object System.Drawing.PointF (30*$s), (78*$s))
  ))
  $basket.CloseFigure()
  $g.DrawPath($pen, $basket)
  # Henkel
  $g.DrawLine($pen, (36*$s), (42*$s), (46*$s), (24*$s))
  $g.DrawLine($pen, (64*$s), (42*$s), (54*$s), (24*$s))
  # Haken im Korb
  $pen2 = New-Object System.Drawing.Pen $white, (6.5 * $s)
  $pen2.StartCap = 'Round'; $pen2.EndCap = 'Round'; $pen2.LineJoin = 'Round'
  $g.DrawLines($pen2, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF (39*$s), (60*$s)),
    (New-Object System.Drawing.PointF (47*$s), (68*$s)),
    (New-Object System.Drawing.PointF (62*$s), (52*$s))
  ))

  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 180 'apple-touch-icon.png'
New-Icon 192 'icon-192.png'
New-Icon 512 'icon-512.png'
Write-Output "Icons erstellt in $out"
