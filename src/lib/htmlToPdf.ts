import html2pdf from 'html2pdf.js';

export function downloadHtmlAsPdf(html: string, filename: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  html2pdf()
    .set({
      margin: 10,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save()
    .then(() => {
      document.body.removeChild(container);
    });
}

export function printHtml(html: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
