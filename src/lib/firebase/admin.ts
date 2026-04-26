import * as admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

// Aggressively clean the private key (handles quotes, literal \n, and actual newlines)
const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
const privateKey = rawKey
  .replace(/^"|"$/g, "") // Remove wrapping double quotes
  .replace(/\\n/g, "\n"); // Convert literal \n to actual newlines

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Allow builds to complete in environments where service account vars are not set.
    // In production, prefer explicit FIREBASE_* credentials.
    admin.initializeApp();
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
