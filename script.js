/*JK CLICK CRAFT — MAIN JAVASCRIPT*/

'use strict';

const EMAILJS_CDN = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
const EMAILJS_PUBLIC_KEY = 'In9_jgeyYlLavbayv';
const EMAILJS_SERVICE_ID = 'jkcc.support';
const EMAILJS_TEMPLATE_ID = 'template_p37xlcb';
let EMAILJS_READY = false;

// Performance optimization: Defer non-critical JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Use requestIdleCallback for non-critical tasks
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initNonCriticalFeatures);
  } else {
    setTimeout(initNonCriticalFeatures, 100);
  }
});

// Critical path initialization
function initCriticalFeatures() {
  initAuth();
  initNavbar();
  initEmailJS();
  initContactForm();
}

// Non-critical features
function initNonCriticalFeatures() {
  initTyping();
  initScrollAnimations();
  initSmoothScroll();
  initActiveNavLinks();
  initCardTilt();
  initFAQ();
  // Reviews carousel is now handled by separate public-reviews-carousel.js
}

// Initialize critical features immediately
initCriticalFeatures();


/* ═══════════════════════════════════════════
   AUTH STATE MANAGEMENT
   ═══════════════════════════════════════════ */

function initAuth() {
  renderAuthState();
}

function getLoggedInUser() {
  // Support both localStorage keys for compatibility
  return localStorage.getItem('username') ||
    localStorage.getItem('displayName') ||
    null;
}

function renderAuthState() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;

  const username = getLoggedInUser();

  if (username) {
    // ── Logged-in state ──
    const initial = username.charAt(0).toUpperCase();
    navAuth.innerHTML = `
      <div class="nav-user" id="navUser">
        <button class="nav-user-btn" id="navUserBtn" aria-expanded="false" aria-haspopup="true">
          <div class="nav-user-avatar" aria-hidden="true">${initial}</div>
          <span>
            <span class="nav-user-greeting">Hi, </span>
            <span class="nav-user-name">${escapeHTML(username)}</span>
          </span>
          <svg class="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="nav-dropdown" id="navDropdown" role="menu">
          <a href="#home" role="menuitem">
            <span>👤</span> My Profile
          </a>
          <a href="#services" role="menuitem">
            <span>⭐</span> My Projects
          </a>
          <button class="logout-btn" onclick="logout()" role="menuitem">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    `;
    bindDropdown();
  } else {
    // ── Logged-out state ──
    navAuth.innerHTML = `
      <a href="login.html" class="nav-login-btn">
        <span>🔑</span>&ensp;Login
      </a>
    `;
  }
}

function bindDropdown() {
  const navUser = document.getElementById('navUser');
  const navUserBtn = document.getElementById('navUserBtn');
  if (!navUser || !navUserBtn) return;

  navUserBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navUser.classList.contains('open');
    navUser.classList.toggle('open', !isOpen);
    navUserBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!navUser.contains(e.target)) {
      navUser.classList.remove('open');
      navUserBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      navUser.classList.remove('open');
      navUserBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

window.logout = function () {
  // Clear all possible auth keys
  const keysToRemove = ['username', 'displayName', 'userEmail', 'userToken', 'loggedIn'];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear();

  // Animate out
  const navUser = document.getElementById('navUser');
  if (navUser) {
    navUser.style.opacity = '0';
    navUser.style.transform = 'scale(0.9)';
  }

  setTimeout(() => {
    renderAuthState();
    showToast("👋 You've been signed out.");
  }, 250);
};

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


/* ═══════════════════════════════════════════
   TOAST NOTIFICATION
   ═══════════════════════════════════════════ */

function showToast(message, duration = 3000) {
  // Remove existing toast
  const existing = document.querySelector('.jk-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'jk-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 32px;
    z-index: 9999;
    padding: 14px 22px;
    background: var(--bg);
    border-radius: 14px;
    box-shadow: var(--shadow-lg);
    font-family: var(--font, 'Poppins', sans-serif);
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--text-primary, #2d3748);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}


/* ═══════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════ */

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');

  // Scroll shadow
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.contains('open');
      navMenu.classList.toggle('open', !isOpen);
      hamburger.classList.toggle('open', !isOpen);
      hamburger.setAttribute('aria-expanded', String(!isOpen));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        navMenu.classList.remove('open');
        hamburger.classList.remove('open');
      }
    });

    // Close on nav link click (mobile)
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
  }
}


