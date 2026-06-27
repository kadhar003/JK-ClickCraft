/**
 * emailjs-notify.js
 * ---------------------------------------------------------------------------
 * OPTIONAL ALTERNATIVE to the Google Apps Script MailApp notification.
 *
 * Use this if you'd rather trigger the "new review" email via EmailJS from
 * a client-side context (e.g. directly from a custom review form on your
 * website instead of a Google Form), or as a second notification channel.
 *
 * SETUP:
 * 1. Create a free account at https://www.emailjs.com
 * 2. Add an Email Service (e.g. Gmail) -> note the SERVICE_ID
 * 3. Create an Email Template with variables matching the ones sent below
 *    (to_email, reviewer_name, reviewer_email, company, service_type,
 *    rating, message, dashboard_link) -> note the TEMPLATE_ID
 * 4. Account -> General -> copy your PUBLIC_KEY
 * 5. Include the EmailJS SDK on the page that calls notifyAdminOfNewReview():
 *      <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
 * ---------------------------------------------------------------------------
 */

const EMAILJS_CONFIG = {
  PUBLIC_KEY: "In9_jgeyYlLavbayv",
  SERVICE_ID: "jkccadmin",
  TEMPLATE_ID: "template_zcby6po",
  ADMIN_EMAIL: "jkclickcraft@gmail.com"
};

function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
  }
}

/**
 * Call this immediately after writing a new "pending" review to Firestore
 * from any client-side form (not required if you're using the Google Apps
 * Script MailApp method, which runs server-side automatically).
 */
function notifyAdminOfNewReview(review) {
  if (typeof emailjs === "undefined") {
    console.warn("EmailJS SDK not loaded.");
    return Promise.resolve();
  }

  return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
    to_email: EMAILJS_CONFIG.ADMIN_EMAIL,
    reviewer_name: review.name,
    reviewer_email: review.email,
    company: review.company,
    service_type: review.serviceType,
    rating: review.rating,
    message: review.message,
    dashboard_link: "https://jkclickcraft.in/admin/admin/index.html/"
  });
}
