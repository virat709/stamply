// Download helpers for QR codes rendered by qrcode.react.
// PNG is rasterized through a canvas (clean, printable, no external calls).

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function svgMarkup(svg: SVGSVGElement, size: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  return new XMLSerializer().serializeToString(clone);
}

export function downloadQrSvg(svg: SVGSVGElement, filename: string, size = 1024): void {
  const blob = new Blob([svgMarkup(svg, size)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadQrPng(svg: SVGSVGElement, filename: string, size = 1024): Promise<void> {
  const pad = Math.round(size * 0.06); // white quiet zone for print scans
  const markup = svgMarkup(svg, size);
  // Use a data URI instead of an object URL so rasterization works in Firefox
  // and mobile browsers (Safari, Chrome mobile) which restrict blob: URLs in
  // cross-origin or sandboxed contexts.
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterize the QR code."));
    img.src = dataUri;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size + pad * 2;
  canvas.height = size + pad * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, pad, pad, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not export the image.");
  const pngUrl = URL.createObjectURL(blob);
  triggerDownload(pngUrl, filename);
  setTimeout(() => URL.revokeObjectURL(pngUrl), 4000);
}
