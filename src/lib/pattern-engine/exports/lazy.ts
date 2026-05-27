export async function loadPdfExporter() {
  return import('./pdf.js');
}

export async function loadDxfExporter() {
  return import('./dxf.js');
}

export async function loadTiledHtmlExporter() {
  return import('./tiledHtml.js');
}
