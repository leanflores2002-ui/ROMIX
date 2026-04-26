const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "frontend", "public");
const PRODUCTS_FILE = path.join(PUBLIC_DIR, "assets", "data", "products.json");
const SHARE_DIR = path.join(PUBLIC_DIR, "share");
const FALLBACK_IMAGE = "images/logo-romix-social-1200x630.png";
const DEFAULT_SITE_URL = "https://romi-damas.netlify.app";

function normalizeSiteUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

const SITE_URL = normalizeSiteUrl(
  process.env.ROMIX_SITE_URL
    || process.env.SITE_URL
    || process.env.URL
    || process.env.DEPLOY_PRIME_URL
    || DEFAULT_SITE_URL
);

function slugify(value) {
  const raw = String(value || "").trim();
  if (!raw) return "producto";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto";
}

function productSlug(product) {
  const baseSource = (product && (product.name || product.id)) ? (product.name || product.id) : "producto";
  const baseSlug = slugify(baseSource) || "producto";
  const rawId = String((product && product.id) || "").trim();
  if (!rawId) return baseSlug;
  const idSlug = slugify(rawId);
  if (!idSlug || idSlug === baseSlug || baseSlug.endsWith(`-${idSlug}`)) return baseSlug;
  return `${baseSlug}-${idSlug}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\\/g, "/");
}

function encodePathForMeta(value) {
  const clean = normalizePath(value);
  if (!clean) return "";
  try {
    return encodeURI(clean);
  } catch {
    return clean;
  }
}

function absoluteUrl(value) {
  const clean = normalizePath(value);
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  const rel = clean.replace(/^\/+/, "");
  return `${SITE_URL}/${rel}`;
}

function productImage(product) {
  const direct = encodePathForMeta(product && product.image);
  if (direct) return direct;
  if (product && product.images && typeof product.images === "object") {
    const first = Object.values(product.images).find((entry) => String(entry || "").trim());
    if (first) return encodePathForMeta(first);
  }
  return encodePathForMeta(FALLBACK_IMAGE);
}

function productDescription(product) {
  const candidates = [
    product && product.description,
    product && product.desc,
    product && product.subtitle,
    product && product.type
  ];
  const first = candidates.find((entry) => String(entry || "").trim());
  const fallback = "Descubri indumentaria deportiva ROMIX para cada dia.";
  if (!first) return fallback;
  return String(first).replace(/\s+/g, " ").trim().slice(0, 220);
}

function formatPrice(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `$${num.toLocaleString("es-AR")}`;
}

function productTitle(product) {
  const name = String((product && product.name) || "Producto ROMIX").trim();
  const price = formatPrice(product && product.price);
  return price ? `${name} - ${price}` : name;
}

function detailHref(product, slug) {
  const pid = encodeURIComponent(String((product && product.id) || slug || "producto"));
  const safeSlug = encodeURIComponent(String(slug || "producto"));
  const name = encodeURIComponent(String((product && product.name) || "").trim());
  return `/product.html?id=${pid}&slug=${safeSlug}&name=${name}`;
}

function shareHtml({ title, description, imageUrl, shareUrl, detailUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);
  const safeShare = escapeHtml(shareUrl);
  const safeDetail = escapeHtml(detailUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="ROMIX" />
  <meta property="og:locale" content="es_AR" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta property="og:url" content="${safeShare}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="twitter:url" content="${safeShare}" />
  <link rel="canonical" href="${safeShare}" />
  <meta http-equiv="refresh" content="0;url=${safeDetail}" />
  <script>window.location.replace(${JSON.stringify(detailUrl)});</script>
</head>
<body>
  <p>Redirigiendo al producto...</p>
  <p><a href="${safeDetail}">Abrir producto</a></p>
</body>
</html>
`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!fs.existsSync(PRODUCTS_FILE)) {
    throw new Error(`No se encontro ${PRODUCTS_FILE}`);
  }

  const raw = fs.readFileSync(PRODUCTS_FILE, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [];

  fs.rmSync(SHARE_DIR, { recursive: true, force: true });
  ensureDir(SHARE_DIR);

  let created = 0;

  list.forEach((product) => {
    const slug = productSlug(product);

    const sharePath = `/share/${slug}/`;
    const detailPath = detailHref(product, slug);
    const shareUrl = absoluteUrl(sharePath);
    const detailUrl = absoluteUrl(detailPath);
    const imageUrl = absoluteUrl(productImage(product));
    const title = productTitle(product);
    const description = productDescription(product);
    const html = shareHtml({ title, description, imageUrl, shareUrl, detailUrl });

    const outDir = path.join(SHARE_DIR, slug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
    created += 1;
  });

  console.log(`Share pages generated: ${created}`);
}

main();
