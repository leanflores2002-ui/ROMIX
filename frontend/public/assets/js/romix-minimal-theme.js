(function () {
  "use strict";

  var ICON_MAP = {
    "fa-search": "🔍",
    "fa-user": "👤",
    "fa-user-circle": "👤",
    "fa-heart": "❤️",
    "fa-shopping-cart": "🛒",
    "fa-cart-shopping": "🛒",
    "fa-ruler-combined": "📏",
    "fa-ruler": "📏",
    "fa-exchange-alt": "↩️",
    "fa-sync-alt": "↩️",
    "fa-truck": "🚚",
    "fa-box": "📦",
    "fa-box-open": "📦",
    "fa-wallet": "💳",
    "fa-credit-card": "💳",
    "fa-headset": "💬",
    "fa-comments": "💬",
    "fa-comment": "💬",
    "fa-envelope": "✉️",
    "fa-map-marker-alt": "📍",
    "fa-map-marker": "📍",
    "fa-trash-alt": "🗑️",
    "fa-trash": "🗑️",
    "fa-times": "✕",
    "fa-sliders-h": "☰",
    "fa-filter": "☰",
    "fa-check": "✓",
    "fa-check-circle": "✓",
    "fa-paper-plane": "📦",
    "fa-plus": "➕",
    "fa-minus": "➖",
    "fa-chevron-left": "‹",
    "fa-chevron-right": "›",
    "fa-chevron-up": "⌃",
    "fa-chevron-down": "⌄",
    "fa-angle-left": "‹",
    "fa-angle-right": "›",
    "fa-instagram": "📷",
    "fa-facebook": "👥",
    "fa-tiktok": "♪",
    "fa-whatsapp": "💬",
    "fa-phone": "☎️"
  };

  Object.assign(ICON_MAP, {
    "fa-search-plus": "\u{1F50D}\uFE0E",
    "fa-arrow-left": "\u2190",
    "fa-arrow-right": "\u2192",
    "fa-share-alt": "\u2197",
    "fa-link": "\u{1F517}\uFE0E",
    "fa-calendar-alt": "\u25A1",
    "fa-clock": "\u25F7",
    "fa-comment-dots": "\u25CF",
    "fa-question-circle": "?",
    "fa-store": "\u2302",
    "fa-shopping-bag": "\u25A3",
    "fa-tag": "\u25C7",
    "fa-money-bill-wave": "\u00A4",
    "fa-landmark": "\u25A4",
    "fa-facebook-f": "f"
  });

  function emojiForIcon(node) {
    var classList = Array.prototype.slice.call(node.classList || []);
    for (var i = 0; i < classList.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(ICON_MAP, classList[i])) return ICON_MAP[classList[i]];
    }
    return "•";
  }

  function replaceLegacyIcons(root) {
    var scope = root || document;
    Array.prototype.slice.call(scope.querySelectorAll("i.fas, i.far, i.fab, i.fa, i[class*='fa-']")).forEach(function (icon) {
      if (icon.dataset.romixEmojiDone === "1") return;
      var emoji = emojiForIcon(icon);
      icon.dataset.romixEmojiDone = "1";
      icon.className = "romix-emoji";
      icon.textContent = emoji;
      icon.setAttribute("aria-hidden", "true");
    });
  }

  function inferSvgSymbol(svg) {
    var control = svg.closest("button, a");
    var label = String((control && control.getAttribute("aria-label")) || (control && control.textContent) || "").toLowerCase();
    var className = String((control && control.className) || "").toLowerCase();
    var href = String((control && control.getAttribute("href")) || "").toLowerCase();

    if (label.indexOf("buscar") >= 0 || className.indexOf("search") >= 0) return "🔍";
    if (label.indexOf("carrito") >= 0 || className.indexOf("cart") >= 0) return "🛒";
    if (label.indexOf("favorit") >= 0 || className.indexOf("favorite") >= 0) return "❤️";
    if (label.indexOf("ampliar") >= 0 || label.indexOf("zoom") >= 0) return "🔍";
    if (label.indexOf("guía de talles") >= 0 || label.indexOf("guia de talles") >= 0) return "📏";
    if (label.indexOf("compartir") >= 0 || label.indexOf("copiar") >= 0) return "🔗";
    if (label.indexOf("cerrar") >= 0 || className.indexOf("close") >= 0) return "✕";
    if (label.indexOf("menu") >= 0 || className.indexOf("menu") >= 0) return "☰";
    if (label.indexOf("anterior") >= 0 || className.indexOf("prev") >= 0 || className.indexOf("left") >= 0) return "‹";
    if (label.indexOf("siguiente") >= 0 || label.indexOf("mas productos") >= 0 || className.indexOf("next") >= 0 || className.indexOf("right") >= 0) return "›";
    if (label.indexOf("instagram") >= 0) return "📷";
    if (label.indexOf("facebook") >= 0) return "👥";
    if (label.indexOf("tiktok") >= 0) return "♪";
    if (label.indexOf("whatsapp") >= 0 || href.indexOf("wa.me") >= 0) return "💬";
    if (svg.classList && svg.classList.contains("mega-chevron")) return "⌄";
    if (className.indexOf("accordion") >= 0 || className.indexOf("chevron") >= 0) return "⌄";
    if (className.indexOf("section-link") >= 0) return "›";
    return "";
  }

  function replaceInterfaceSvgs(root) {
    var scope = root || document;
    var selector = [
      "header svg",
      ".site-footer svg",
      "button svg",
      "a svg",
      ".benefit-strip svg"
    ].join(",");

    Array.prototype.slice.call(scope.querySelectorAll(selector)).forEach(function (svg) {
      var symbol = inferSvgSymbol(svg);
      var container = svg.closest(".benefit-item");
      if (!symbol && container) {
        var text = String(container.textContent || "").toLowerCase();
        if (text.indexOf("cambio") >= 0) symbol = "↩️";
        else if (text.indexOf("pago") >= 0) symbol = "🔒";
        else if (text.indexOf("whatsapp") >= 0) symbol = "💬";
        else if (text.indexOf("retiro") >= 0 || text.indexOf("compra") >= 0) symbol = "📦";
      }
      if (!symbol) return;

      var span = document.createElement("span");
      span.className = svg.classList && svg.classList.contains("mega-chevron") ? "mega-chevron romix-emoji" : "romix-emoji";
      span.setAttribute("aria-hidden", "true");
      span.textContent = symbol;
      svg.replaceWith(span);
    });
  }

  function removeIconFontStylesheets() {
    Array.prototype.slice.call(document.querySelectorAll("link[href*='font-awesome'], link[href*='fontawesome']")).forEach(function (link) {
      link.remove();
    });
  }

  function ensureAnnouncement() {
    if (document.querySelector(".romix-announcement")) return;
    var header = document.querySelector("header.site-header, header.romix-shared-header");
    if (!header || !header.parentNode) return;
    var bar = document.createElement("div");
    bar.className = "romix-announcement";
    bar.setAttribute("role", "note");
    bar.textContent = "Envíos y retiro coordinado · Consultá disponibilidad";
    header.parentNode.insertBefore(bar, header);
  }

  function decorateGenericControls(root) {
    var scope = root || document;
    Array.prototype.slice.call(scope.querySelectorAll("button, a")).forEach(function (node) {
      var label = String(node.getAttribute("aria-label") || node.textContent || "").toLowerCase();
      if (!label || node.querySelector(".romix-emoji, .emoji-icon") || String(node.textContent || "").trim()) return;

      var emoji = "";
      if (label.indexOf("buscar") >= 0) emoji = "🔍";
      else if (label.indexOf("carrito") >= 0) emoji = "🛒";
      else if (label.indexOf("favorit") >= 0) emoji = "❤️";
      else if (label.indexOf("guía de talles") >= 0 || label.indexOf("guia de talles") >= 0) emoji = "📏";
      else if (label.indexOf("envío") >= 0 || label.indexOf("envio") >= 0) emoji = "🚚";
      else if (label.indexOf("cambio") >= 0 || label.indexOf("devol") >= 0) emoji = "↩️";
      else if (label.indexOf("pedido") >= 0) emoji = "📦";
      else if (label.indexOf("contact") >= 0 || label.indexOf("whatsapp") >= 0) emoji = "💬";
      else if (label.indexOf("aumentar") >= 0) emoji = "➕";
      else if (label.indexOf("disminuir") >= 0) emoji = "➖";

      if (!emoji) return;
      var span = document.createElement("span");
      span.className = "romix-emoji";
      span.setAttribute("aria-hidden", "true");
      span.textContent = emoji;
      node.insertBefore(span, node.firstChild);
    });
  }

  function refresh(root) {
    replaceLegacyIcons(root || document);
    replaceInterfaceSvgs(root || document);
    decorateGenericControls(root || document);
  }

  function observeDynamicContent() {
    if (!window.MutationObserver || !document.body) return;
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.slice.call(mutation.addedNodes || []).forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          refresh(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    removeIconFontStylesheets();
    refresh(document);
    ensureAnnouncement();
    observeDynamicContent();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
