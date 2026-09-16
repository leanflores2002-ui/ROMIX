const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const PUBLIC = path.resolve(__dirname, '../frontend/public');
const LIMIT = 400000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function localFile(value) {
  const decoded = decodeURIComponent(String(value).replace(/\\/g, '/').replace(/^\/+/, ''));
  const file = path.resolve(PUBLIC, decoded);
  if (!file.startsWith(PUBLIC + path.sep)) throw new Error(`Invalid image path: ${value}`);
  return file;
}

async function prepareSocialImage(product, slug) {
  // The storefront's primary image is authoritative; do not pick a random color.
  const source = String(product.image || '').trim();
  if (!source || /placeholder|logo-romix/i.test(source)) throw new Error(`Missing primary image: ${product.id}`);
  let input;
  if (/^https:\/\//i.test(source)) {
    const response = await fetch(source, {signal:AbortSignal.timeout(20000)});
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid remote primary: ${source}`);
    input = Buffer.from(await response.arrayBuffer());
  } else {
    if (/^[a-z]+:/i.test(source)) throw new Error(`Image must use HTTPS: ${source}`);
    input = fs.readFileSync(localFile(source));
  }
  const metadata = await sharp(input).metadata();
  const reusable = ['jpeg','png'].includes(metadata.format) && input.length <= LIMIT
    && metadata.width >= 200 && metadata.height >= 200 && (!metadata.orientation || metadata.orientation === 1);
  let image = source, output = input, width = metadata.width, height = metadata.height;
  let type = metadata.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  if (!reusable) {
    output = await sharp(input).rotate().flatten({background:'#ffffff'})
      .resize(1200,630,{fit:'contain',background:'#ffffff'})
      .jpeg({quality:82,mozjpeg:true}).toBuffer();
    if (output.length > LIMIT) throw new Error(`Social image exceeds budget: ${slug}`);
    image = `share-previews/${slug}.jpg`;
    fs.mkdirSync(path.join(PUBLIC,'share-previews'),{recursive:true});
    fs.writeFileSync(localFile(image),output);
    width = 1200; height = 630; type = 'image/jpeg';
  }
  return {source,sourceHash:hash(input),image,imageHash:hash(output),width,height,type,bytes:output.length,dedicated:!reusable};
}

module.exports = {prepareSocialImage,localFile,hash,LIMIT};
