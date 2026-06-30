/**
 * auth.js
 * ---------------------------------------------------------------------------
 * Handles Admin Login page logic:
 *  - Email/password sign-in via Firebase Authentication
 *  - Enforces that only emails inside ADMIN_EMAILS (firebase-config.js) can
 *    access the dashboard, even if Firebase Auth accepts the credentials.
 *  - Persists session via Firebase's default local persistence.
 *  - Redirects already-logged-in admins straight to the dashboard.
 * ---------------------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const errorBox = document.getElementById("loginError");

  // If already signed in as a valid admin, skip straight to dashboard.
  auth.onAuthStateChanged((user) => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
      const currentPage = window.location.pathname.split("/").pop();
      if (currentPage !== "dashboard.html") {
        window.location.replace("dashboard.html");
      }
    }
  });

  togglePasswordBtn?.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePasswordBtn.textContent = isPassword ? "🙈" : "👁️";
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("visible");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showFormError("Please enter both email and password.");
      return;
    }

    setLoading(loginBtn, true, "Signing in...");

    try {
      // 1. Authenticate with Firebase
      const credential = await auth.signInWithEmailAndPassword(email, password);

      // 2. Enforce admin allow-list (defense in depth alongside Firestore rules)
      if (!ADMIN_EMAILS.includes(credential.user.email)) {
        await auth.signOut();
        showFormError("This account is not authorized for Admin access.");
        setLoading(loginBtn, false);
        return;
      }

      showToast("Welcome back! Redirecting...", "success", 1500);
      setTimeout(() => (window.location.href = "dashboard.html"), 600);
    } catch (err) {
      setLoading(loginBtn, false);
      showFormError(mapAuthError(err.code));
    }
  });

  function showFormError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("visible");
    showToast(msg, "error");
  }

  function mapAuthError(code) {
    switch (code) {
      case "auth/invalid-email":
        return "That email address looks invalid.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      default:
        return "Unable to sign in. Please try again.";
    }
  }
});

/** Used by dashboard.html to log the admin out */
function logoutAdmin() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}
