/**
 * public-reviews-widget.js
 * ---------------------------------------------------------------------------
 * Drop this into the main jkclickcraft.in website (in the "Reviews" /
 * "Testimonials" section) to display only APPROVED reviews in real time.
 *
 * USAGE:
 * 1. Include the Firebase compat SDKs + your firebase-config (same project,
 *    but ideally a separate *public, read-only* Firebase Web App key — the
 *    Firestore Security Rules already restrict writes to admins only, so
 *    using the same config here is safe).
 * 2. Add a container to your page:  <div id="jkcc-reviews"></div>
 * 3. Include this script after firebase-config.js.
 * ---------------------------------------------------------------------------
 */

(function () {
  const CONTAINER_ID = "jkcc-reviews";

  function starString(rating) {
    const r = Math.round(Number(rating) || 0);
    return "★".repeat(r) + "☆".repeat(5 - r);
  }

  function escapeHTML(str = "") {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderReviews(reviews) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    if (!reviews.length) {
      container.innerHTML = `<p class="jkcc-reviews-empty">No reviews yet — be the first to share your experience!</p>`;
      return;
    }

    container.innerHTML = reviews
      .map(
        (r) => `
        <div class="jkcc-review-card">
          <div class="jkcc-review-card__stars">${starString(r.rating)}</div>
          <p class="jkcc-review-card__message">"${escapeHTML(r.message)}"</p>
          <div class="jkcc-review-card__author">
            <strong>${escapeHTML(r.name)}</strong>
            <span>${escapeHTML(r.company || "")}</span>
          </div>
        </div>`
      )
      .join("");
  }

  function initReviewsWidget() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      console.warn("Firebase not initialized — reviews widget will not load.");
      return;
    }
    const db = firebase.firestore();

    db.collection("reviews")
      .where("status", "==", "approved")
      .orderBy("reviewedAt", "desc")
      .limit(20)
      .onSnapshot(
        (snapshot) => {
          const reviews = snapshot.docs.map((d) => d.data());
          renderReviews(reviews);
        },
        (err) => console.error("Could not load reviews:", err)
      );
  }

  document.addEventListener("DOMContentLoaded", initReviewsWidget);
})();
