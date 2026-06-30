/**
 * utils.js
 * ---------------------------------------------------------------------------
 * Small reusable helpers shared by auth.js and dashboard.js.
 * Kept dependency-free so this file can also be reused on the public site.
 * ---------------------------------------------------------------------------
 */

/** Show a toast notification (success | error | info | warning) */
function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return console.log(`[toast:${type}]`, message);

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${escapeHTML(message)}</span>
    <button class="toast__close" aria-label="Dismiss">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  const remove = () => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector(".toast__close").addEventListener("click", remove);
  setTimeout(remove, duration);
}

/** Prevent basic HTML/script injection when rendering user-submitted text */
function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Format a Firestore Timestamp / Date / ISO string into a readable date */
function formatDate(value) {
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

/** Build a star-rating HTML string (e.g. ★★★★☆) */
function renderStars(rating = 0) {
  const r = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 }, (_, i) =>
    i < r ? "★" : "☆"
  ).join("");
}

/** Debounce helper used for the search input */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Toggle a full-screen / inline loading spinner */
function setLoading(el, isLoading, loadingText = "Loading...") {
  if (!el) return;
  if (isLoading) {
    el.dataset.originalContent = el.innerHTML;
    el.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    el.disabled = true;
  } else {
    if (el.dataset.originalContent) el.innerHTML = el.dataset.originalContent;
    el.disabled = false;
  }
}

/** Get / set the persisted dark-mode preference */
function applyStoredTheme() {
  const theme = localStorage.getItem("jkcc_admin_theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("jkcc_admin_theme", next);
  return next;
}
