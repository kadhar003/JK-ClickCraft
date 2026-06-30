# JK ClickCraft — Admin Review Management System

A complete, branded admin system for collecting, moderating, and publishing
customer reviews on **jkclickcraft.in**. Reviews come in through an existing
**Google Form → Google Sheet**, are auto-synced into **Firebase Firestore**
as `pending`, trigger an **instant admin email notification**, and become
visible on the public site's testimonials section only after an admin
**approves** them from a secure, branded **Admin Dashboard**.

---

## 1. Project Structure

```
jk-admin-review-system/
├── admin/                      # Admin-only panel (put behind a secret URL)
│   ├── index.html              # Login page
│   ├── dashboard.html          # Review management dashboard
│   ├── css/
│   │   └── admin-style.css     # Dark navy + cyan glassmorphism theme
│   └── js/
│       ├── firebase-config.js  # Firebase init + admin allow-list
│       ├── utils.js            # Toasts, formatting, helpers
│       ├── auth.js             # Login / logout / route guard
│       ├── reviews.js          # Firestore data layer
│       └── dashboard.js        # UI controller (stats, search, filters, modal)
│
├── public/                     # Files to drop into the MAIN jkclickcraft.in site
│   ├── public-reviews-widget.js
│   ├── public-reviews-widget.css
│   └── emailjs-notify.js       # Optional alternate notification channel
│
├── google-apps-script/
│   └── Code.gs                 # Syncs Google Sheet rows → Firestore + emails admin
│
├── docs/
│   └── firestore.rules         # Recommended Firestore Security Rules
│
└── README.md
```

---

## 2. How It All Fits Together

```
Customer fills Google Form
        │
        ▼
Google Sheet (auto-collects responses)
        │  onFormSubmit trigger (Apps Script)
        ▼
Firestore "reviews" collection  (status: "pending", approved: false)
        │
        ├── Apps Script sends admin a notification email instantly
        │
        ▼
Admin logs into /admin (secret URL) → Dashboard
        │  Approve / Reject / Delete
        ▼
Firestore document updated (status: "approved" | "rejected")
        │
        ▼
Public website's reviews widget (real-time Firestore listener)
shows only status == "approved" reviews instantly — no redeploy needed.
```

---

## 3. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com) and
   create a new project (e.g. `jk-clickcraft-reviews`).
2. **Authentication**
   - Build → Authentication → Sign-in method → enable **Email/Password**.
   - Build → Authentication → Users → **Add user** for each admin
   (e.g. your admin email). There is intentionally **no public
     sign-up page** — admins are created manually here only.
3. **Firestore Database**
   - Build → Firestore Database → Create database → start in **Production
     mode** (recommended) → choose a region close to your users (e.g.
     `asia-south1` for India).
4. **Web App / Config**
   - Project settings → General → "Your apps" → Add app → Web.
   - Copy the generated `firebaseConfig` object into
     `admin/js/firebase-config.js` (replacing the placeholder values).
5. **Security Rules**
   - Firestore Database → Rules → paste the contents of
     `docs/firestore.rules` → Publish.
   - This restricts writes/approvals to the allow-listed admin emails only,
     while still letting the public widget read approved reviews and letting
     the Google Apps Script create new pending reviews.
6. **Admin allow-list**
   - In `admin/js/firebase-config.js`, update `ADMIN_EMAILS` with the exact
     same email addresses you created in Authentication.
   - Mirror the same list inside `docs/firestore.rules` (`isAdmin()` function)
     — the client-side list is a UX convenience; the **Firestore rule is
     the real security boundary**.

> ⚠️ Always keep the admin allow-list in `firebase-config.js` **and**
> `firestore.rules` in sync. If you add/remove an admin, update both places.

---

## 4. Google Form → Google Sheet → Firestore Workflow

1. Create (or reuse) a **Google Form** with these fields, in this order:
   `Name`, `Email`, `Company/College`, `Service Type`, `Rating (1–5)`, `Message`.
2. Link the form's responses to a **Google Sheet** (Responses tab → green
   Sheets icon).
3. Open that Sheet → **Extensions → Apps Script**.
4. Paste in `google-apps-script/Code.gs`.
5. In the Apps Script editor: **Project Settings → Script Properties**, add:
   | Property | Value |
   |---|---|
   | `FIREBASE_PROJECT_ID` | your Firebase project ID |
   | `FIREBASE_API_KEY` | your Firebase Web API key |
   | `ADMIN_EMAIL` | the exact admin email that should receive new-review alerts |
