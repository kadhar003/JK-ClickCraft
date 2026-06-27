/**
 * dashboard.js
 * ---------------------------------------------------------------------------
 * Controls the Admin Dashboard UI:
 *  - Route guard (redirects to login if not an authenticated allow-listed admin)
 *  - Renders review cards from the live Firestore data (reviews.js)
 *  - Stats bar (total / pending / approved / rejected / average rating)
 *  - Search, status filter, pagination
 *  - Approve / Reject / Delete / View Details actions
 * ---------------------------------------------------------------------------
 */

let allReviews = [];
let filteredReviews = [];
let currentUserEmail = null;

const state = {
  search: "",
  status: "all", // all | pending | approved | rejected
  page: 1,
  pageSize: 9
};

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();
  guardRoute();
  bindUIEvents();
});

/** Ensure only logged-in, allow-listed admins can view this page */
function guardRoute() {
  auth.onAuthStateChanged((user) => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      window.location.href = "index.html";
      return;
    }
    currentUserEmail = user.email;
    document.getElementById("adminEmailLabel").textContent = user.email;
    startReviewsListener();
  });
}

function startReviewsListener() {
  toggleSkeleton(true);
  ReviewsAPI.listenAll(
    (reviews) => {
      allReviews = reviews;
      toggleSkeleton(false);
      applyFiltersAndRender();
    },
    () => {
      toggleSkeleton(false);
      showToast("Failed to load reviews. Check your connection.", "error");
    }
  );
}

function toggleSkeleton(show) {
  document.getElementById("skeletonGrid").style.display = show ? "grid" : "none";
  document.getElementById("reviewsGrid").style.display = show ? "none" : "grid";
}

/* ----------------------------- Filtering ------------------------------- */

function applyFiltersAndRender() {
  const term = state.search.toLowerCase();

  filteredReviews = allReviews.filter((r) => {
    const matchesStatus = state.status === "all" || (r.status || "pending") === state.status;
    const matchesSearch =
      !term ||
      r.name?.toLowerCase().includes(term) ||
      r.company?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.serviceType?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  renderStats();
  renderPagination();
  renderGrid();
}

/* ------------------------------- Stats --------------------------------- */

function renderStats() {
  const total = allReviews.length;
  const pending = allReviews.filter((r) => (r.status || "pending") === "pending").length;
  const approved = allReviews.filter((r) => r.status === "approved").length;
  const rejected = allReviews.filter((r) => r.status === "rejected").length;
  const ratings = allReviews.map((r) => Number(r.rating) || 0).filter(Boolean);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "0.0";

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statRejected").textContent = rejected;
  document.getElementById("statAvgRating").textContent = avg;
}

/* ------------------------------- Grid ----------------------------------- */

function renderGrid() {
  const grid = document.getElementById("reviewsGrid");
  const emptyState = document.getElementById("emptyState");

  const start = (state.page - 1) * state.pageSize;
  const pageItems = filteredReviews.slice(start, start + state.pageSize);

  if (!pageItems.length) {
    grid.innerHTML = "";
    emptyState.style.display = "flex";
    return;
  }
  emptyState.style.display = "none";

  grid.innerHTML = pageItems.map(reviewCardTemplate).join("");
}

function reviewCardTemplate(r) {
  const status = r.status || "pending";
  return `
    <article class="review-card review-card--${status}" data-id="${r.id}">
      <header class="review-card__header">
        <div class="review-card__avatar">${escapeHTML((r.name || "?").charAt(0).toUpperCase())}</div>
        <div class="review-card__identity">
          <h3>${escapeHTML(r.name || "Anonymous")}</h3>
          <p>${escapeHTML(r.company || "—")}</p>
        </div>
        <span class="badge badge--${status}">${status}</span>
      </header>

      <div class="review-card__meta">
        <span>📧 ${escapeHTML(r.email || "—")}</span>
        <span>🛠️ ${escapeHTML(r.serviceType || "—")}</span>
        <span>🗓️ ${formatDate(r.submittedAt)}</span>
      </div>

      <div class="review-card__rating" title="${r.rating || 0} / 5">
        ${renderStars(r.rating)}
      </div>

      <p class="review-card__message">${escapeHTML(truncate(r.message, 160))}</p>

      <footer class="review-card__actions">
        <button class="btn btn--ghost" onclick="openDetails('${r.id}')">View</button>
        <button class="btn btn--success" ${status === "approved" ? "disabled" : ""} onclick="handleApprove('${r.id}')">Approve</button>
        <button class="btn btn--warning" ${status === "rejected" ? "disabled" : ""} onclick="handleReject('${r.id}')">Reject</button>
        <button class="btn btn--danger" onclick="handleDelete('${r.id}')">Delete</button>
      </footer>
    </article>
  `;
}

function truncate(str = "", n) {
  return str.length > n ? str.slice(0, n).trim() + "…" : str;
}

/* ----------------------------- Pagination -------------------------------- */

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);

  const el = document.getElementById("pagination");
  el.innerHTML = `
    <button class="page-btn" ${state.page === 1 ? "disabled" : ""} onclick="changePage(${state.page - 1})">‹ Prev</button>
    <span class="page-info">Page ${state.page} of ${totalPages}</span>
    <button class="page-btn" ${state.page === totalPages ? "disabled" : ""} onclick="changePage(${state.page + 1})">Next ›</button>
  `;
}

