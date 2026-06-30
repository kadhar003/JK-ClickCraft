/**
 * firebase-config.js
 * ---------------------------------------------------------------------------
 * Central Firebase initialization for the JK ClickCraft Admin Review System.
 *
 * SETUP:
 * 1. Go to https://console.firebase.google.com -> Create / open your project.
 * 2. Project settings -> General -> "Your apps" -> Add a Web App.
 * 3. Copy the firebaseConfig object Firebase gives you and paste it below.
 * 4. Enable "Authentication -> Sign-in method -> Email/Password".
 * 5. Enable "Firestore Database" (Production mode recommended).
 * 6. Manually create admin users in Authentication -> Users -> Add user.
 * 7. Add those same admin emails to the ADMIN_EMAILS allow-list below AND
 *    mirror them in your Firestore Security Rules (see /docs/firestore.rules).
 *
 * This file is loaded as a plain <script> (non-module) for simplicity, using
 * the Firebase compat SDKs included via CDN in index.html / dashboard.html.
 * ---------------------------------------------------------------------------
 */

// ----------------------------------------------------------------------------
// 1. REPLACE THIS WITH YOUR OWN FIREBASE PROJECT CONFIG
// ----------------------------------------------------------------------------
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD9xpzXiSFr8rbAUBwDJlnviNmbHptWD2g",
  authDomain: "jk-clickcraft-admin.firebaseapp.com",
  projectId: "jk-clickcraft-admin",
  storageBucket: "jk-clickcraft-admin.firebasestorage.app",
  messagingSenderId: "383567899492",
  appId: "1:383567899492:web:eb21aa162830a5e4f2a871",
  measurementId: "G-Z5SZEGRP07"
};

// Initialize Firebase (compat SDK - works without a bundler)
firebase.initializeApp(firebaseConfig);

// Shorthand references used across admin/js/*.js
const auth = firebase.auth();
const db = firebase.firestore();

// ----------------------------------------------------------------------------
// 2. ADMIN ALLOW-LIST
// ----------------------------------------------------------------------------
// Only these email addresses are permitted to use the Admin Dashboard, even
// if other accounts somehow exist in Firebase Authentication. This is a
// client-side convenience check ONLY — the real enforcement MUST happen in
// Firestore Security Rules (see /docs/firestore.rules). Never trust the
// client alone for access control.
const ADMIN_EMAILS = [
  "jkclickcraft@gmail.com",
  "bhuvaneswarip620@gmail.com"
  // add more predefined admin emails here
];

// Firestore collection names (kept in one place to avoid typos)
const COLLECTIONS = {
  REVIEWS: "reviews",
  ADMIN_LOGS: "adminLogs" // optional audit trail of approve/reject/delete actions
};
