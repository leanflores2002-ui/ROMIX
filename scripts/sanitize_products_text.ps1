function FixString([string]$s){
  if ($null -eq $s) { return $s }
  $pairs = @{
    'T?rmica'='Térmica'; 'T?rmico'='Térmico'; 'Marr?n'='Marrón'; 'Pantal?n'='Pantalón'; 'Algod?n'='Algodón';
    'Selecci?n'='Selección'; 'seleccion?'='seleccionó'; 'p?gina'='página'; 'est?'='está'; 'agreg?'='agregó'; 'vac?o'='vacío';
    'TǸrmica'='Térmica'; 'TǸrmico'='Térmico'; 'rǧstico'='rústico'; 'Ni�os'='Niños'; 'Ni?a'='Niña'; 'Ni?o'='Niño';
    'Marr��n'='Marrón'; 'Algod��n'='Algodón'; 'Pantal��n'='Pantalón'
  }
  foreach ($k in $pairs.Keys) { $s = $s -replace [Regex]::Escape($k), [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $pairs[$k] } }
  return $s
}

function SanitizeObject($obj){
  if ($null -eq $obj) { return $obj }
  if ($obj -is [string]) { return (FixString $obj) }
  if ($obj -is [System.Collections.IEnumerable]) {
    $out = @()
    foreach ($it in $obj) { $out += (SanitizeObject $it) }
    return $out
  }
  if ($obj.PSObject -and $obj.PSObject.Properties) {
    foreach ($p in $obj.PSObject.Properties) { $obj.($p.Name) = SanitizeObject $p.Value }
    return $obj
  }
  return $obj
}

$root = (Join-Path $PSScriptRoot '..' | Resolve-Path).Path
$productsPath = Join-Path $root 'frontend/products.json'
$backupPath = "$productsPath.sanitized.bak"
if (-not (Test-Path $productsPath)) { Write-Error "No existe $productsPath"; exit 2 }
$data = Get-Content -Raw -LiteralPath $productsPath | ConvertFrom-Json
$san = SanitizeObject $data
if (-not (Test-Path $backupPath)) { $data | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $backupPath -Encoding UTF8 }
$san | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $productsPath -Encoding UTF8
Write-Host 'Sanitización aplicada.'

