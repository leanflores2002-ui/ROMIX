from pathlib import Path

header = Path('frontend/public/assets/js/romix-header.js')
text = header.read_text(encoding='utf-8')
old = 'return window.innerWidth <= 768;'
new = 'return window.innerWidth <= 900;'
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Expected mobile navigation breakpoint was not found')
header.write_text(text, encoding='utf-8')

cart_html = Path('frontend/public/cart.html')
cart_html_text = cart_html.read_text(encoding='utf-8')
alias = '    window.orderCartWhatsApp = handleOrder;\n'
marker = '    function renderCart(){\n'
if alias not in cart_html_text:
    if marker not in cart_html_text:
        raise SystemExit('Expected renderCart marker was not found')
    cart_html_text = cart_html_text.replace(marker, alias + marker, 1)
cart_html.write_text(cart_html_text, encoding='utf-8')

cart_js = Path('frontend/public/assets/js/cart.js')
cart_js_text = cart_js.read_text(encoding='utf-8')
old_message = """  const buildWhatsAppMessage = (cart = getCart()) => {
    if (!Array.isArray(cart) || !cart.length) return '';
    const lines = cart.map((item) => {
      const qty = Number(item.qty ?? item.quantity) || 0;
      const parts = [
        `- ${item.name || 'Producto'}`,
        item.color ? `Color: ${item.color}` : '',
        item.talle ? `Talle: ${item.talle}` : '',
        `Cant: ${qty}`,
      ].filter(Boolean);
      return parts.join(' | ');
    });
    return encodeURIComponent(lines.join('\\n'));
  };
"""
new_message = """  const decodeCartText = (value) => {
    if (value == null) return '';
    const text = String(value);
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  };

  const buildWhatsAppMessage = (cart = getCart()) => {
    if (!Array.isArray(cart) || !cart.length) return '';
    let total = 0;
    const lines = cart.map((item) => {
      const qty = Number(item.qty ?? item.quantity) || 0;
      const price = Number(item.price) || 0;
      total += qty * price;
      const name = decodeCartText(item.name) || 'Producto';
      const type = decodeCartText(item.type);
      const color = decodeCartText(item.colorName ?? item.color);
      const size = decodeCartText(item.talle ?? item.size);
      const label = type ? `${name} (${type})` : name;
      const parts = [
        `- ${label}`,
        color ? `Color: ${color}` : '',
        size ? `Talle: ${size}` : '',
        `Cant: ${qty}`,
      ].filter(Boolean);
      return parts.join(' | ');
    });
    lines.push('', `Total: $${total.toFixed(2)}`);
    return encodeURIComponent(lines.join('\\n'));
  };
"""
if old_message in cart_js_text:
    cart_js_text = cart_js_text.replace(old_message, new_message, 1)
elif 'const decodeCartText = (value) =>' not in cart_js_text:
    raise SystemExit('Expected WhatsApp message builder was not found')
cart_js.write_text(cart_js_text, encoding='utf-8')
