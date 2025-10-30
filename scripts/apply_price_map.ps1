param(
  [string]$MapPath = $(Join-Path $PSScriptRoot 'price_map.json')
)

function Normalize([string]$s){
  if (-not $s) { return '' }
  try {
    $formD = $s.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $formD.ToCharArray()) {
      if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
        [void]$sb.Append($ch)
      }
    }
    return $sb.ToString().ToLower().Trim()
  } catch {
    return $s.ToLower().Trim()
  }
}

$root = (Join-Path $PSScriptRoot '..' | Resolve-Path).Path
$productsPath = Join-Path $root 'frontend/products.json'
$backupPath = "$productsPath.bak"

if (-not (Test-Path $productsPath)) { Write-Error "No existe $productsPath"; exit 2 }
if (-not (Test-Path $MapPath)) { Write-Error "No existe mapa $MapPath"; exit 2 }

$rules = Get-Content -Raw -LiteralPath $MapPath | ConvertFrom-Json
$list = Get-Content -Raw -LiteralPath $productsPath | ConvertFrom-Json
if (-not ($list -is [System.Collections.IEnumerable])) { Write-Error 'products.json no es una lista'; exit 2 }

function MatchesRule($product, $rule){
  if ($rule.section -and (Normalize($product.section) -ne (Normalize($rule.section)))) { return $false }
  $name = (Normalize([string]$product.name) + ' ' + Normalize([string]$product.type))
  foreach ($pat in $rule.patterns) {
    if (-not $name.Contains((Normalize([string]$pat)))) { return $false }
  }
  return $true
}

$updated = 0
foreach ($p in $list) {
  foreach ($r in $rules) {
    if (MatchesRule $p $r) {
      # Set price to common
      if ($r.PSObject.Properties.Name -contains 'common') { $p.price = [int]$r.common }
      # Ensure priceByGroup object
      if (-not $p.priceByGroup) { $p | Add-Member -NotePropertyName priceByGroup -NotePropertyValue (New-Object psobject) -Force }
      if ($r.PSObject.Properties.Name -contains 'common') { $p.priceByGroup | Add-Member -NotePropertyName common -NotePropertyValue ([int]$r.common) -Force }
      if ($r.PSObject.Properties.Name -contains 'special') { $p.priceByGroup | Add-Member -NotePropertyName special -NotePropertyValue ([int]$r.special) -Force }
      if ($r.PSObject.Properties.Name -contains 'superspecial') { $p.priceByGroup | Add-Member -NotePropertyName superspecial -NotePropertyValue ([int]$r.superspecial) -Force }
      $updated++
      break
    }
  }
}

if (-not (Test-Path $backupPath)) {
  $list | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $backupPath -Encoding UTF8
}
$list | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $productsPath -Encoding UTF8

Write-Host "Productos actualizados: $updated"
