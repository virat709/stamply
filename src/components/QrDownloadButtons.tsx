"use client";

import { downloadQrPng, downloadQrSvg } from "@/lib/qr";

/** PNG/SVG download buttons shared by the counter and community QR cards.
 *  Kept in its own module because Next.js page files may only export the page
 *  component and a small set of route options. */
export function QrDownloadButtons({ svg, filenameBase, onDone }: {
  svg: SVGSVGElement | null;
  filenameBase: string;
  onDone: (msg: string, kind?: "ok" | "error") => void;
}) {
  async function png() {
    if (!svg) { onDone("QR not ready yet — try again in a moment.", "error"); return; }
    try {
      await downloadQrPng(svg, `${filenameBase}.png`);
      onDone("QR saved as PNG");
    } catch (e) {
      onDone((e as Error).message || "Download failed", "error");
    }
  }
  function svgdl() {
    if (!svg) { onDone("QR not ready yet — try again in a moment.", "error"); return; }
    try {
      downloadQrSvg(svg, `${filenameBase}.svg`);
      onDone("QR saved as SVG");
    } catch {
      onDone("Download failed", "error");
    }
  }
  return (
    <div className="flex gap-2 justify-center mt-3">
      <button type="button" onClick={png}
        className="btn-ghost rounded-full px-4 py-2 text-xs font-semibold active:scale-[0.96] transition-transform touch-manipulation cursor-pointer select-none">
        ⬇ PNG
      </button>
      <button type="button" onClick={svgdl}
        className="btn-ghost rounded-full px-4 py-2 text-xs font-semibold active:scale-[0.96] transition-transform touch-manipulation cursor-pointer select-none">
        ⬇ SVG
      </button>
    </div>
  );
}
