from pathlib import Path

js_path = Path('frontend/public/assets/js/romix-header.js')
css_path = Path('frontend/public/assets/css/romix-header.css')

text = js_path.read_text(encoding='utf-8')

accessories = '''        accessories: {
          title: "Accesorios",
          links: [
            { label: "Cuellos", href: buildHref(mujer, { tipo: "accesorios", q: "cuello" }), icon: "circle" }
          ]
        },
'''
text = text.replace(accessories, '', 1)

replacements = {
    'eyebrow: "Nueva coleccion",\n          title: "Entrena tu mejor version",\n          description: "Tecnologia, confort y diseno para moverte con libertad.",\n          cta: "Ver coleccion",\n          href: buildHref(mujer, { q_any: "lycra,deportivo,nuevo" }),':
    'eyebrow: "Producto destacado",\n          title: "Campera Lycra Estampada",\n          description: "Campera deportiva de lycra estampada para mujer. Comodidad y elasticidad para uso diario o entrenamiento.",\n          cta: "Ver campera",\n          href: buildHref(mujer, { q: "campera lycra estampado" }),',
    '{ label: "Joggers", href: buildHref(mujer, { tipo: "pantalones", q: "jogger" }), icon: "bottom" }':
    '{ label: "Pantalones jogger", href: buildHref(mujer, { tipo: "pantalones", q: "jogger" }), icon: "bottom" }',
    '{ label: "Babuchas", href: buildHref(mujer, { tipo: "pantalones", q: "babucha" }), icon: "bottom" }':
    '{ label: "Pantalones babucha", href: buildHref(mujer, { tipo: "pantalones", q: "babucha" }), icon: "bottom" }',
    '{ label: "Rectos", href: buildHref(mujer, { tipo: "pantalones", q: "recto" }), icon: "bottom" }':
    '{ label: "Pantalones rectos", href: buildHref(mujer, { tipo: "pantalones", q: "recto" }), icon: "bottom" }',
    '{ label: "Oxford", href: buildHref(mujer, { tipo: "calzas", q: "oxford" }), icon: "bottom" }':
    '{ label: "Calzas Oxford", href: buildHref(mujer, { tipo: "calzas", q: "oxford" }), icon: "bottom" }',
    '{ label: "Palazos", href: buildHref(mujer, { tipo: "palazos" }), icon: "bottom" }':
    '{ label: "Pantalones palazo", href: buildHref(mujer, { tipo: "palazos" }), icon: "bottom" }',
    'title: "Parte superior",': 'title: "Prendas superiores",',
    'title: "Parte inferior",': 'title: "Prendas inferiores",',
    'title: "Colecciones",': 'title: "Telas y estilos",',
}
for old, new in replacements.items():
    text = text.replace(old, new, 1)

text = text.replace('  function buildPanelColumns(columns) {\n', '  function buildPanelColumns(columns, sectionLabel) {\n', 1)
text = text.replace('    var columns = buildPanelColumns(item.columns || []);\n', '    var columns = buildPanelColumns(item.columns || [], item.label);\n', 1)
text = text.replace(
    '<a class="mega-panel-link" href="' + "' + escapeHtml(link.href) + '" + '" data-mega-link="true">',
    '<a class="mega-panel-link" href="' + "' + escapeHtml(link.href) + '" + '" data-mega-link="true" aria-label="' + "' + escapeHtml('Ver ' + link.label + (sectionLabel ? ' de ' + sectionLabel : '')) + '" + '">',
    1,
)
text = text.replace(
    '<span class="mega-panel-kicker">Explora ' + "' + escapeHtml(item.label) + '" + '</span>' + "\n              '<a class=\"mega-panel-viewall\"",
    '<span class="mega-panel-heading">' + "\n                '<span class=\"mega-panel-kicker\">Explora ' + escapeHtml(item.label) + '</span>' +\n                '<span class=\"mega-panel-subtitle\">Elegí una categoría para ver prendas disponibles</span>' +\n              '</span>' +\n              '<a class=\"mega-panel-viewall\"",
    1,
)
text = text.replace(
    '<a class="mega-promo" href="' + "' + escapeHtml(promo.href || item.page) + '" + '" data-mega-link="true">',
    '<a class="mega-promo" href="' + "' + escapeHtml(promo.href || item.page) + '" + '" data-mega-link="true" aria-label="' + "' + escapeHtml('Ver producto destacado: ' + (promo.title || item.label)) + '" + '">',
    1,
)

