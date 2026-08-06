// ===================== BUDGET & DISPLAY NAME =====================
// Both are small user preferences synced via the same Firestore doc:
// settings/{uid}.
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { DEFAULT_BUDGET } from './config.js';
import { state } from './state.js';
import { showLoading, hideLoading, showToast } from './utils.js';

// ----- Budget -----
export function getBudget() {
    return state.currentBudget;
}

export async function loadBudget() {
    try {
        const snap = await getDoc(doc(state.db, 'settings', state.currentUser.uid));
        state.currentBudget = (snap.exists() && typeof snap.data().monthlyBudget === 'number')
            ? snap.data().monthlyBudget
            : DEFAULT_BUDGET;
    } catch (e) {
        state.currentBudget = DEFAULT_BUDGET;
        showToast('Could not load budget: ' + e.message, 'error');
    }
}

window.editBudget = async function() {
    const input = prompt('Set your monthly budget (LKR):', state.currentBudget);
    if (input === null) return;
    const val = parseFloat(input);
    if (isNaN(val) || val <= 0) { showToast('Please enter a valid budget amount', 'error'); return; }

    showLoading('Saving budget...');
    try {
        await setDoc(
    doc(state.db, 'settings', state.currentUser.uid),
    {
        monthlyBudget: val,
        workspaceId: `${state.currentUser.uid}_personal`
    },
    { merge: true }
    );
        
        state.currentBudget = val;
        // Dynamic import avoids a hard circular dependency with charts.js (which imports getBudget from here).
        const { updateStats } = await import('./charts.js');
        updateStats();
        showToast('Budget updated!', 'success');
    } catch (e) {
        showToast('Failed to save budget: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};

// ----- Display name -----
// Separate, editable "name" setting shown in the "Welcome back, ___" greeting.
// Independent from the Google account name — defaults to it, but the user can override it.
export function renderWelcomeName() {
    const el = document.getElementById('welcomeName');
    if (el) el.textContent = state.currentDisplayName;
}

export async function loadDisplayName() {
    try {
        const snap = await getDoc(doc(state.db, 'settings', state.currentUser.uid));
        const saved = snap.exists() ? snap.data().displayName : null;
        if (saved && typeof saved === 'string' && saved.trim()) {
            state.currentDisplayName = saved.trim();
        } else {
            const fallback = (state.currentUser && state.currentUser.displayName) ? state.currentUser.displayName.split(' ')[0] : 'there';
            state.currentDisplayName = fallback || 'there';
        }
    } catch (e) {
        state.currentDisplayName = (state.currentUser && state.currentUser.displayName) ? state.currentUser.displayName.split(' ')[0] : 'there';
    }
    renderWelcomeName();
}

window.editDisplayName = async function() {
    const input = prompt('What should we call you?', state.currentDisplayName);
    if (input === null) return;
    const val = input.trim();
    if (!val) { showToast('Please enter a name', 'error'); return; }

    showLoading('Saving name...');
    try {
        await setDoc(
    doc(state.db, 'settings', state.currentUser.uid),
    {
        displayName: val,
        workspaceId: `${state.currentUser.uid}_personal`
    },
    { merge: true }
);
        state.currentDisplayName = val;
        renderWelcomeName();
        showToast('Name updated!', 'success');
    } catch (e) {
        showToast('Failed to save name: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};
