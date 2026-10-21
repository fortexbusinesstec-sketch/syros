import type { Editor } from "@tiptap/core";
import mermaid from "mermaid";

/*
 * Exportación a PDF limpia: en vez de imprimir la página de la app (con su layout, scroll
 * interno y controles de edición), se arma un documento HTML aparte con el contenido del
 * editor y se imprime en un iframe oculto. Las tablas y los diagramas se convierten a HTML
 * estático desde su estado guardado, así no aparecen botones, buscadores ni textareas.
 */

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const dateFormat = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });

function parseState(raw: string | null): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function structuredCell(type: string, value: any): string {
  if (value === undefined || value === null || value === "") return "";
  switch (type) {
    case "checkbox":
      return value ? "✓" : "";
    case "multiselect":
      return escapeHtml(Array.isArray(value) ? value.join(", ") : value);
    case "date": {
      const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
      return Number.isNaN(date.getTime()) ? escapeHtml(value) : dateFormat.format(date);
    }
    case "url":
      return `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`;
    default:
      return escapeHtml(value).replace(/\n/g, "<br>");
  }
}

function structuredTableHtml(raw: string | null): string {
  const state = parseState(raw);
  if (!state?.columns?.length) return "";
  const columns: { id: string; title: string; type: string }[] = state.columns;
  const head = columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join("");
  const body = (state.rows ?? [])
    .map(
      (row: any) =>
        `<tr>${columns
          .map((column) => `<td class="type-${column.type}">${structuredCell(column.type, row[column.id])}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function simpleTableHtml(raw: string | null): string {
  const state = parseState(raw);
  const data: { value: string; style?: any }[][] = state?.data ?? [];
  if (!data.length) return "";
  const rows = data
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => {
          const header = (state.headerRow && rowIndex === 0) || (state.headerCol && colIndex === 0);
          const tag = header ? "th" : "td";
          const style = cell.style ?? {};
          const css = [
            style.align ? `text-align:${style.align}` : "",
            style.bold ? "font-weight:700" : "",
            style.italic ? "font-style:italic" : "",
            style.underline ? "text-decoration:underline" : "",
          ]
            .filter(Boolean)
            .join(";");
          return `<${tag}${css ? ` style="${css}"` : ""}>${escapeHtml(cell.value).replace(/\n/g, "<br>")}</${tag}>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table>${rows}</table>`;
}

async function mermaidHtml(raw: string | null): Promise<string> {
  let code = "";
  try {
    code = raw ? (JSON.parse(raw) as string) : "";
  } catch {
    code = raw ?? "";
  }
  if (!code.trim()) return "";
  try {
    const id = `print-mermaid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    // Etiquetas SVG nativas (no HTML): se miden y se dibujan con la misma fuente, así no se cortan
    // al pasar del documento de la app al iframe de impresión.
    const printable = `%%{init: {"htmlLabels": false, "flowchart": {"htmlLabels": false}}}%%\n${code}`;
    const { svg } = await mermaid.render(id, printable);
    return `<figure class="diagram">${svg}</figure>`;
  } catch {
    return `<pre>${escapeHtml(code)}</pre>`;
  }
}

const PRINT_CSS = `
  @page { size: A4; margin: 1.6cm 1.5cm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1e293b; font-size: 10.5pt; line-height: 1.6;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1, h2, h3, h4 { color: #0f172a; line-height: 1.3; break-after: avoid; page-break-after: avoid; }
  h1 { font-size: 20pt; font-weight: 800; margin: 0 0 12pt; }
  h2 { font-size: 14pt; font-weight: 700; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 12pt; font-weight: 600; margin: 14pt 0 4pt; }
  h4 { font-size: 11pt; font-weight: 600; margin: 10pt 0 4pt; }
  p { margin: 5pt 0; orphans: 3; widows: 3; }
  p:empty { display: none; }
  ul, ol { margin: 5pt 0; padding-left: 18pt; }
  li { margin: 2pt 0; }
  li > p { margin: 0; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 6pt; align-items: flex-start; }
  ul[data-type="taskList"] li > label { flex-shrink: 0; }
  blockquote { margin: 8pt 0; padding: 4pt 0 4pt 10pt; border-left: 3px solid #3b82f6; color: #475569; font-style: italic; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: 9pt; background: #f1f5f9; padding: 1pt 3pt; border-radius: 3px; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8pt 10pt; white-space: pre-wrap; word-break: break-word; font-size: 9pt; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  a { color: #1d4ed8; text-decoration: underline; word-break: break-all; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 14pt 0; }
  img { max-width: 100%; height: auto; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 9pt; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; vertical-align: top; overflow-wrap: break-word; hyphens: auto; }
  th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
  td.type-number { text-align: right; }
  td.type-checkbox { text-align: center; }
  figure.diagram { margin: 10pt 0; text-align: center; break-inside: avoid; }
  figure.diagram svg { max-width: 100%; height: auto; }
  [style*="page-break-after"] { page-break-after: always; break-after: page; }
`;

export async function printEditorContent(editor: Editor, title: string): Promise<void> {
  const container = document.createElement("div");
  container.innerHTML = editor.getHTML();

  container.querySelectorAll('div[data-type="structured-table"]').forEach((element) => {
    element.outerHTML = structuredTableHtml(element.getAttribute("data-state"));
  });
  container.querySelectorAll('div[data-type="simple-table"]').forEach((element) => {
    element.outerHTML = simpleTableHtml(element.getAttribute("data-state"));
  });
  for (const element of Array.from(container.querySelectorAll('div[data-type="mermaid"]'))) {
    element.outerHTML = await mermaidHtml(element.getAttribute("data-code"));
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>${PRINT_CSS}</style></head><body>${container.innerHTML}</body></html>`);
  doc.close();

  const frameWindow = iframe.contentWindow!;
  // Espera a que carguen la fuente y las imágenes antes de abrir el diálogo de impresión.
  await new Promise<void>((resolve) => {
    if (doc.readyState === "complete") resolve();
    else frameWindow.addEventListener("load", () => resolve(), { once: true });
  });
  await Promise.race([doc.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  frameWindow.focus();
  frameWindow.print();
  // Algunos navegadores no emiten afterprint; se limpia igual pasado un tiempo prudente.
  setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
}
