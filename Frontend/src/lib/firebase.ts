// src/lib/firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firebase SDK initialization + Google Sign-In helper + Firestore exports
//
// ⚠️  SETUP REQUIRED:
// 1. Go to https://console.firebase.google.com/
// 2. Create or select your project
// 3. Click the gear ⚙ → Project Settings → Your Apps → Add web app (if none)
// 4. Copy the firebaseConfig object below and replace the placeholder values
// 5. Enable Google as a sign-in provider:
//    Authentication → Sign-in method → Google → Enable
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type UserCredential,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

export type { Unsubscribe, DocumentData, QuerySnapshot };

// ── Replace these values with your Firebase project config ───────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
// ─────────────────────────────────────────────────────────────────────────────

// Initialize only once (safe for hot-reload in dev)
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const firebaseAuth = getAuth(firebaseApp);

/** Firestore client — used for real-time listeners */
export const firestore = getFirestore(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Open Google Sign-In popup and return the Firebase UserCredential.
 * Throws if the user closes the popup or auth fails.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(firebaseAuth, googleProvider);
}

/** Sign out from Firebase (clears the Google session cookie) */
export async function signOutFromGoogle(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
}

/**
 * Get the current Firebase ID token (refreshed automatically).
 * Returns null if no user is signed in.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken(/* forceRefresh */ false);
}

/**
 * Real-time listener: queries submitted by a specific participant.
 * Calls `cb` immediately and on every change.
 */
export function subscribeToParticipantQueries(
  participantId: string,
  cb: (snap: QuerySnapshot<DocumentData>) => void,
): Unsubscribe {
  // No orderBy here to avoid requiring a composite Firestore index.
  // Sort is done client-side in the dashboard component.
  const q = query(
    collection(firestore, 'queries'),
    where('participant_id', '==', participantId),
  );
  return onSnapshot(q, cb);
}

/**
 * Real-time listener: queries assigned to a specific mentor (or all queries for organiser).
 * Pass `assignedToId` to filter by assignee, or null to get ALL queries.
 */
export function subscribeToMentorQueries(
  assignedToId: string,
  cb: (snap: QuerySnapshot<DocumentData>) => void,
): Unsubscribe {
  // No orderBy here to avoid requiring a composite Firestore index.
  // Sort is done client-side in the dashboard component.
  const q = query(
    collection(firestore, 'queries'),
    where('assigned_to_id', '==', assignedToId),
  );
  return onSnapshot(q, cb);
}

/**
 * Real-time listener for ALL queries (organiser view).
 */
export function subscribeToAllQueries(
  cb: (snap: QuerySnapshot<DocumentData>) => void,
): Unsubscribe {
  const q = query(
    collection(firestore, 'queries'),
  );
  return onSnapshot(q, cb);
}
