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
    "fa-facebook": "f",
    "fa-tiktok": "♪",
    "fa-whatsapp": "💬",
    "fa-phone": "☎️"
  };

  function emojiForIcon(node) {
    var classList = Array.prototype.slice.call(node.classList || []);
    for (var i = 0; i < classList.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(ICON_MAP, classList[i])) {
        return ICON_MAP[classList[i]];
      }
    }
    return "•";
  }

  function replaceLegacyIcons(root) {
    var scope = root || document;
    Array.prototype.slice.call(scope.querySelectorAll("i.fas, i.far, i.fab, i.fa, i[class*='fa-']")).forEach(function (icon) {
      if (icon.dataset.romixEmojiDone === "1") return;
      icon.dataset.romixEmojiDone = "1";
      icon.className = "romix-emoji";
      icon.textContent = emojiForIcon(icon);
      icon.setAttribute("aria-hidden", "true");
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
      if (!label) return;
      if (node.querySelector(".romix-emoji, .emoji-icon")) return;

      var emoji = "";
      if (label.indexOf("buscar") >= 0) emoji = "🔍";
      else if (label.indexOf("carrito") >= 0) emoji = "🛒";
      else if (label.indexOf("favorit") >= 0) emoji = "❤️";
      else if (label.indexOf("guía de talles") >= 0 || label.indexOf("guia de talles") >= 0) emoji = "📏";
      else if (label.indexOf("envío") >= 0 || label.indexOf("envio") >= 0) emoji = "🚚";
      else if (label.indexOf("cambio") >= 0 || label.indexOf("devol") >= 0) emoji = "↩️";
      else if (label.indexOf("pedido") >= 0) emoji = "📦";
      else if (label.indexOf("contact") >= 0 || label.indexOf("whatsapp") >= 0) emoji = "💬";

      if (!emoji) return;
      var span = document.createElement("span");
      span.className = "romix-emoji";
      span.setAttribute("aria-hidden", "true");
      span.textContent = emoji;
      node.insertBefore(span, node.firstChild);
    });
  }

  function observeDynamicContent() {
    if (!window.MutationObserver || !document.body) return;
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.slice.call(mutation.addedNodes || []).forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          replaceLegacyIcons(node);
          decorateGenericControls(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    removeIconFontStylesheets();
    replaceLegacyIcons(document);
    decorateGenericControls(document);
    ensureAnnouncement();
    observeDynamicContent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
