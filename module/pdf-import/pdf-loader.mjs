/**
 * Lazy loader for the vendored pdf.js (module/vendor/pdfjs/). Foundry loads
 * system code as native ES modules with no bundler, so pdf.js is vendored
 * rather than resolved from node_modules. Same approach as blades68.
 */

let pdfjsLibPromise = null;

// pdf.js calls Math.sumPrecise, which some Chromium/Electron builds lack.
Math.sumPrecise ??= (values) => {
  let sum = 0;
  for (const value of values) sum += value;
  return sum;
};

export async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("../vendor/pdfjs/pdf.mjs").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "systems/carl-rpg/module/vendor/pdfjs/pdf.worker.mjs",
        window.location.origin,
      ).href;
      return lib;
    });
  }
  return pdfjsLibPromise;
}

/**
 * @param {File} file  The user's own PDF, picked in the browser.
 * @returns {Promise<{pdfjs: object, pdfDoc: object}>}
 */
export async function loadPdfDocument(file) {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  return { pdfjs, pdfDoc };
}
