// ===================== CONFIGURATION =====================
// NOTE: Firebase client config values are not secret (security is enforced
// via Firestore security rules + Firebase Auth authorized domains), so it's
// normal for this file to be committed to a public repo. Just make sure your
// Firestore rules and Auth "Authorized domains" list are locked down.
export const firebaseConfig = {
    apiKey: "AIzaSyCnLN41Mlt8KSxGhyiR7DKT8_3VpzuTFsg",
    authDomain: "expense-dashboard-21c59.firebaseapp.com",
    projectId: "expense-dashboard-21c59",
    storageBucket: "expense-dashboard-21c59.firebasestorage.app",
    messagingSenderId: "269962454783",
    appId: "1:269962454783:web:f219eea0367d2b6d27ceca",
    measurementId: "G-L7X2GD3NDZ"
};

export const GMAIL_CLIENT_ID = '983984180846-b1o9ddrlqrjc1hkl5r3ttp9vgg8c2hel.apps.googleusercontent.com';
export const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

export const EMAIL_SOURCES = {
    'support@pickme.lk': { name: 'PickMe', parser: 'pickme' }
};

export const DEFAULT_BUDGET = 60000;
