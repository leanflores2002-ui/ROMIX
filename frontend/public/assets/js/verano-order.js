(function(){
  const DIACRITICS_RE = /[\u0300-\u036f]/g;
  const FIBRAN_KEYWORDS = ['fibran'];
  const MORLEY_KEYWORDS = ['morley'];
  const LYCRA_KEYWORD = 'lycra';
  const TYPE_PANTALON = ['pantalones', 'pantalon', "palazos", "palazo"];
  const TYPE_CAPRI = ['capri'];
  const TYPE_BERMUDA = ['bermudas', 'bermuda'];
  const TYPE_SHORT = ['shorts', 'short'];
  const TYPE_CICLISTA = ['ciclistas', 'ciclista'];

  function normalizeText(value){
    const raw = value === null || value === undefined ? '' : String(value);
    return raw.normalize ? raw.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase() : raw.toLowerCase();
  }

  function hasKeyword(text, keywords){
    return keywords.some(function(keyword){ return text.indexOf(keyword) >= 0; });
  }

  function isType(type, list){
    return list.indexOf(type) >= 0;
  }

  function rankProduct(product){
    const namePart = normalizeText(product && product.name);
    const typePart = normalizeText(product && product.type);
    const hasLycraAnywhere = hasKeyword(namePart, [LYCRA_KEYWORD]) || hasKeyword(typePart, [LYCRA_KEYWORD]);
    const isPantalon = isType(typePart, TYPE_PANTALON);
    const isCapri = isType(typePart, TYPE_CAPRI);
    const isBermuda = isType(typePart, TYPE_BERMUDA);
    const isShort = isType(typePart, TYPE_SHORT);
    const isCiclista = isType(typePart, TYPE_CICLISTA);
    const isFiberPriorityType = isPantalon || isCapri || isBermuda || isShort;

    if ((hasKeyword(namePart, FIBRAN_KEYWORDS) || hasKeyword(typePart, FIBRAN_KEYWORDS)) && isFiberPriorityType) return 0;
    if ((hasKeyword(namePart, MORLEY_KEYWORDS) || hasKeyword(typePart, MORLEY_KEYWORDS)) && isFiberPriorityType) return 1;
    if (isCapri && hasLycraAnywhere) return 2;
    if (isCiclista && hasLycraAnywhere) return 3;
    if (isShort && hasLycraAnywhere) return 4;
    if (isCapri && !hasLycraAnywhere) return 5;
    if (isBermuda) return 6;
    if (isShort && !hasLycraAnywhere) return 7;
    return 8;
  }

  function applyVeranoOrder(list){
    var source = Array.isArray(list) ? list : [];
    return source
      .map(function(item, index){ return { item: item, rank: rankProduct(item), index: index }; })
      .sort(function(a,b){
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.index - b.index;
      })
      .map(function(entry){ return entry.item; });
  }

  window.applyVeranoOrder = applyVeranoOrder;
})();
