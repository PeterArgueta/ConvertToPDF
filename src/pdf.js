import { PDFDocument, degrees } from 'pdf-lib';

export function parseRanges(value, count) {
  if (!value.trim()) throw new Error('Escribe las páginas que deseas extraer.');
  const result = [];
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Usa un formato como 1-3, 5, 8-10.');
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end > count || start > end) throw new Error(`Elige páginas entre 1 y ${count}, en rangos ascendentes.`);
    for (let p = start; p <= end; p++) if (!result.includes(p - 1)) result.push(p - 1);
  }
  return result;
}

export async function loadPdf(bytes) {
  try {
    const doc = await PDFDocument.load(bytes);
    if (!doc.getPageCount()) throw new Error('empty');
    return doc;
  } catch (err) {
    if (/encrypt|password/i.test(String(err))) throw new Error('Este PDF está protegido con contraseña. Guarda una copia sin protección para utilizarlo.');
    throw new Error('No se pudo abrir el PDF. Puede estar dañado o tener un formato incompatible.');
  }
}

export async function composePdf(sources, pages) {
  if (!pages.length) throw new Error('Conserva al menos una página.');
  const output = await PDFDocument.create();
  const docs = new Map();
  for (const page of pages) {
    if (!docs.has(page.source)) docs.set(page.source, await loadPdf(sources.get(page.source).bytes));
    const [copy] = await output.copyPages(docs.get(page.source), [page.index]);
    copy.setRotation(degrees((copy.getRotation().angle + page.rotation) % 360));
    output.addPage(copy);
  }
  return output.save();
}
