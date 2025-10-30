function FixString([string]$s){
  if ($null -eq $s) { return $s }
  $pairs = @()
  # térmic*
  $pairs += ,@('TǸrmica','Térmica'); $pairs += ,@('TǸrmico','Térmico');
  $pairs += ,@('T�rmica','Térmica'); $pairs += ,@('T�rmico','Térmico');
  $pairs += ,@('T?rmica','Térmica'); $pairs += ,@('T?rmico','Térmico');
  # ó en palabras comunes
  $pairs += ,@('Marr��n','Marrón'); $pairs += ,@('Marr?n','Marrón');
  $pairs += ,@('Pantal��n','Pantalón'); $pairs += ,@('Pantal?n','Pantalón');
  $pairs += ,@('Algod��n','Algodón'); $pairs += ,@('Algod?n','Algodón');
  # niños/niñas
  $pairs += ,@('Ni��os','Niños'); $pairs += ,@('Ni��a','Niña'); $pairs += ,@('Ni��o','Niño');
  $pairs += ,@('Ni�os','Niños'); $pairs += ,@('Ni?a','Niña'); $pairs += ,@('Ni?o','Niño');
  $pairs += ,@('ni��o','niño'); $pairs += ,@('ni��a','niña'); $pairs += ,@('ni�os','niños');
  $pairs += ,@('ni?a','niña'); $pairs += ,@('ni?o','niño');
  # otras
  $pairs += ,@('rǧstico','rústico'); $pairs += ,@('r��stico','rústico'); $pairs += ,@('pu��o','puño');
  # textos UI comunes
  $pairs += ,@('Selecci��n','Selección'); $pairs += ,@('seleccion��','seleccionó');
  $pairs += ,@('pǭgina','página'); $pairs += ,@('estǭ','está'); $pairs += ,@('agreg��','agregó'); $pairs += ,@('vac��o','vacío');

  foreach ($pair in $pairs) {
    $from = [string]$pair[0]; $to = [string]$pair[1]
    if ($from) { $s = $s -replace [Regex]::Escape($from), [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $to } }
  }
  return $s
}

function SanitizeObject($obj){
  if ($null -eq $obj) { return $obj }
  if ($obj -is [string]) { return (FixString $obj) }
  if ($obj -is [System.Collections.IEnumerable] -and ($obj -isnot [string])) {
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
