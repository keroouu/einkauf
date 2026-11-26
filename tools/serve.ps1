# Kleiner lokaler Webserver zum Testen am PC: http://localhost:8123
param([int]$Port = 8123)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
            '.png'='image/png'; '.webmanifest'='application/manifest+json'; '.json'='application/json'; '.svg'='image/svg+xml' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Server läuft: http://localhost:$Port/  (Strg+C beendet)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '') { $path = 'index.html' }
  $file = Join-Path $root $path
  $full = [IO.Path]::GetFullPath($file)
  if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full)
    $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
    $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