js_path.write_text(text, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
marker = '/* ROMIX mega menu: clearer categories + accessibility */'
if marker not in css:
    css += '''\n\n/* ROMIX mega menu: clearer categories + accessibility */\n.site-header .mega-panel-heading,\nheader.romix-shared-header .mega-panel-heading { display:grid; gap:3px; }\n.site-header .mega-panel-subtitle,\nheader.romix-shared-header .mega-panel-subtitle { color:#5f5960; font-size:.84rem; line-height:1.4; font-weight:500; }\n.site-header .mega-panel-column,\nheader.romix-shared-header .mega-panel-column { padding:16px; border:1px solid rgba(22,20,24,.08); border-radius:18px; background:rgba(255,255,255,.78); }\n.site-header .mega-panel-title,\nheader.romix-shared-header .mega-panel-title { margin-bottom:12px; color:#17151a; font-size:.83rem; line-height:1.3; letter-spacing:.065em; text-transform:uppercase; }\n.site-header .mega-panel-link,\nheader.romix-shared-header .mega-panel-link { width:100%; min-height:44px; padding:9px 10px; gap:9px; border-radius:12px; color:#302c31 !important; font-weight:650; line-height:1.25; }\n.site-header .mega-panel-link:hover,\nheader.romix-shared-header .mega-panel-link:hover { background:rgba(255,63,134,.075); color:#d91f67 !important; transform:translateX(2px); }\n.site-header .mega-panel-link:focus-visible,\n.site-header .mega-panel-viewall:focus-visible,\n.site-header .mega-promo:focus-visible,\n.site-header .mega-guide-card:focus-visible,\nheader.romix-shared-header .mega-panel-link:focus-visible,\nheader.romix-shared-header .mega-panel-viewall:focus-visible,\nheader.romix-shared-header .mega-promo:focus-visible,\nheader.romix-shared-header .mega-guide-card:focus-visible { outline:3px solid #111; outline-offset:3px; box-shadow:0 0 0 4px rgba(255,63,134,.24); }\n.site-header .mega-link-icon,\nheader.romix-shared-header .mega-link-icon { flex:0 0 30px; width:30px; height:30px; display:inline-grid; place-items:center; border-radius:10px; background:#fff0f6; color:#e72e73; }\n.site-header .mega-promo-overlay,\nheader.romix-shared-header .mega-promo-overlay { background:linear-gradient(180deg,rgba(14,12,16,.08) 5%,rgba(14,12,16,.82) 100%); }\n.site-header .mega-promo-copy,\nheader.romix-shared-header .mega-promo-copy { gap:8px; left:22px; right:22px; bottom:22px; }\n.site-header .mega-promo-eyebrow,\nheader.romix-shared-header .mega-promo-eyebrow { color:#ffb4cf; font-size:.76rem; }\n.site-header .mega-promo-title,\nheader.romix-shared-header .mega-promo-title { font-size:clamp(1.45rem,2.2vw,2rem); max-width:14ch; }\n.site-header .mega-promo-description,\nheader.romix-shared-header .mega-promo-description { max-width:34ch; color:rgba(255,255,255,.92); font-size:.9rem; line-height:1.45; }\n.site-header .mega-promo-cta,\nheader.romix-shared-header .mega-promo-cta { min-height:44px; padding-inline:18px; margin-top:2px; }\n.site-header .mega-panel-viewall,\nheader.romix-shared-header .mega-panel-viewall { min-height:44px; display:inline-flex; align-items:center; padding:0 14px; border-radius:999px; border:1px solid rgba(255,63,134,.25); }\n@media (max-width:900px) { .site-header .mega-panel-column, header.romix-shared-header .mega-panel-column { padding:12px; border-radius:14px; } .site-header .mega-panel-link, header.romix-shared-header .mega-panel-link { min-height:46px; } }\n@media (prefers-reduced-motion:reduce) { .site-header .mega-panel-link, .site-header .mega-promo, header.romix-shared-header .mega-panel-link, header.romix-shared-header .mega-promo { transition:none !important; } }\n'''
css_path.write_text(css, encoding='utf-8')
