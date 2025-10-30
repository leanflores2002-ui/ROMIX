function Normalize([string]$s){
  if (-not $s) { return '' }
  try {
    $formD = $s.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $formD.ToCharArray()) {
      if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($ch) }
    }
    return $sb.ToString().ToLower().Trim()
  } catch { return $s.ToLower().Trim() }
}

$root = (Join-Path $PSScriptRoot '..' | Resolve-Path).Path
$productsPath = Join-Path $root 'frontend/products.json'
$backupPath = "$productsPath.dedupe.bak"
if (-not (Test-Path $productsPath)) { Write-Error "No existe $productsPath"; exit 2 }

$list = Get-Content -Raw -LiteralPath $productsPath | ConvertFrom-Json
if (-not ($list -is [System.Collections.IEnumerable])) { Write-Error 'products.json no es una lista'; exit 2 }

$map = @{}
foreach ($p in $list){
  $key = (Normalize($p.section) + '|' + Normalize($p.name))
  if (-not $map.ContainsKey($key)) { $map[$key] = $p; continue }
  $base = $map[$key]
  # Merge primitive props (prefer latest)
  foreach ($prop in @('price','originalPrice','badge','type','image','section')){
    if ($p.PSObject.Properties[$prop]){ $base | Add-Member -NotePropertyName $prop -NotePropertyValue $p.$prop -Force }
  }
  # Merge images dict
  if ($p.images){ if (-not $base.images){ $base | Add-Member -NotePropertyName images -NotePropertyValue (@{}) -Force }
    foreach($k in $p.images.PSObject.Properties.Name){ $base.images | Add-Member -NotePropertyName $k -NotePropertyValue $p.images.$k -Force }
  }
  # Merge colors (by name)
  if ($p.colors){ if (-not $base.colors){ $base | Add-Member -NotePropertyName colors -NotePropertyValue @() -Force }
    $seen = @{}; foreach($c in $base.colors){ $seen[(Normalize($c.name))]=1 }
    foreach($c in $p.colors){ $k2=Normalize($c.name); if(-not $seen.ContainsKey($k2)){ $base.colors += $c; $seen[$k2]=1 } }
  }
  # Merge sizes (by size value)
  if ($p.sizes){ if (-not $base.sizes){ $base | Add-Member -NotePropertyName sizes -NotePropertyValue @() -Force }
    $seenS = @{}; foreach($s in $base.sizes){ $seenS[[string]$s.size]=1 }
    foreach($s in $p.sizes){ $k3=[string]$s.size; if(-not $seenS.ContainsKey($k3)){ $base.sizes += $s; $seenS[$k3]=1 } }
  }
  # Merge priceByGroup
  if ($p.priceByGroup){ if (-not $base.priceByGroup){ $base | Add-Member -NotePropertyName priceByGroup -NotePropertyValue (New-Object psobject) -Force }
    foreach($n in $p.priceByGroup.PSObject.Properties.Name){ $base.priceByGroup | Add-Member -NotePropertyName $n -NotePropertyValue $p.priceByGroup.$n -Force }
  }
}

$out = @(); foreach($k in $map.Keys){ $out += $map[$k] }
if (-not (Test-Path $backupPath)) { $list | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $backupPath -Encoding UTF8 }
$out | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $productsPath -Encoding UTF8
Write-Host ("Dedupe: {0} -> {1}" -f $list.Count, $out.Count)

