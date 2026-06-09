(function(){
  const DIACRITICS_RE = /[\u0300-\u036f]/g;

  const WOMAN_RULES = [
    { includes: ['calza', 'algodon', 'lycra', 'chupin'], excludes: ['termic'] },
    { includes: ['calza', 'algodon', 'lycra', 'recta'], excludes: ['termic'] },
    { includes: ['calza', 'lycra', 'chupin'], excludes: ['algodon', 'jaspead', 'termic'] },
    { includes: ['calza', 'jaspead', 'chupin'], excludes: ['termic'] },
    { includes: ['calza', 'lycra', 'morley'], excludes: ['oxford', 'termic'] },
    { includes: ['calza', 'lycra', 'combinad'], excludes: ['termic'] },
    { includes: ['calza', 'doble cintura'], excludes: ['jaspead', 'termic'] },
    { includes: ['calza', 'doble cintura', 'jaspead'], excludes: ['termic'] },
    { includes: ['calza', 'lycra', 'estampad'], excludes: ['termic'] },
    { includes: ['calza', 'gofrad', 'lycra'], excludes: ['termic'] },
    { includes: ['calza', 'lycra', 'recta'], excludes: ['algodon', 'jaspead', 'termic'] },
    { includes: ['calza', 'jaspead', 'recta'], excludes: ['termic'] },
    { includes: ['calza', 'oxford'], excludes: ['jaspead', 'termic'] },
    { includes: ['calza', 'oxford', 'jaspead'], excludes: ['termic'] },
    { includes: ['calza', 'arrugado', 'lycra'], excludes: ['termic'] },
    { includes: ['calza', 'frunce', 'lycra'], excludes: ['termic'] },
    { includes: ['pantalon', 'rustic'], excludes: ['jogger', 'frisad'] },
    { includes: ['pantalon', 'jogger', 'rustic', 'lycra'] },
    { includes: ['pantalon', 'jogger', 'lycra'], excludes: ['jaspead', 'rustic', 'termic'] },
    { includes: ['pantalon', 'jogger', 'lycra', 'jaspead'] },
    { includes: ['pantalon', 'morley'] },
    { includes: ['pantalon', 'modal'] },
    { includes: ['babucha', 'modal'] },
    { includes: ['palazo', 'morley'] },
    { includes: ['babucha', 'cargo', 'rustic'] },
    { includes: ['campera', 'morley'] },
    { includes: ['campera', 'lycra'], excludes: ['morley', 'estampad', 'jaspead', 'rustic'] },
    { includes: ['campera', 'jaspead'] },
    { includes: ['campera', 'estampad'] },
    { includes: ['campera', 'modal'] },
    { includes: ['campera', 'rustic'] },
    { includes: ['buzo', 'frisad'] },
    { includes: ['buzo', 'rustic'] },
    { includes: ['remera', 'manga larga', 'morley'] },
    { includes: ['top', 'liso'] },
    { includes: ['top', 'jaspead'] },
    { includes: ['top', 'estampad'] },
    { includes: ['top', 'morley'] },
    { includes: ['top', 'gofrad'] }
  ];

  const MEN_RULES = [
    { includes: ['pantalon', 'rustic'], excludes: ['frisad'] },
    { includes: ['babucha', 'jogger', 'rustic'] },
    { includes: ['babucha', 'rustic', 'lycra'] },
    { includes: ['babucha', 'jogger', 'lycra'], excludes: ['jaspead'] },
    { includes: ['babucha', 'jogger', 'jaspead'] },
    { includes: ['bermuda', 'rustic'] },
    { includes: ['campera', 'lycra'], excludes: ['jaspead'] },
    { includes: ['campera', 'jaspead'] },
    { includes: ['campera', 'rustic'] },
    { includes: ['buzo', 'rustic'] },
    { includes: ['remera', 'algodon'] }
  ];

  const KIDS_RULES = [
    { includes: ['calza', 'lycra'], excludes: ['algodon', 'jaspead', 'termic'] },
    { includes: ['calza', 'jaspead'], excludes: ['termic'] },
    { includes: ['calza', 'algodon', 'lycra'], excludes: ['termic'] },
    { includes: ['pantalon', 'rustic'] },
    { includes: ['bermuda', 'rustic'] },
    { includes: ['remera'] },
    { includes: ['camiseta'] }
  ];

  const SECTION_RULES = {
    mujer: WOMAN_RULES,
    hombre: MEN_RULES,
    ninos: KIDS_RULES
  };
  const SECTION_PRIORITY = {
    mujer: 0,
    mujeres: 0,
    hombre: 1,
    ninos: 2,
    nino: 2
  };

  function normalizeText(value){
    const raw = value === null || value === undefined ? '' : String(value);
    return raw.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase();
  }

  function ruleMatches(text, rule){
    const includes = Array.isArray(rule.includes) ? rule.includes : [];
    const excludes = Array.isArray(rule.excludes) ? rule.excludes : [];

    for (let i = 0; i < includes.length; i += 1){
      if (text.indexOf(includes[i]) === -1) return false;
    }
    for (let i = 0; i < excludes.length; i += 1){
      if (text.indexOf(excludes[i]) !== -1) return false;
    }
    return true;
  }

  function rankProduct(product, pageSection){
    const section = normalizeText(pageSection || (product && product.section) || '');
    const rules = SECTION_RULES[section];
    if (!Array.isArray(rules) || !rules.length) return Number.MAX_SAFE_INTEGER;

    const name = normalizeText(product && product.name);
    for (let i = 0; i < rules.length; i += 1){
      if (ruleMatches(name, rules[i])) return i;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  function productSectionKey(product){
    const raw = normalizeText(product && product.section);
    if (raw === 'ninos' || raw === 'nino' || raw === 'nina' || raw === 'ninas') return 'ninos';
    if (raw === 'mujeres') return 'mujer';
    return raw;
  }

  function sectionRankForProduct(product){
    const key = productSectionKey(product);
    return Object.prototype.hasOwnProperty.call(SECTION_PRIORITY, key)
      ? SECTION_PRIORITY[key]
      : Number.MAX_SAFE_INTEGER;
  }

  function applyCatalogRelevanceOrder(list, pageSection){
    const source = Array.isArray(list) ? list : [];
    const sectionKey = normalizeText(pageSection || '');
    const explicitSection = Array.isArray(SECTION_RULES[sectionKey]) ? sectionKey : '';
    const useGlobalSectionOrder = !explicitSection;

    return source
      .map((item, index) => ({
        item,
        index,
        sectionRank: useGlobalSectionOrder ? sectionRankForProduct(item) : 0,
        rank: rankProduct(item, explicitSection || productSectionKey(item))
      }))
      .sort((a, b) => {
        if (a.sectionRank !== b.sectionRank) return a.sectionRank - b.sectionRank;
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.index - b.index;
      })
      .map(entry => entry.item);
  }

  window.applyCatalogRelevanceOrder = applyCatalogRelevanceOrder;
})();
