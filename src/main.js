import './style.css';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { loadPdf, composePdf, parseRanges } from './pdf.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const $ = (id) => document.getElementById(id);
const MAX_BYTES = 50 * 1024 * 1024, MAX_PAGES = 300;
const config = {
  merge: ['Unir documentos', 'Agrega tus PDF y elige el orden de los archivos.', 'Unir PDF', 'documentos-unidos'],
  split: ['Dividir documento', 'Elige el PDF y las páginas que quieres guardar.', 'Extraer páginas', 'paginas-extraidas'],
  organize: ['Organizar páginas', 'Cambia el orden, gira o elimina páginas antes de guardar.', 'Guardar PDF', 'documento-organizado'],
};
let mode = 'merge', sources = new Map(), entries = [], counter = 0, busy = false, resultUrl = null;
const renderDocs = new Map();
function setBusy(value) {
  busy = value; document.body.classList.toggle('busy', value);
  document.querySelectorAll('button').forEach(b => b.disabled = value || b.dataset.edge === 'true');
  $('files').disabled = value; $('ranges').disabled = value; $('filename').disabled = value;
  if (!value) $('process').disabled = !entries.length;
}
function clearResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = null; $('result').hidden = true; $('download').removeAttribute('href');
}
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
function invalidate() { clearResult(); error(''); $('status').textContent = ''; }
function clearSession() {
  for (const doc of renderDocs.values()) doc.destroy();
  renderDocs.clear(); sources.clear(); entries = []; $('files').value = ''; $('ranges').value = ''; invalidate(); render();
}
function button(label, text, handler, disabled = false) {
  const el = document.createElement('button'); el.className = 'mini'; el.type = 'button'; el.textContent = text; el.setAttribute('aria-label', label); el.title = label; el.disabled = disabled; el.dataset.edge = String(disabled); el.onclick = () => { invalidate(); handler(); }; return el;
}
function move(index, direction) {
  [entries[index], entries[index + direction]] = [entries[index + direction], entries[index]];
  render();
}
function remove(index) {
  entries.splice(index, 1);
  for (const [id] of sources) if (!entries.some(e => e.source === id)) {
    sources.delete(id); renderDocs.get(id)?.destroy(); renderDocs.delete(id);
  }
  render();
}
function render() {
  $('items').replaceChildren();
  const count = mode === 'merge' ? [...sources.values()].reduce((sum, s) => sum + s.pages, 0) : entries.length;
  $('count').textContent = `${sources.size} archivo${sources.size === 1 ? '' : 's'} · ${count} página${count === 1 ? '' : 's'}`;
  $('count').hidden = !entries.length;
  $('dropzone').hidden = Boolean(entries.length);
  $('session-actions').hidden = !entries.length;
  $('add').hidden = mode !== 'merge';
  $('split-options').hidden = mode !== 'split' || !entries.length;
  $('export-row').hidden = !entries.length;
  $('process').disabled = !entries.length || busy;
  entries.forEach((entry, index) => {
    const source = sources.get(entry.source), article = document.createElement('article'); article.className = 'pdf-item';
    const preview = document.createElement('div'); preview.className = 'thumbnail';
    const image = source.thumbnails.get(entry.index);
    if (image) { const img = document.createElement('img'); img.src = image; img.alt = ''; img.style.cssText = `max-width:100%;max-height:100%;object-fit:contain;transform:rotate(${entry.rotation}deg)`; preview.append(img); }
    else { const placeholder = document.createElement('div'); placeholder.className = 'fallback'; placeholder.textContent = 'PDF'; preview.append(placeholder); }
    const name = document.createElement('div'); name.className = 'item-name'; name.textContent = mode === 'merge' ? source.name : `Página ${entry.index + 1}`;
    const detail = document.createElement('div'); detail.className = 'item-detail'; detail.textContent = mode === 'merge' ? `${source.pages} páginas · ${(source.bytes.byteLength / 1024 / 1024).toFixed(1)} MB` : `${source.name}${entry.rotation ? ' · giro ' + entry.rotation + '°' : ''}`;
    article.append(preview, name, detail);
    if (mode !== 'split') {
      const actions = document.createElement('div'); actions.className = 'item-actions';
      actions.append(button(`Mover ${name.textContent} antes`, '←', () => move(index, -1), index === 0), button(`Mover ${name.textContent} después`, '→', () => move(index, 1), index === entries.length - 1));
      if (mode === 'organize') actions.append(button(`Girar ${name.textContent} 90 grados`, '↻', () => { entry.rotation = (entry.rotation + 90) % 360; render(); }));
      actions.append(button(`Eliminar ${name.textContent}`, '×', () => remove(index)));
      article.append(actions);
    }
    $('items').append(article);
  });
}
async function thumbnails(source) {
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: source.bytes.slice(), isEvalSupported: false }).promise;
    renderDocs.set(source.id, doc);
    const indices = mode === 'merge' ? [0] : Array.from({ length: source.pages }, (_, i) => i);
    for (const index of indices) {
      const page = await doc.getPage(index + 1), initial = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(220 / initial.width, 260 / initial.height) });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      source.thumbnails.set(index, canvas.toDataURL('image/jpeg', .75));
      canvas.width = canvas.height = 0; page.cleanup();
      if (index % 8 === 0) $('status').textContent = `Preparando vista previa: ${index + 1} de ${source.pages} páginas…`;
    }
  } catch { $('status').textContent = 'Algunas miniaturas no están disponibles. Puedes procesar el documento.'; }
  finally { if (doc) { await doc.destroy(); renderDocs.delete(source.id); } }
}
async function addFiles(fileList) {
  if (busy || !fileList.length) return;
  invalidate();
  const files = Array.from(fileList);
  if (mode !== 'merge' && (files.length > 1 || sources.size)) return error('Para esta herramienta selecciona un solo PDF. Limpia la sesión para cambiarlo.');
  const existingBytes = [...sources.values()].reduce((sum, s) => sum + s.bytes.byteLength, 0);
  if (files.reduce((sum, f) => sum + f.size, existingBytes) > MAX_BYTES) return error('Los archivos superan el límite de 50 MB por sesión.');
  setBusy(true); const failures = [];
  try {
    for (const file of files) {
      try {
        $('status').textContent = `Abriendo ${file.name}…`;
        if (!/\.pdf$/i.test(file.name)) throw new Error('Selecciona un archivo con extensión PDF.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error('Este archivo no parece ser un PDF válido.');
        const doc = await loadPdf(bytes), pages = doc.getPageCount();
        if ([...sources.values()].reduce((n, s) => n + s.pages, pages) > MAX_PAGES) throw new Error('Se supera el límite de 300 páginas por sesión.');
        const source = { id: ++counter, name: file.name, bytes, pages, thumbnails: new Map() };
        sources.set(source.id, source);
        if (mode === 'merge') entries.push({ source: source.id, index: 0, rotation: 0 });
        else for (let i = 0; i < pages; i++) entries.push({ source: source.id, index: i, rotation: 0 });
        await thumbnails(source); render();
      } catch (err) { failures.push(`${file.name}: ${err.message}`); }
    }
    if (mode === 'split' && entries.length) $('ranges').value = entries.length === 1 ? '1' : `1-${entries.length}`;
    $('status').textContent = entries.length ? 'Listo para procesar.' : '';
    error(failures.join('\n'));
  } finally { $('files').value = ''; render(); setBusy(false); }
}
$('files').onchange = event => addFiles(event.target.files);
$('add').onclick = () => $('files').click();
$('reset').onclick = clearSession;
$('dropzone').ondragover = event => { event.preventDefault(); if (!busy) $('dropzone').classList.add('dragging'); };
$('dropzone').ondragleave = () => $('dropzone').classList.remove('dragging');
$('dropzone').ondrop = event => { event.preventDefault(); $('dropzone').classList.remove('dragging'); addFiles(event.dataTransfer.files); };
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
document.querySelectorAll('[data-mode]').forEach(tab => tab.onclick = () => {
  if (mode === tab.dataset.mode || busy) return;
  if (sources.size && !confirm('Cambiar de herramienta limpiará los archivos de esta sesión. ¿Continuar?')) return;
  clearSession(); mode = tab.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(t => t.setAttribute('aria-pressed', String(t === tab)));
  const [title, description, action, filename] = config[mode];
  $('workspace-title').textContent = title; $('workspace-description').textContent = description; $('process').textContent = action; $('filename').value = filename;
  $('files').multiple = mode === 'merge'; $('upload-label').textContent = mode === 'merge' ? 'Seleccionar archivos PDF' : 'Seleccionar un PDF'; render();
});
$('ranges').oninput = invalidate; $('filename').oninput = invalidate;
$('process').onclick = async () => {
  if (busy || !entries.length) return;
  invalidate(); setBusy(true); $('status').textContent = 'Preparando tu PDF…';
  try {
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    let pages;
    if (mode === 'merge') pages = entries.flatMap(entry => Array.from({ length: sources.get(entry.source).pages }, (_, index) => ({ source: entry.source, index, rotation: 0 })));
    else if (mode === 'split') pages = parseRanges($('ranges').value, entries.length).map(index => entries[index]);
    else pages = entries;
    const bytes = await composePdf(sources, pages);
    resultUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const filename = ($('filename').value.trim().replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '') || config[mode][3]) + '.pdf';
    $('download').href = resultUrl; $('download').download = filename; $('result').hidden = false;
    $('status').textContent = `PDF listo: ${pages.length} página${pages.length === 1 ? '' : 's'} · ${(bytes.length / 1024 / 1024).toFixed(2)} MB.`;
    $('download').click();
  } catch (err) { error(err.message || 'No se pudo procesar este documento.'); $('status').textContent = ''; }
  finally { setBusy(false); }
};
window.addEventListener('beforeunload', () => { if (resultUrl) URL.revokeObjectURL(resultUrl); });
render();
