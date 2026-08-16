// ===================== AUTH =====================
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { state } from './state.js';
import { showDebug } from './firebase-init.js';
import { loadBudget, loadDisplayName } from './settings.js';
import { loadExpenses } from './expenses.js';
import { loadLoans } from './loans.js';
import { ensureUserProfile } from "./users.js";
import { migratePersonalWorkspace } from "./workspaceMigration.js";
import { loadUserWorkspaces, loadWorkspaceMembers } from "./workspaces.js";
import { loadPendingInvites } from "./invites.js";
import { loadCategories } from "./categories.js";
import { loadMerchantWatchlist } from "./vendors.js";
import { openOnboarding } from "./onboarding.js";

window.signInWithGoogle = function() {
    showDebug('Sign-in button clicked...');

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    const btn = document.getElementById('signInBtn');
    btn.disabled = true;
    btn.innerHTML = 'Signing in...';

    signInWithPopup(state.auth, provider)
        .then((result) => {
            showDebug('&#x2705; Popup sign-in successful');
            // onAuthStateChanged will handle the dashboard
        })
        .catch((error) => {
            btn.disabled = false;
            btn.innerHTML = 'Log In';

            showDebug('&#x274C; Error code: <code>' + error.code + '</code>');
            showDebug('Message: ' + error.message);

            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                showDebug('Trying redirect method...');
                signInWithRedirect(state.auth, provider);
            } else if (error.code === 'auth/unauthorized-domain') {
                showDebug('&#x26A0;&#xFE0F; FIX NEEDED: Add <code>' + window.location.hostname + '</code> to Firebase Auth > Settings > Authorized domains');
            } else if (error.code === 'auth/network-request-failed') {
                showDebug('&#x26A0;&#xFE0F; Check your internet connection');
            }
        });
};

window.signOut = function() {
    firebaseSignOut(state.auth);
    state.gmailAccessToken = null;
};

export function showAuth() {
    document.getElementById('landingSection').classList.remove('hidden');
    document.getElementById('dashboardContent').classList.add('hidden');
}

export async function showDashboard() {

    if (state.appInitialized) return;
    state.appInitialized = true;

    document.getElementById('landingSection').classList.add('hidden');
    document.getElementById('dashboardContent').classList.remove('hidden');

    let needsOnboarding = false;
    try {
        needsOnboarding = await ensureUserProfile();
        await migratePersonalWorkspace();
        await loadUserWorkspaces();
        await loadWorkspaceMembers();
        await loadCategories();
        await loadMerchantWatchlist();
        await loadPendingInvites();

        console.log("ACTIVE WORKSPACE ID:", state.currentWorkspaceId);
    } catch (error) {
        console.error("Failed during startup:", error);
    }

    const avatarEl = document.getElementById('topbarAvatar');
    if (avatarEl && state.currentUser) {
        const label = state.currentUser.displayName || state.currentUser.email || 'A';
        avatarEl.textContent = label.trim().charAt(0).toUpperCase();
        avatarEl.title = state.currentUser.displayName || state.currentUser.email || 'Account';
    }

    await loadBudget();
    await loadDisplayName();
    loadExpenses();
    loadLoans();

    if (needsOnboarding) {
        openOnboarding();
    }
}
