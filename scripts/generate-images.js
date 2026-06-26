const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const PRODUCTS_DIR = path.join(ROOT, "frontend", "public", "images", "products");
const THUMBS_DIR = path.join(ROOT, "frontend", "public", "images", "thumbs");
const MOBILE_DIR = path.join(ROOT, "frontend", "public", "images", "mobile");
const VALID_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const THUMB_WIDTH = 720;
const MOBILE_WIDTH = 960;

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function* walkFiles(dirPath) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
      continue;
    }
    if (!VALID_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    yield fullPath;
  }
}

function relativeFromProducts(filePath) {
  return path.relative(PRODUCTS_DIR, filePath);
}

function buildOutputPath(baseDir, relativeInput, suffix, extension) {
  const parsed = path.parse(relativeInput);
  return path.join(baseDir, parsed.dir, parsed.name + suffix + extension);
}

async function isUpToDate(inputPath, outputPath) {
  try {
    const [inputStat, outputStat] = await Promise.all([
      fs.promises.stat(inputPath),
      fs.promises.stat(outputPath)
    ]);
    return outputStat.mtimeMs >= inputStat.mtimeMs;
  } catch {
    return false;
  }
}

async function generateVariant(inputPath, outputPath, transformer) {
  if (await isUpToDate(inputPath, outputPath)) return false;
  await ensureDir(path.dirname(outputPath));
  const image = sharp(inputPath, { animated: false }).rotate();
  await transformer(image).toFile(outputPath);
  return true;
}

async function main() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    throw new Error("No existe el directorio de origen: " + PRODUCTS_DIR);
  }

  let processed = 0;
  let generated = 0;

  for await (const inputPath of walkFiles(PRODUCTS_DIR)) {
    processed += 1;
    const relativeInput = relativeFromProducts(inputPath);
    const thumbWebpPath = buildOutputPath(THUMBS_DIR, relativeInput, "-thumb", ".webp");
    const thumbAvifPath = buildOutputPath(THUMBS_DIR, relativeInput, "-thumb", ".avif");
    const mobileWebpPath = buildOutputPath(MOBILE_DIR, relativeInput, "-mobile", ".webp");

    if (await generateVariant(inputPath, thumbWebpPath, (image) => image.resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 74, effort: 6 }))) {
      generated += 1;
    }
    if (await generateVariant(inputPath, thumbAvifPath, (image) => image.resize({ width: THUMB_WIDTH, withoutEnlargement: true }).avif({ quality: 58, effort: 6 }))) {
      generated += 1;
    }
    if (await generateVariant(inputPath, mobileWebpPath, (image) => image.resize({ width: MOBILE_WIDTH, withoutEnlargement: true }).webp({ quality: 76, effort: 6 }))) {
      generated += 1;
    }
  }

  console.log(`generate-images: procesados=${processed} generados=${generated}`);
}

main().catch((error) => {
  console.error("generate-images: error", error);
  process.exitCode = 1;
});
