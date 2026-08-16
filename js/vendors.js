// ===================== VENDOR WATCHLIST =====================
// A per-user list of named vendors ("Uber", "Netflix", your bank, etc.)
// with a default category each. Two jobs today:
//   1. Auto-suggests a category when the merchant name on a manual entry
//      matches a watchlist entry.
//   2. Acts as the registry real Gmail parsers will plug into once built —
//      each parser can check whether its vendor is on the user's watchlist
//      before running, rather than every parser running for every user.
// It does NOT parse any emails itself yet.
import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";
import { showToast, escapeHtml } from "./utils.js";

export async function loadMerchantWatchlist() {
    if (!state.currentUser) {
        state.merchantWatchlist = [];
        return;
    }

    const snap = await getDoc(doc(state.db, "users", state.currentUser.uid));
    state.merchantWatchlist = (snap.exists() && Array.isArray(snap.data().merchantWatchlist))
        ? snap.data().merchantWatchlist
        : [];
}

async function saveMerchantWatchlist(list) {
    state.merchantWatchlist = list;
    await setDoc(
        doc(state.db, "users", state.currentUser.uid),
        { merchantWatchlist: list },
        { merge: true }
    );
}

// Returns the matching watchlist entry's category for a given merchant
// name, or null if nothing matches. Used to auto-fill category on manual
// entry.
export function matchVendorCategory(merchantName) {
    if (!merchantName) return null;
    const needle = merchantName.trim().toLowerCase();
    const hit = state.merchantWatchlist.find(v => needle.includes(v.name.trim().toLowerCase()));
    return hit ? hit.category : null;
}

export function renderVendorList(containerId = 'vendorManagerList') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (state.merchantWatchlist.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); font-size: 0.8rem;">No vendors added yet.</p>';
        return;
    }

    container.innerHTML = state.merchantWatchlist.map((v, i) => `
        <div class="category-chip">
            <span>${escapeHtml(v.name)} <span style="opacity:0.6;">&middot; ${escapeHtml(v.category)}</span></span>
            <button type="button" onclick="removeVendor(${i}, '${containerId}')" aria-label="Remove ${escapeHtml(v.name)}">&times;</button>
        </div>
    `).join('');
}

window.addVendorFromInputs = async function(nameInputId, categorySelectId, containerId) {
    const nameInput = document.getElementById(nameInputId);
    const categorySelect = document.getElementById(categorySelectId);
    const name = nameInput.value.trim();
    const category = categorySelect.value;

    if (!name) { showToast('Please enter a vendor name', 'error'); return; }
    if (!category) { showToast('Please choose a category for this vendor', 'error'); return; }

    if (state.merchantWatchlist.some(v => v.name.toLowerCase() === name.toLowerCase())) {
        showToast('That vendor is already on your list', 'error');
        return;
    }

    const list = [...state.merchantWatchlist, { name, category }];
    try {
        await saveMerchantWatchlist(list);
        renderVendorList(containerId);
        nameInput.value = '';
    } catch (e) {
        showToast('Failed to add vendor: ' + e.message, 'error');
    }
};

window.removeVendor = async function(index, containerId) {
    const list = state.merchantWatchlist.filter((_, i) => i !== index);
    try {
        await saveMerchantWatchlist(list);
        renderVendorList(containerId);
    } catch (e) {
        showToast('Failed to remove vendor: ' + e.message, 'error');
    }
};
