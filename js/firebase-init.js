// ===================== FIREBASE INIT =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, getRedirectResult, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { firebaseConfig } from './config.js';
import { state } from './state.js';
import { showAuth, showDashboard } from './auth.js';

// ===================== DEBUG =====================
export function showDebug(msg) {
    const box = document.getElementById('debugBox');
    const text = document.getElementById('debugText');
    if (box && text) {
        box.classList.add('active');
        text.innerHTML += msg + '<br>';
    }
}

// ===================== INITIALIZATION =====================
try {
    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getFirestore(state.app);
    showDebug('&#x2705; Firebase initialized successfully');
    showDebug('Domain: <code>' + window.location.hostname + '</code>');
    showDebug('Protocol: <code>' + window.location.protocol + '</code>');

    // Check for redirect result (after redirect sign-in)
    getRedirectResult(state.auth).then((result) => {
        if (result && result.user) {
            state.currentUser = result.user;
            showDashboard();
        }
    }).catch((error) => {
        if (error.code && error.code !== 'auth/null-user') {
            showDebug('&#x274C; Redirect result error: ' + error.message);
        }
    });

    // Auth state listener
    onAuthStateChanged(state.auth, (user) => {
        if (user) {
            state.currentUser = user;
            document.getElementById('signInBtn').style.display = 'none';
            showDashboard();
        } else {
            showAuth();
        }
    }, (error) => {
        showDebug('&#x274C; Auth state error: ' + error.message);
    });

} catch (e) {
    showDebug('&#x274C; Firebase init failed: ' + e.message);
}