6. Adjust `COLUMN_MAP` at the top of `Code.gs` if your form's question order
   differs from the default.
7. **Triggers** (clock icon, left sidebar) → **Add Trigger**:
   - Function: `onFormSubmit`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`
8. Run `backfillExistingRows` once (optional) if you already have older
   form responses you want imported into Firestore.
9. Test by submitting the live Google Form — within seconds you should see:
   - A new document appear in Firestore → `reviews` collection.
   - An email notification land in the admin inbox.

### Why Firestore allows this write
`docs/firestore.rules` permits an **unauthenticated `create`** on the
`reviews` collection, but only when `status == "pending"` and
`approved == false`, and only with valid required fields. This lets the
Apps Script REST call (no Firebase Auth) insert new reviews safely, while
nobody can use the same hole to fake an `approved: true` review or read/edit
existing ones.

---

## 5. EmailJS Setup (Optional Second Notification Channel)

The Google Apps Script already emails the admin via `MailApp` automatically
— no EmailJS required for the core workflow. Use EmailJS only if you also
want to trigger notifications **client-side** (e.g. from a custom review
form on the website itself, instead of / in addition to the Google Form).

1. Create a free account at [emailjs.com](https://www.emailjs.com).
2. Add an **Email Service** (e.g. connect your Gmail) → copy the **Service ID**.
3. Create an **Email Template** with variables: `to_email`, `reviewer_name`,
   `reviewer_email`, `company`, `service_type`, `rating`, `message`,
   `dashboard_link` → copy the **Template ID**.
4. Account → General → copy your **Public Key**.
5. Fill these into `public/emailjs-notify.js` (`EMAILJS_CONFIG`).
6. Include the EmailJS SDK + this script on whichever page submits the
   custom form, then call `notifyAdminOfNewReview(reviewData)` right after
   writing the review document to Firestore.

---

## 6. Firestore Collection Structure

**Collection:** `reviews`

| Field | Type | Description |
|---|---|---|
| `name` | string | Reviewer's name |
| `email` | string | Reviewer's email |
| `company` | string | Company / college name |
| `serviceType` | string | Service the review is about |
| `rating` | number | 1–5 |
| `message` | string | Review text |
| `status` | string | `"pending"` \| `"approved"` \| `"rejected"` |
| `approved` | boolean | Mirrors `status === "approved"` for simple queries |
| `source` | string | `"google-form"` or `"manual"` |
| `submittedAt` | timestamp | When the review was submitted |
| `reviewedAt` | timestamp \| null | When an admin acted on it |
| `reviewedBy` | string \| null | Admin email who actioned it |
| `sheetRowId` | string | Dedupe key tying back to the Sheet row |

**Collection:** `adminLogs` *(optional audit trail)*

| Field | Type | Description |
|---|---|---|
| `action` | string | `"approve"` \| `"reject"` \| `"delete"` |
| `reviewId` | string | Affected review's document ID |
| `adminEmail` | string | Who performed the action |
| `timestamp` | timestamp | When it happened |

---

## 7. Admin Login Setup

- There is **no signup page by design** — admins are provisioned manually
   in the Firebase Console (Authentication → Users → Add user).
- `admin/js/firebase-config.js` → `ADMIN_EMAILS` acts as a client-side
  allow-list; even a valid Firebase Auth login is rejected (and signed out)
  if the email isn't on this list.
- The real enforcement lives in `docs/firestore.rules`'s `isAdmin()` check —
  never rely on the client-side list alone.
- To add a new admin: create the user in Firebase Auth, then add their email
  to **both** `ADMIN_EMAILS` (firebase-config.js) and `isAdmin()`
  (firestore.rules), then redeploy/republish rules.

---

## 8. Approval Workflow (Dashboard Usage)

1. Admin opens the secret admin URL → signs in.
2. Dashboard loads all reviews in real time via a Firestore listener — no
   manual refresh needed.
3. Stats bar shows Total / Pending / Approved / Rejected / Average Rating,
   recalculated live as data changes.
4. Use the search bar (name, company, email, service) and status filter
   tabs (All / Pending / Approved / Rejected) to narrow the list; results
   are paginated (9 per page).
5. Each review card shows reviewer details, rating, a message preview, and
   action buttons:
   - **View** — opens a modal with full details.
   - **Approve** — sets `status: "approved"`, `approved: true` → instantly
     appears in the public website's reviews widget.
   - **Reject** — sets `status: "rejected"`, `approved: false` → stays
     hidden from the public site (kept in Firestore for records, not
     deleted).
   - **Delete** — permanently removes the document (confirmation prompt
     shown first).

---

## 9. Integrating the Public Reviews Widget on jkclickcraft.in

1. Copy `public/public-reviews-widget.js` and
   `public/public-reviews-widget.css` into your main website's codebase.
2. On the page with your testimonials/reviews section, add:
   ```html
   <div id="jkcc-reviews"></div>
   <link rel="stylesheet" href="/path/to/public-reviews-widget.css">
   ```
3. Before the closing `</body>`, include Firebase + the widget script:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js"></script>
   <script src="/path/to/firebase-config.js"></script>
   <script src="/path/to/public-reviews-widget.js"></script>
   ```
