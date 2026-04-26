const express = require('express');
const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');
const { getDb } = require('../config/database');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'seller'));

router.get('/products', async (req, res) => {
  try {
    const db = getDb();
    const { generatedOnly } = req.query;

    const rows = await db.all(
      `SELECT id, name, barcode, generated_barcode, size, color, sale_price
       FROM products
       WHERE active = 1
         AND (? != 1 OR generated_barcode = 1)
       ORDER BY name ASC`,
      [generatedOnly && String(generatedOnly) !== '0' ? 1 : 0]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo listar productos para etiquetas.' });
  }
});

router.get('/barcode/:barcode.png', async (req, res) => {
  try {
    const { barcode } = req.params;
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcode,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    });

    res.setHeader('Content-Type', 'image/png');
    return res.send(png);
  } catch (error) {
    return res.status(400).json({ message: 'No se pudo generar la imagen del codigo.' });
  }
});

router.get('/pdf', async (req, res) => {
  try {
    const db = getDb();
    const { productIds } = req.query;

    if (!productIds) {
      return res.status(400).json({ message: 'Debes enviar productIds=1,2,3' });
    }

    const ids = String(productIds)
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!ids.length) {
      return res.status(400).json({ message: 'No hay productos validos para imprimir.' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const products = await db.all(
      `SELECT id, name, barcode, size, color, sale_price
       FROM products
       WHERE id IN (${placeholders})
       ORDER BY name ASC`,
      ids
    );

    if (!products.length) {
      return res.status(404).json({ message: 'No se encontraron productos para etiquetas.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="etiquetas-productos.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 28 });
    doc.pipe(res);

    const columns = 2;
    const labelWidth = 260;
    const labelHeight = 110;
    const gap = 12;

    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const position = index % 8;
      const row = Math.floor(position / columns);
      const col = position % columns;

      if (index > 0 && position === 0) {
        doc.addPage();
      }

      const x = doc.page.margins.left + col * (labelWidth + gap);
      const y = doc.page.margins.top + row * (labelHeight + gap);

      doc.roundedRect(x, y, labelWidth, labelHeight, 6).stroke('#AAAAAA');
      doc.fontSize(10).text(product.name, x + 8, y + 8, { width: labelWidth - 16 });

      const detail = `${product.size || '-'} | ${product.color || '-'} | $${Number(product.sale_price).toFixed(2)}`;
      doc.fontSize(8).fillColor('#444444').text(detail, x + 8, y + 28, { width: labelWidth - 16 });
      doc.fillColor('#000000');

      const barcodePng = await bwipjs.toBuffer({
        bcid: 'code128',
        text: product.barcode,
        scale: 2,
        height: 8,
        includetext: true,
        textxalign: 'center'
      });

      doc.image(barcodePng, x + 8, y + 46, { width: labelWidth - 16, height: 56, fit: [labelWidth - 16, 56] });
    }

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo generar el PDF de etiquetas.' });
  }
});

module.exports = router;
