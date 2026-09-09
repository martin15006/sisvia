/* Genera el Manual de Uso oficial (.docx) a partir de docs/MANUAL_DE_USO.md
   Marca SISVIA: portada con logo, color primario, encabezados, tablas,
   callouts y numeración de páginas. Uso:
   NODE_PATH=backend/node_modules node docs/generar_manual.cjs            */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, Footer,
  PageNumber, LevelFormat, PageBreak,
} = require('docx');

const ROOT = 'C:/Users/Usuario/Desktop/sisvia';
const mdPath = ROOT + '/docs/MANUAL_DE_USO.md';
const logoPath = ROOT + '/frontend/public/logo.png';
const outPath = ROOT + '/docs/MANUAL_DE_USO.docx';

const PRIMARIO = '1350D8';
const PRIMARIO_OSC = '0E3CA3';
const PRIMARIO_SUAVE = 'E6EEFE';
const PRIMARIO_BORDE = 'BFD4F7';
const CONTENT_W = 9360;

const md = fs.readFileSync(mdPath, 'utf8');
const lines = md.split(/\r?\n/);

function inline(text, opts) {
  opts = opts || {};
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // quita enlaces, deja el texto
  const runs = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun(Object.assign({ text: text.slice(last, m.index) }, opts)));
    if (m[1] !== undefined) runs.push(new TextRun(Object.assign({ text: m[1], bold: true }, opts)));
    else if (m[2] !== undefined) runs.push(new TextRun(Object.assign({ text: m[2], font: 'Consolas' }, opts)));
    else if (m[3] !== undefined) runs.push(new TextRun(Object.assign({ text: m[3], italics: true }, opts)));
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun(Object.assign({ text: text.slice(last) }, opts)));
  if (!runs.length) runs.push(new TextRun(Object.assign({ text: '' }, opts)));
  return runs;
}

const grayBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const cellBorders = { top: grayBorder, bottom: grayBorder, left: grayBorder, right: grayBorder };

function calloutParas(textLines) {
  return textLines.map((t, idx) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: PRIMARIO_SUAVE },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: PRIMARIO, space: 8 } },
    spacing: { before: idx === 0 ? 140 : 0, after: idx === textLines.length - 1 ? 140 : 0 },
    indent: { left: 160, right: 120 },
    children: inline(t),
  }));
}

function renderTable(rows) {
  const n = rows[0].length;
  const base = Math.floor(CONTENT_W / n);
  const widths = Array(n).fill(base);
  widths[n - 1] = CONTENT_W - base * (n - 1);
  const trs = rows.map((cells, r) => new TableRow({
    tableHeader: r === 0,
    children: cells.map((c, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.DXA },
      borders: cellBorders,
      shading: r === 0 ? { type: ShadingType.CLEAR, fill: PRIMARIO } : undefined,
      margins: { top: 60, bottom: 60, left: 110, right: 110 },
      children: [new Paragraph({ children: inline(c, r === 0 ? { bold: true, color: 'FFFFFF' } : {}) })],
    })),
  }));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: trs });
}

const body = [];
let titulo = 'Manual de Uso';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const t = line.trim();
  if (t === '' || t === '---') continue;
  if (/^# /.test(line)) { titulo = line.replace(/^# /, '').trim(); continue; }
  if (/^#### /.test(line)) { body.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: inline(line.replace(/^#### /, '')) })); continue; }
  if (/^### /.test(line)) { body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: inline(line.replace(/^### /, '')) })); continue; }
  if (/^## /.test(line)) { body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inline(line.replace(/^## /, '')) })); continue; }

  if (/^>/.test(t)) {
    const buf = [];
    while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
    i--;
    calloutParas(buf.filter((x) => x !== '')).forEach((p) => body.push(p));
    continue;
  }

  if (/^\|/.test(t)) {
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      const raw = lines[i].trim(); i++;
      if (/^\|[\s:|-]+\|$/.test(raw)) continue;
      rows.push(raw.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim()));
    }
    i--;
    if (rows.length) { body.push(renderTable(rows)); body.push(new Paragraph({ text: '', spacing: { after: 80 } })); }
    continue;
  }

  const mB = line.match(/^(\s*)[-*]\s+(.*)$/);
  if (mB) {
    const level = Math.min(2, Math.floor(mB[1].length / 2));
    body.push(new Paragraph({ numbering: { reference: 'vinetas', level }, children: inline(mB[2]) }));
    continue;
  }

  const mN = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (mN) {
    const spaces = mN[1].length;
    body.push(new Paragraph({
      indent: { left: 400 + spaces * 160, hanging: 360 },
      spacing: { after: 40 },
      children: [new TextRun({ text: mN[2] + '. ', bold: true })].concat(inline(mN[3])),
    }));
    continue;
  }

  body.push(new Paragraph({ children: inline(line), spacing: { after: 80 } }));
}

const logoData = fs.readFileSync(logoPath);
const cover = [
  new Paragraph({ spacing: { before: 1400 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: logoData, transformation: { width: 135, height: 135 }, altText: { title: 'Logo SISVIA', description: 'Logo de SISVIA', name: 'logoSisvia' } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 520 }, children: [new TextRun({ text: 'MANUAL DE USO', bold: true, size: 58, color: PRIMARIO_OSC })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 140 }, children: [new TextRun({ text: 'SISVIA', size: 30, color: '333333' })] }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: PRIMARIO, space: 1 } }, spacing: { before: 400, after: 400 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Manual del producto', size: 24, color: '555555' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: 'SISVIA · Control de vehículos', size: 22, color: '555555' })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: PRIMARIO_OSC, font: 'Arial' },
        paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARIO_BORDE, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: PRIMARIO, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 90 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, color: PRIMARIO_OSC, font: 'Arial' },
        paragraph: { spacing: { before: 170, after: 60 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: 'vinetas', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 820, hanging: 260 } } } },
        { level: 2, format: LevelFormat.BULLET, text: '▪', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1180, hanging: 260 } } } },
      ] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 6 } },
          children: [
            new TextRun({ text: 'Manual de Uso · Sistema de SISVIA      Página ', size: 18, color: '777777' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '777777' }),
          ],
        })],
      }),
    },
    children: cover.concat(body),
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log('Generado:', outPath, '(' + buf.length + ' bytes, ' + body.length + ' bloques)');
});
