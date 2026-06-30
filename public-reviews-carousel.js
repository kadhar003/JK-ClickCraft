/**
 * public-reviews-carousel.js
 * ---------------------------------------------------------------------------
 * Standalone carousel for displaying APPROVED client reviews in real-time.
 * Uses its own Firebase config (separate from admin dashboard).
 * 
 * USAGE:
 * 1. Include this file in index.html AFTER Firebase SDK loads
 * 2. Ensure you have the carousel HTML elements in your reviews section:
 *    - <div id="reviewsCarouselInner" class="review-carousel-inner"></div>
 *    - <div id="carouselDots" class="carousel-dots"></div>
 *    - <div id="carouselPrev" class="carousel-btn carousel-prev"></div>
 *    - <div id="carouselNext" class="carousel-btn carousel-next"></div>
 *    - <div id="reviewsEmpty" class="reviews-empty"></div>
 *    - <div id="reviewsHappyClients"></div>
 *    - <div id="reviewsProjectsDelivered"></div>
 *    - <div id="reviewsAverageRating"></div>
 * ---------------------------------------------------------------------------
 */

// ═════════════════════════════════════════════════════════════════════════
// FIREBASE CONFIG FOR REVIEWS (Public)
// ═════════════════════════════════════════════════════════════════════════
const publicReviewsFirebaseConfig = {
  apiKey: "AIzaSyD9xpzXiSFr8rbAUBwDJlnviNmbHptWD2g",
  authDomain: "jk-clickcraft-admin.firebaseapp.com",
  projectId: "jk-clickcraft-admin",
  storageBucket: "jk-clickcraft-admin.firebasestorage.app",
  messagingSenderId: "383567899492",
  appId: "1:383567899492:web:eb21aa162830a5e4f2a871",
  measurementId: "G-Z5SZEGRP07"
};

// Initialize Firebase for reviews (separate instance)
let reviewsFirebaseApp = null;
let reviewsDb = null;

function initPublicReviewsFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Make sure Firebase is included before this script.');
    return false;
  }

  try {
    reviewsFirebaseApp = firebase.initializeApp(publicReviewsFirebaseConfig, 'reviews-public');
    reviewsDb = reviewsFirebaseApp.firestore();
    console.log('✓ Public reviews Firebase initialized');
    return true;
  } catch (err) {
    if (err.code === 'app/duplicate-app') {
      // App already initialized, use existing instance
      reviewsFirebaseApp = firebase.app('reviews-public');
      reviewsDb = reviewsFirebaseApp.firestore();
      console.log('✓ Using existing reviews Firebase instance');
      return true;
    }
    console.error('Firebase initialization error:', err);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// CAROUSEL STATE MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════
const reviewsCarouselState = {
  current: 0,
  total: 0,
  autoSlideInterval: null,
  reviews: []
};

// ═════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function createReviewCardMarkup(review) {
  const stars = Array.from({ length: 5 }, (_, index) => {
    return `<span class="star ${index < Math.round(review.rating) ? 'filled' : ''}">★</span>`;
  }).join('');

  const avatarMarkup = review.logo
    ? `<img class="review-card-logo" src="${review.logo}" alt="${escapeHTML(review.name)} logo" loading="lazy" />`
    : `<div class="review-card-logo">${String(review.name || 'C').charAt(0).toUpperCase()}</div>`;

  return `
    <article class="review-card neu-card">
      <div class="review-card-header">
        <div class="review-card-identity">
          ${avatarMarkup}
          <div class="review-card-meta">
            <span class="review-card-name">${escapeHTML(review.name)}</span>
            <span class="review-card-business">${escapeHTML(review.business)}</span>
          </div>
        </div>
        <div class="review-stars" aria-label="Rating: ${review.rating} out of 5">${stars}</div>
      </div>
      <div class="review-card-body">
        <p>"${escapeHTML(review.review)}"</p>
      </div>
      <div class="review-card-service">
        <div>
          <label>Service</label>
          <span>${escapeHTML(review.service)}</span>
        </div>
        <div>
          <label>Duration</label>
          <span>${escapeHTML(review.duration)}</span>
        </div>
      </div>
    </article>
  `;
}

function normalizeReview(doc) {
  const data = doc?.data ? doc.data() : doc || {};
  const submittedSource = data.reviewedAt || data.submittedAt || data.createdAt || data.timestamp || null;
  const submittedAt = submittedSource?.toDate ? submittedSource.toDate() : new Date(submittedSource || Date.now());
  const reviewText = data.message || data.review || 'Excellent work and communication throughout the project.';
  const serviceType = data.serviceType || data.service || 'Web Design';
  const companyName = data.company || data.business || 'JK ClickCraft Client';

  return {
    id: doc?.id || data.id || '',
    name: data.name || 'Client',
    business: companyName,
    review: reviewText,
    service: serviceType,
    duration: data.duration || 'Flexible timeline',
    rating: Math.min(5, Math.max(0, Number(data.rating) || 5)),
    logo: data.logo || data.photoURL || data.avatar || '',
    submittedAt: submittedAt.toISOString(),
    status: data.status || (data.approved ? 'approved' : ''),
  };
}

function renderReviewStats(reviews, happyEl, projectsEl, averageEl) {
  const ratings = reviews.map(item => item.rating || 0);
  const averageRating = ratings.length ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : 0;
  happyEl.textContent = `${reviews.length}+`;
  projectsEl.textContent = `${Math.max(reviews.length, 1)}`;
  averageEl.textContent = averageRating ? averageRating.toFixed(1) : '0.0';
}