/* ═══════════════════════════════════════════
   TYPING ANIMATION
   ═══════════════════════════════════════════ */

function initTyping() {
  const el = document.getElementById('typedText');
  if (!el) return;

  const phrases = [
    'Digital Presence',
    'Business Website',
    'Brand Identity',
    'Web Experience',
    'Online Success',
  ];

  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let isPaused = false;

  const TYPING_SPEED = 80;
  const DELETE_SPEED = 45;
  const PAUSE_AFTER_TYPE = 2200;
  const PAUSE_AFTER_DELETE = 400;

  function tick() {
    if (isPaused) return;
    const current = phrases[phraseIdx];

    if (!isDeleting) {
      el.textContent = current.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        isPaused = true;
        setTimeout(() => { isDeleting = true; isPaused = false; tick(); }, PAUSE_AFTER_TYPE);
        return;
      }
      setTimeout(tick, TYPING_SPEED);
    } else {
      el.textContent = current.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        isPaused = true;
        setTimeout(() => { isPaused = false; tick(); }, PAUSE_AFTER_DELETE);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    }
  }

  setTimeout(tick, 800);
}


/* ═══════════════════════════════════════════
   SCROLL-BASED ANIMATIONS
   ═══════════════════════════════════════════ */

function initScrollAnimations() {
  const animatedEls = document.querySelectorAll(
    '.slide-in-left, .slide-in-right, .slide-up'
  );

  if (!animatedEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  animatedEls.forEach(el => observer.observe(el));
}


/* ═══════════════════════════════════════════
   SMOOTH SCROLL
   ═══════════════════════════════════════════ */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || href === '#!') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navHeight = document.getElementById('navbar')?.offsetHeight || 70;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ═══════════════════════════════════════════
   ACTIVE NAV LINK ON SCROLL
   ═══════════════════════════════════════════ */



