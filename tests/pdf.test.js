import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, degrees } from 'pdf-lib';
import { parseRanges, composePdf, loadPdf } from '../src/pdf.js';
async function fixture(widths, rotation = 0) {
  const doc = await PDFDocument.create();
  widths.forEach((width, i) => { const page = doc.addPage([width, 700]); page.drawText(`Page ${i + 1}`); page.setRotation(degrees(rotation)); });
  return doc.save();
}
test('ranges accept whitespace and preserve requested order without duplicate pages', () => {
  assert.deepEqual(parseRanges('4, 1 - 2, 2, 5', 5), [3, 0, 1, 4]);
});
test('invalid ranges are rejected instead of silently truncating', () => {
  for (const range of ['', '0', '6', '3-1', '1,', 'a', '1.5', '-1', '1-99999999999']) assert.throws(() => parseRanges(range, 5));
});
test('merge copies pages in the selected source order', async () => {
  const sources = new Map([[1, { bytes: await fixture([400, 410]) }], [2, { bytes: await fixture([500]) }]]);
  const bytes = await composePdf(sources, [{ source: 2, index: 0, rotation: 0 }, { source: 1, index: 0, rotation: 0 }, { source: 1, index: 1, rotation: 0 }]);
  const doc = await PDFDocument.load(bytes);
  assert.deepEqual(doc.getPages().map(p => p.getWidth()), [500, 400, 410]);
  assert.ok(doc.getPages().every(p => p.node.Contents()));
});
test('extract omits unselected pages and keeps specified order', async () => {
  const sources = new Map([[1, { bytes: await fixture([400, 410, 420, 430]) }]]);
  const selected = parseRanges('4,2', 4).map(index => ({ source: 1, index, rotation: 0 }));
  const output = await loadPdf(await composePdf(sources, selected));
  assert.deepEqual(output.getPages().map(p => p.getWidth()), [430, 410]);
});
test('organize preserves existing rotation and applies additional rotation', async () => {
  const sources = new Map([[1, { bytes: await fixture([400, 410, 420], 90) }]]);
  const output = await loadPdf(await composePdf(sources, [{ source: 1, index: 2, rotation: 90 }, { source: 1, index: 0, rotation: 270 }]));
  assert.deepEqual(output.getPages().map(p => [p.getWidth(), p.getRotation().angle]), [[420, 180], [400, 0]]);
});
test('corrupt input and empty exports return errors', async () => {
  await assert.rejects(() => loadPdf(new Uint8Array([1, 2, 3])), /No se pudo abrir/);
  await assert.rejects(() => composePdf(new Map(), []), /al menos una/);
});
test('source bytes are unchanged after processing', async () => {
  const bytes = await fixture([400]); const before = bytes.slice();
  await composePdf(new Map([[1, { bytes }]]), [{ source: 1, index: 0, rotation: 90 }]);
  assert.deepEqual(bytes, before);
});
