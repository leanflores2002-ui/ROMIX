function FixString([string]$s){
  if ($null -eq $s) { return $s }
  $t = [string]$s
  # RegEx de términos frecuentes con mojibake
  # térmic* con char corrupto antes de 'rmic'
  $t = $t -replace '(?i)t.?rmic(a|o)', 'térmic$1'
  $t = $t -replace '(?i)pantal.?n', 'pantalón'
  $t = $t -replace '(?i)algod.?n', 'algodón'
  $t = $t -replace '(?i)marr.?n', 'marrón'
  $t = $t -replace '(?i)r.?stic(o|a)', 'rústic$1'
  $t = $t -replace '(?i)pu.?o', 'puño'
  $t = $t -replace '(?i)ni.?o', 'niño'
  $t = $t -replace '(?i)ni.?a', 'niña'
  $t = $t -replace '(?i)ni.?os', 'niños'
  # Algunas sustituciones directas adicionales
  $pairs = @(
    @('TǸrmica','Térmica'), @('TǸrmico','Térmico'), @('T�rmica','Térmica'), @('T�rmico','Térmico'), @('T?rmica','Térmica'), @('T?rmico','Térmico'),
    @('Marr��n','Marrón'), @('Marr?n','Marrón'), @('Pantal��n','Pantalón'), @('Pantal?n','Pantalón'), @('Algod��n','Algodón'), @('Algod?n','Algodón'),
    @('rǧstico','rústico'), @('r��stico','rústico'), @('pu��o','puño'),
    @('Ni��os','Niños'), @('Ni��a','Niña'), @('Ni��o','Niño'), @('Ni�os','Niños'), @('Ni?a','Niña'), @('Ni?o','Niño'),
    @('ni��o','niño'), @('ni��a','niña'), @('ni�os','niños'), @('ni?a','niña'), @('ni?o','niño')
  )
  foreach ($pair in $pairs) { $from = [string]$pair[0]; $to=[string]$pair[1]; if($from){ $t = $t -replace [Regex]::Escape($from), [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $to } } }
  return $t
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
    # Si es un diccionario de imágenes (keys = nombres de color), hay que renombrar keys
    if ($obj.PSObject.Properties.Name -contains 'images' -and ($obj.images -and $obj.images.PSObject)) {
      $new = New-Object psobject
      foreach ($prop in $obj.images.PSObject.Properties) {
        $nk = FixString([string]$prop.Name)
        $val = $prop.Value
        if (-not $new.PSObject.Properties[$nk]) {
          $new | Add-Member -NotePropertyName $nk -NotePropertyValue $val -Force
        }
      }
      $obj.images = $new
    }
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