function changePage(p) {
  state.page = p;
  renderGrid();
  renderPagination();
}

/* ------------------------------- Actions ---------------------------------- */

async function handleApprove(id) {
  try {
    await ReviewsAPI.approve(id, currentUserEmail);
    await ReviewsAPI.logAction("approve", id, currentUserEmail);
    showToast("Review approved and published to website.", "success");
  } catch (err) {
    console.error(err);
    showToast("Could not approve review.", "error");
  }
}

async function handleReject(id) {
  try {
    await ReviewsAPI.reject(id, currentUserEmail);
    await ReviewsAPI.logAction("reject", id, currentUserEmail);
    showToast("Review rejected and hidden from website.", "warning");
  } catch (err) {
    console.error(err);
    showToast("Could not reject review.", "error");
  }
}

async function handleDelete(id) {
  if (!confirm("Permanently delete this review? This cannot be undone.")) return;
  try {
    await ReviewsAPI.remove(id);
    await ReviewsAPI.logAction("delete", id, currentUserEmail);
    showToast("Review deleted.", "success");
    closeDetails();
  } catch (err) {
    console.error(err);
    showToast("Could not delete review.", "error");
  }
}

/* ------------------------------- Modal ------------------------------------ */

function openDetails(id) {
  const r = allReviews.find((x) => x.id === id);
  if (!r) return;
  const status = r.status || "pending";

  document.getElementById("modalBody").innerHTML = `
    <div class="modal-detail__header">
      <div class="review-card__avatar review-card__avatar--lg">${escapeHTML((r.name || "?").charAt(0).toUpperCase())}</div>
      <div>
        <h2>${escapeHTML(r.name || "Anonymous")}</h2>
        <p>${escapeHTML(r.company || "—")}</p>
        <span class="badge badge--${status}">${status}</span>
      </div>
    </div>
    <dl class="modal-detail__grid">
      <dt>Email</dt><dd>${escapeHTML(r.email || "—")}</dd>
      <dt>Service Type</dt><dd>${escapeHTML(r.serviceType || "—")}</dd>
      <dt>Rating</dt><dd>${renderStars(r.rating)} (${r.rating || 0}/5)</dd>
      <dt>Submitted</dt><dd>${formatDate(r.submittedAt)}</dd>
      <dt>Reviewed By</dt><dd>${escapeHTML(r.reviewedBy || "—")}</dd>
      <dt>Source</dt><dd>${escapeHTML(r.source || "manual")}</dd>
    </dl>
    <div class="modal-detail__message">
      <h4>Review Message</h4>
      <p>${escapeHTML(r.message || "—")}</p>
    </div>
    <div class="modal-detail__actions">
      <button class="btn btn--success" onclick="handleApprove('${r.id}')">Approve</button>
      <button class="btn btn--warning" onclick="handleReject('${r.id}')">Reject</button>
      <button class="btn btn--danger" onclick="handleDelete('${r.id}')">Delete</button>
    </div>
  `;
  document.getElementById("detailsModal").classList.add("modal--open");
}

function closeDetails() {
  document.getElementById("detailsModal").classList.remove("modal--open");
}

/* --------------------------------- UI bindings ------------------------------ */

function bindUIEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", logoutAdmin);
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

  document.getElementById("searchInput")?.addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      applyFiltersAndRender();
    }, 250)
  );

  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.status = tab.dataset.status;
      state.page = 1;
      applyFiltersAndRender();
    });
  });

  document.getElementById("modalCloseBtn")?.addEventListener("click", closeDetails);
  document.getElementById("detailsModal")?.addEventListener("click", (e) => {
    if (e.target.id === "detailsModal") closeDetails();
  });
}
