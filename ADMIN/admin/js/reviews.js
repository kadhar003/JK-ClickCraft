/**
 * reviews.js
 * ---------------------------------------------------------------------------
 * Data-access layer for the "reviews" Firestore collection.
 * Kept separate from dashboard.js (UI/rendering) for clean separation of
 * concerns and easier unit testing / reuse.
 *
 * FIRESTORE DOCUMENT SHAPE  (collection: "reviews")
 * {
 *   name: string,            // reviewer's full name
 *   email: string,
 *   company: string,         // company / college name
 *   serviceType: string,     // e.g. "Website Development"
 *   rating: number,          // 1-5
 *   message: string,         // the review text
 *   status: "pending" | "approved" | "rejected",
 *   approved: boolean,       // kept for quick querying / legacy compatibility
 *   source: "google-form" | "manual",
 *   submittedAt: Timestamp,
 *   reviewedAt: Timestamp | null,
 *   reviewedBy: string | null,
 *   sheetRowId: string | null // used to dedupe re-imports from Google Sheets
 * }
 * ---------------------------------------------------------------------------
 */

const ReviewsAPI = {
  /** Real-time listener for ALL reviews (dashboard applies filtering client-side) */
  listenAll(callback, onError) {
    return db
      .collection(COLLECTIONS.REVIEWS)
      .orderBy("submittedAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          callback(reviews);
        },
        (err) => {
          console.error("Firestore listenAll error:", err);
          onError?.(err);
        }
      );
  },

  async approve(reviewId, adminEmail) {
    return db.collection(COLLECTIONS.REVIEWS).doc(reviewId).update({
      status: "approved",
      approved: true,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedBy: adminEmail
    });
  },

  async reject(reviewId, adminEmail) {
    return db.collection(COLLECTIONS.REVIEWS).doc(reviewId).update({
      status: "rejected",
      approved: false,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedBy: adminEmail
    });
  },

  async remove(reviewId) {
    return db.collection(COLLECTIONS.REVIEWS).doc(reviewId).delete();
  },

  /** Optional audit log entry — requires "adminLogs" collection + matching rules */
  async logAction(action, reviewId, adminEmail) {
    try {
      await db.collection(COLLECTIONS.ADMIN_LOGS).add({
        action,
        reviewId,
        adminEmail,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      // Non-critical — don't block the main action if logging fails
      console.warn("Could not write admin log:", err);
    }
  }
};