function initActiveNavLinks() {
  const sections = document.querySelectorAll('section[id], .hero[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  if (!sections.length || !navLinks.length) return;

  const navHeight = document.getElementById('navbar')?.offsetHeight || 70;

  const onScroll = () => {
    let current = '';
    sections.forEach(section => {
      const top = section.getBoundingClientRect().top - navHeight - 32;
      if (top <= 0) current = section.id;
    });
    navLinks.forEach(link => {
      const href = link.getAttribute('href')?.replace('#', '');
      link.classList.toggle('active', href === current);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initContactForm() {
  // Contact form is ready. Button click is handled via onclick attribute in HTML
}

function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) return resolve(window.emailjs);

    const existing = document.querySelector(`script[src="${EMAILJS_CDN}"]`);
    if (existing) {
      if (window.emailjs) return resolve(window.emailjs);
      if (existing.readyState === 'loaded' || existing.readyState === 'complete') {
        setTimeout(() => {
          if (window.emailjs) return resolve(window.emailjs);
          reject(new Error('EmailJS object not available after script load'));
        }, 0);
        return;
      }
      existing.addEventListener('load', () => resolve(window.emailjs));
      existing.addEventListener('error', () => reject(new Error('EmailJS script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = EMAILJS_CDN;
    script.type = 'text/javascript';
    script.onload = () => resolve(window.emailjs);
    script.onerror = () => reject(new Error('EmailJS script failed to load'));
    document.head.appendChild(script);
  });
}

async function initEmailJS() {
  try {
    await loadEmailJS();
    if (!window.emailjs) throw new Error('EmailJS object not available');
    emailjs.init(EMAILJS_PUBLIC_KEY);
    EMAILJS_READY = true;
  } catch (err) {
    EMAILJS_READY = false;
    console.error('EmailJS init failed:', err);
  }
}


/* ═══════════════════════════════════════════
   CONTACT FORM
   ═══════════════════════════════════════════ */

window.submitContact = async function () {
  const name = document.getElementById('contactName')?.value.trim();
  const email = document.getElementById('contactEmail')?.value.trim();
  const phone = document.getElementById('contactPhone')?.value.trim();
  const service = document.getElementById('contactService')?.value;
  const msg = document.getElementById('contactMsg')?.value.trim();
  const successEl = document.getElementById('contactSuccess');

  if (!name || !email || !phone || !msg) {
    showToast('⚠️ Please fill in all required fields.');
    return;
  }
  if (!isValidEmail(email)) {
    showToast('⚠️ Please enter a valid email address.');
    return;
  }
  if (!isValidPhone(phone)) {
    showToast('⚠️ Please enter a valid 10-digit mobile number.');
    return;
  }

  const btn = document.querySelector('.contact-card .btn-primary');
  if (btn) {
    btn.textContent = 'Sending...';
    btn.disabled = true;
  }

  const templateParams = {
    from_name: name,
    from_email: email,
    from_phone: phone,          // Matches user's EmailJS template variable: {{from_phone}}
    mobile_number: phone,       // Fallback 1
    phone_number: phone,        // Fallback 2
    phone: phone,               // Fallback 3
    mobile: phone,              // Fallback 4
    service_interest: service || 'Not specified',
    subject: service || 'Web Design/Development Query',
    message: msg,
  };

  try {
    await initEmailJS();
    if (!window.emailjs || !EMAILJS_READY) {
      throw new Error('EmailJS is not initialized. Please check your public key.');
    }

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    if (successEl) {
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 5000);
    }
    ['contactName', 'contactEmail', 'contactPhone', 'contactMsg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const serviceEl = document.getElementById('contactService');
    if (serviceEl) serviceEl.value = '';
    showToast('✅ Message sent! We\'ll get back to you soon.');
  } catch (error) {
    console.error('Contact form error:', error);
    showToast('⚠️ Failed to send message. Please try again.');
  } finally {
    if (btn) {
      btn.textContent = 'Send Message 🚀';
      btn.disabled = false;
    }
  }
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // Strip common phone formatting characters (spaces, dashes, parentheses) for validation
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  // Matches optional +91, 91, or 0 prefix followed by exactly 10 digits starting with 6-9
  return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleanPhone);
}

/* ═══════════════════════════════════════════
   BUTTON PRESS RIPPLE (micro-interaction)
   ═══════════════════════════════════════════ */

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary, .btn-ghost');
  if (!btn) return;

  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.5;

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px; height: ${size}px;
    left: ${e.clientX - rect.left - size / 2}px;
    top: ${e.clientY - rect.top - size / 2}px;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    pointer-events: none;
    transform: scale(0);
    animation: rippleAnim 0.55s ease-out forwards;
  `;

  if (!document.getElementById('rippleStyle')) {
    const style = document.createElement('style');
    style.id = 'rippleStyle';
    style.textContent = `@keyframes rippleAnim { to { transform: scale(1); opacity: 0; } }`;
    document.head.appendChild(style);
  }

  const prevPos = getComputedStyle(btn).position;
  if (prevPos === 'static') btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});


/* ═══════════════════════════════════════════
   SERVICE CARD TILT (subtle 3D on hover)
   ═══════════════════════════════════════════ */

function initCardTilt() {
  const cards = document.querySelectorAll('.service-card, .why-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const tiltX = dy * 4;
      const tiltY = -dx * 4;
      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// Init tilt after DOM settles
setTimeout(initCardTilt, 500);

/* ═══════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════ */

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        // Close other FAQ items
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
          }
        });

        // Toggle current item
        item.classList.toggle('active');
      });

      // Add keyboard support
      question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.classList.toggle('active');
        }
      });
    }
  });
}