// ═════════════════════════════════════════════════════════════════════════
// CAROUSEL FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

function slideCarousel(direction) {
  reviewsCarouselState.current += direction;

  if (reviewsCarouselState.current < 0) {
    reviewsCarouselState.current = reviewsCarouselState.total - 1;
  } else if (reviewsCarouselState.current >= reviewsCarouselState.total) {
    reviewsCarouselState.current = 0;
  }

  updateCarousel();
  resetAutoSlide();
}

function goToSlide(idx) {
  reviewsCarouselState.current = idx;
  updateCarousel();
  resetAutoSlide();
}

function updateCarousel() {
  const carousel = document.getElementById('reviewsCarouselInner');
  if (!carousel) return;

  const offset = -reviewsCarouselState.current * 100;
  carousel.style.transform = `translateX(${offset}%)`;

  // Update dots
  const dots = document.querySelectorAll('.carousel-dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === reviewsCarouselState.current);
  });
}

function startAutoSlide() {
  if (reviewsCarouselState.autoSlideInterval) {
    clearInterval(reviewsCarouselState.autoSlideInterval);
  }

  reviewsCarouselState.autoSlideInterval = setInterval(() => {
    slideCarousel(1);
  }, 5000); // Slide every 5 seconds
}

function resetAutoSlide() {
  clearInterval(reviewsCarouselState.autoSlideInterval);
  startAutoSlide();
}

// ═════════════════════════════════════════════════════════════════════════
// FIRESTORE LISTENER
// ═════════════════════════════════════════════════════════════════════════

function listenToApprovedReviews(onUpdate, onError) {
  if (!reviewsDb) {
    onError?.(new Error('Reviews Firebase not initialized'));
    return () => {};
  }

  // return reviewsDb
  //   .collection('reviews')
  //   .onSnapshot(
  return reviewsDb
  .collection('reviews')
  .where('status', '==', 'approved')
  .onSnapshot(
      (snapshot) => {
        const reviews = snapshot.docs
          .map((doc) => normalizeReview(doc))
          .filter((item) => item.status === 'approved' || item.status === 'published' || item.status === 'visible')
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          .slice(0, 20);
        onUpdate(reviews);
      },
      (err) => {
        console.error('Unable to load approved reviews:', err);
        onError?.(err);
      }
    );
}

// ═════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════

function initPublicReviewsCarousel() {
  // Initialize Firebase
  if (!initPublicReviewsFirebase()) {
    console.error('Failed to initialize reviews Firebase');
    return;
  }

  // Get DOM elements
  const carouselInner = document.getElementById('reviewsCarouselInner');
  const reviewsEmpty = document.getElementById('reviewsEmpty');
  const reviewsHappyClients = document.getElementById('reviewsHappyClients');
  const reviewsProjectsDelivered = document.getElementById('reviewsProjectsDelivered');
  const reviewsAverageRating = document.getElementById('reviewsAverageRating');
  const carouselPrev = document.getElementById('carouselPrev');
  const carouselNext = document.getElementById('carouselNext');

  if (!carouselInner || !reviewsEmpty) {
    console.warn('Review carousel HTML elements not found');
    return;
  }

  // Listen to Firestore changes
  listenToApprovedReviews(
    (reviews) => {
      if (!reviews.length) {
        carouselInner.innerHTML = '';
        if (reviewsEmpty) {
          reviewsEmpty.textContent = 'No client stories are visible yet. Share your feedback and help others learn about your experience with us.';
          reviewsEmpty.classList.remove('hidden');
        }
        return;
      }

      reviewsEmpty.classList.add('hidden');

      // Update stats
      if (reviewsHappyClients && reviewsProjectsDelivered && reviewsAverageRating) {
        renderReviewStats(reviews, reviewsHappyClients, reviewsProjectsDelivered, reviewsAverageRating);
      }

      // Store reviews in state
      reviewsCarouselState.reviews = reviews;
      reviewsCarouselState.total = reviews.length;
      reviewsCarouselState.current = 0;

      // Render carousel slides
      carouselInner.innerHTML = reviews
        .map((review) => `<div class="review-carousel-slide">${createReviewCardMarkup(review)}</div>`)
        .join('');

      // Render dots
      const dotsContainer = document.getElementById('carouselDots');
      if (dotsContainer) {
        dotsContainer.innerHTML = reviews
          .map((_, idx) => `<div class="carousel-dot ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})"></div>`)
          .join('');
      }

      // Bind carousel controls
      if (carouselPrev) carouselPrev.onclick = () => slideCarousel(-1);
      if (carouselNext) carouselNext.onclick = () => slideCarousel(1);

      // Start auto-slide (only if more than 1 review)
      if (reviews.length > 1) {
        startAutoSlide();
      }
    },
    (err) => {
      console.error('Carousel error:', err);
      if (reviewsEmpty) {
        reviewsEmpty.textContent = 'Unable to load client stories at this time. Please try again later.';
        reviewsEmpty.classList.remove('hidden');
      }
    }
  );

  console.log('✓ Public reviews carousel initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicReviewsCarousel);
} else {
  initPublicReviewsCarousel();
}

// Export functions to global scope
window.slideCarousel = slideCarousel;
window.goToSlide = goToSlide;
