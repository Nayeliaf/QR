(function () {
  const PLACEHOLDER_AVATAR =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="120" height="120" fill="#f2f2f2"/>
      <circle cx="60" cy="46" r="22" fill="#d7d7d7"/>
      <rect x="26" y="74" width="68" height="34" rx="17" fill="#d7d7d7"/>
    </svg>`);

  function toDriveDirectUrl(value) {
    if (!value) return "";
    const first = String(value).split(",")[0].trim();
    const idMatch = first.match(/id=([a-zA-Z0-9_-]+)/) || first.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return first;
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  function fmt(ts) {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi} · ${dd}/${mm}/${yy}`;
  }

  window.ui = {
    PLACEHOLDER_AVATAR,
    toDriveDirectUrl,
    escapeHtml,
    fmt
  };
})();