4. The widget listens in real time for `status == "approved"` reviews and
   re-renders automatically — no rebuild/redeploy needed when an admin
   approves a new review.

---

## 10. Deploying the Admin Panel Through a Secret URL

Since this is a static HTML/CSS/JS app, you can host the `admin/` folder
anywhere that serves static files:

**Option A — Same domain, hidden path (recommended)**
1. Upload the `admin/` folder to your existing hosting at a non-linked,
   hard-to-guess path, e.g.:
   `https://jkclickcraft.in/jkcc-mgmt-7f3a2c/`
2. Don't link to it from any navigation/sitemap. Add
   `<meta name="robots" content="noindex, nofollow">` (already included in
   both admin HTML files) so search engines won't index it.
3. Optionally add HTTP Basic Auth at the web-server/hosting level as an
   extra layer in front of the Firebase login.

**Option B — Separate Firebase Hosting site**
1. `npm install -g firebase-tools`
2. `firebase login`
3. `firebase init hosting` (point the public directory to `admin/`)
4. `firebase deploy --only hosting`
5. Optionally set up a custom subdomain like
   `https://manage.jkclickcraft.in` and keep that subdomain unlisted.

**Option C — Netlify / Vercel**
1. Deploy the `admin/` folder as its own site/project.
2. Use an obscure auto-generated subdomain, or a custom one not linked
   anywhere publicly (e.g. `jkcc-reviews-admin.netlify.app`).

> A "secret URL" provides obscurity, not real security — Firebase Auth +
> Firestore Rules are what actually protect the data. Treat the secret URL
> as an extra layer, not the only one.

---

## 11. Security Recommendations

- ✅ Keep `ADMIN_EMAILS` and `firestore.rules`'s `isAdmin()` list in sync at
  all times.
- ✅ Never expose your Firebase **Admin SDK** service account key in any
  client-side or Apps Script file — only the public Web API key (used here)
  is safe to expose, because Firestore Rules (not the key) control access.
- ✅ Enable **App Check** in Firebase for extra protection against abusive
  traffic hitting your Firestore reads/writes (optional, recommended at scale).
- ✅ Rotate the Firebase Web API key restrictions: in Google Cloud Console →
  Credentials, restrict the key to your domains (`jkclickcraft.in`,
  `*.firebaseapp.com`, and your Apps Script outbound IPs if needed).
- ✅ Use strong, unique passwords for each Firebase Auth admin account, and
  enable 2-Step Verification on the underlying Google account.
- ✅ Periodically review `adminLogs` for unexpected approve/reject/delete
  activity.
- ✅ Keep the admin panel's URL out of `robots.txt` disallow lists pointing
  search engines to it (don't list it at all, anywhere).
- ⚠️ The Google Apps Script `create`-only Firestore rule is intentionally
  permissive for unauthenticated writes — it only allows inserting new
  `pending` reviews with valid fields, never reading, updating, or deleting,
  so this cannot be abused to approve fake reviews or access existing data.

---

## 12. Local Development / Testing

You can open `admin/index.html` directly in a browser (Firebase compat SDKs
work without a build step), or serve the folder with any static server:

```bash
cd jk-admin-review-system/admin
python3 -m http.server 5500
# visit http://localhost:5500
```

Make sure `firebase-config.js` is filled in with real project values before
testing login and live data.

---

## 13. Customization Notes

- Colors, fonts, and glassmorphism variables all live at the top of
  `admin/css/admin-style.css` (`:root` and `[data-theme="light"]`) — update
  these to stay in sync if jkclickcraft.in's branding evolves.
- Dashboard page size (`state.pageSize` in `dashboard.js`) defaults to 9
  cards per page — adjust as needed.
- Add more admin emails any time by editing `ADMIN_EMAILS` (config) and
  `isAdmin()` (rules), then creating the corresponding Firebase Auth user.
