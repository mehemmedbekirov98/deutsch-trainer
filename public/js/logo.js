// The app's logo mark: a speech bubble made of the German flag colours with a rising path inside —
// "talking your way up". Rendered as inline SVG so it inherits the current theme.

/** @param {number} size @param {string} [id] unique gradient id when several logos are on one page */
export function logoSvg(size = 44, id = "lg" + Math.random().toString(36).slice(2, 7)) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("class", "logo-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--accent, #7c5cff)"/>
        <stop offset="1" stop-color="var(--accent2, #22d3ee)"/>
      </linearGradient>
      <linearGradient id="${id}-flag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b2b2b"/><stop offset="0.33" stop-color="#2b2b2b"/>
        <stop offset="0.33" stop-color="#e8402a"/><stop offset="0.66" stop-color="#e8402a"/>
        <stop offset="0.66" stop-color="#ffcc2f"/><stop offset="1" stop-color="#ffcc2f"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#${id}-bg)"/>
    <path d="M14 20a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H29l-9 8v-8a6 6 0 0 1-6-6z"
          fill="rgba(255,255,255,.96)"/>
    <path d="M21 35l6-7 5 5 10-12" fill="none" stroke="url(#${id}-flag)" stroke-width="4"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="42" cy="21" r="3.2" fill="#e8402a"/>`;
  return svg;
}

/** Same mark as a data: URI, for <link rel="icon"> */
export const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b2b"/><stop offset=".33" stop-color="#2b2b2b"/><stop offset=".33" stop-color="#e8402a"/><stop offset=".66" stop-color="#e8402a"/><stop offset=".66" stop-color="#ffcc2f"/><stop offset="1" stop-color="#ffcc2f"/></linearGradient></defs>
<rect x="2" y="2" width="60" height="60" rx="18" fill="url(#a)"/>
<path d="M14 20a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H29l-9 8v-8a6 6 0 0 1-6-6z" fill="#fff"/>
<path d="M21 35l6-7 5 5 10-12" fill="none" stroke="url(#b)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="42" cy="21" r="3.2" fill="#e8402a"/></svg>`);
