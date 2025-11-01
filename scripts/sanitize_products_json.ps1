param(
  [string]$Path = (Join-Path (Join-Path $PSScriptRoot '..') 'frontend/products.json')
)

function Fix-String([string]$s){
  if ($null -eq $s) { return $s }
  $t = [string]$s
  if ($t -match '[ÃÂ�]') {
    try {
      $bytes = [System.Text.Encoding]::GetEncoding(28591).GetBytes($t)
      $cand = [System.Text.Encoding]::UTF8.GetString($bytes)
      if ((($cand -split '[ÃÂ�]').Length-1) -lt (($t -split '[ÃÂ�]').Length-1)) { $t = $cand }
    } catch {}
  }
  $map = @{
    'Ã¡'='á'; 'Ã©'='é'; 'Ã­'='í'; 'Ã³'='ó'; 'Ãº'='ú'; 'Ã±'='ñ'; 'Ã¼'='ü';
    'Ã�'='Á'; 'Ã‰'='É'; 'Ã�'='Í'; 'Ã“'='Ó'; 'Ãš'='Ú'; 'Ã‘'='Ñ'; 'Ãœ'='Ü';
    'Â'=''; '�'=''
  }
  foreach ($k in $map.Keys) { $t = $t -replace [Regex]::Escape($k), [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $map[$k] } }
  return $t
}

function Sanitize-Object($obj){
  if ($null -eq $obj) { return $obj }
  if ($obj -is [string]) { return (Fix-String $obj) }
  if ($obj -is [System.Collections.IEnumerable] -and ($obj -isnot [string])) {
    $out = @()
    foreach ($it in $obj) { $out += (Sanitize-Object $it) }
    return $out
  }
  if ($obj.PSObject -and $obj.PSObject.Properties) {
    if ($obj.PSObject.Properties.Name -contains 'images' -and ($obj.images -and $obj.images.PSObject)) {
      $new = New-Object psobject
      foreach ($prop in $obj.images.PSObject.Properties) {
        $nk = Fix-String([string]$prop.Name)
        $new | Add-Member -NotePropertyName $nk -NotePropertyValue $prop.Value -Force
      }
      $obj.images = $new
    }
    foreach ($p in $obj.PSObject.Properties) { $obj.($p.Name) = Sanitize-Object $p.Value }
    return $obj
  }
  return $obj
}

if (-not (Test-Path $Path)) { Write-Error "No existe $Path"; exit 2 }
$backup = "$Path.sanitized.bak"
$data = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
$san = Sanitize-Object $data
if (-not (Test-Path $backup)) { $data | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $backup -Encoding UTF8 }
$san | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
Write-Host 'Sanitización aplicada.'

