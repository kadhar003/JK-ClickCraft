/**
 * Code.gs
 * Google Apps Script for syncing Google Sheet rows (from Google Form submissions)
 * to Firebase Firestore for moderating customer reviews on jkclickcraft.in.
 * 
 * Install this script in your Google Sheet responses extensions.
 * Set Script Properties:
 * - FIREBASE_PROJECT_ID: your Firebase project ID
 * - FIREBASE_API_KEY: your Firebase Web API key
 * - ADMIN_EMAIL: the admin email that receives new-review alerts
 */

// Column indices (0-based) in your Google Sheet
const COLUMN_MAP = {
  timestamp: 0,
  name: 1,
  email: 2,
  company: 3,
  serviceType: 4,
  rating: 5,
  message: 6
};

/**
 * Triggered on form submission.
 */
function onFormSubmit(e) {
  try {
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const values = e.range.getValues()[0];
    
    syncRowToFirestore(row, values);
  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  }
}

/**
 * Syncs a single row of values to Firebase Firestore.
 * Performs a PATCH request using 'row_{row}' as the document ID for deduplication.
 */
function syncRowToFirestore(row, values) {
  const properties = PropertiesService.getScriptProperties();
  const projectId = properties.getProperty('FIREBASE_PROJECT_ID');
  const apiKey = properties.getProperty('FIREBASE_API_KEY');
  const adminEmail = properties.getProperty('ADMIN_EMAIL');
  
  if (!projectId || !apiKey) {
    Logger.log("Missing Firebase script properties. Please check FIREBASE_PROJECT_ID and FIREBASE_API_KEY.");
    return;
  }
  
  const timestampVal = values[COLUMN_MAP.timestamp];
  const nameVal = values[COLUMN_MAP.name];
  const emailVal = values[COLUMN_MAP.email];
  const companyVal = values[COLUMN_MAP.company];
  const serviceTypeVal = values[COLUMN_MAP.serviceType];
  const ratingVal = Number(values[COLUMN_MAP.rating]) || 5;
  const messageVal = values[COLUMN_MAP.message];
  
  // Format dates for Firestore
  const submittedAt = timestampVal instanceof Date ? timestampVal : new Date(timestampVal || Date.now());
  
  const sheetRowId = "row_" + row;
  
  // Firestore REST API URL
  // We use PATCH to create/update the document by ID to enforce idempotency (prevent duplicates)
  const url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/reviews/" + sheetRowId + "?key=" + apiKey;
  
  const payload = {
    fields: {
      name: { stringValue: nameVal || "Anonymous" },
      email: { stringValue: emailVal || "" },
      company: { stringValue: companyVal || "" },
      serviceType: { stringValue: serviceTypeVal || "" },
      rating: { integerValue: ratingVal },
      message: { stringValue: messageVal || "" },
      status: { stringValue: "pending" },
      approved: { booleanValue: false },
      source: { stringValue: "google-form" },
      submittedAt: { timestampValue: submittedAt.toISOString() },
      reviewedAt: { nullValue: null },
      reviewedBy: { nullValue: null },
      sheetRowId: { stringValue: sheetRowId }
    }
  };
  
  const options = {
    method: "patch",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode >= 200 && responseCode < 300) {
    Logger.log("Successfully synced row " + row + " to Firestore.");
    
    // Send email notification to admin
    if (adminEmail) {
      sendAdminNotification(adminEmail, nameVal, emailVal, ratingVal, messageVal, projectId);
    }
  } else {
    Logger.log("Failed to sync row " + row + " to Firestore. Code: " + responseCode + ", Response: " + response.getContentText());
  }
}

/**
 * Sends a notification email to the admin.
 */
function sendAdminNotification(adminEmail, name, email, rating, message, projectId) {
  const subject = "✦ New Pending Review - JK Click Craft";
  const dashboardLink = "https://jkclickcraft.in/ADMIN/admin/index.html"; // Adjust if hosted elsewhere
  
  const body = "Hello Admin,\n\n" +
               "A new client feedback review has been submitted and is pending approval.\n\n" +
               "--- Review Details ---\n" +
               "Name: " + name + "\n" +
               "Email: " + email + "\n" +
               "Rating: " + rating + "/5\n" +
               "Message: \"" + message + "\"\n\n" +
               "Please moderate this review from the Admin Dashboard:\n" +
               dashboardLink + "\n\n" +
               "Best regards,\n" +
               "JK Click Craft Automation";
               
  MailApp.sendEmail(adminEmail, subject, body);
}

/**
 * Utility function to backfill all existing spreadsheet rows to Firestore.
 * Run this once manually from the script editor if you have existing rows.
 */
function backfillExistingRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    Logger.log("No data rows to backfill.");
    return;
  }
  
  // Get all data starting from row 2
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const allValues = range.getValues();
  
  for (let i = 0; i < allValues.length; i++) {
    const row = 2 + i;
    const values = allValues[i];
    
    // Skip empty rows
    if (!values[COLUMN_MAP.name] && !values[COLUMN_MAP.message]) continue;
    
    syncRowToFirestore(row, values);
    Utilities.sleep(100); // Sleep briefly to respect API rate limits
  }
  
  Logger.log("Finished backfilling " + allValues.length + " rows.");
}
