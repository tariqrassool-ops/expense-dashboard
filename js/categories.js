// ===================== CATEGORIES =====================
// Per-workspace, customizable expense categories. Seeded with the original
// fixed list on first use, then editable by any workspace member.
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";
import { showToast, escapeHtml } from "./utils.js";
import { renderVendorList } from "./vendors.js";

const DEFAULT_CATEGORIES = [
    'Food', 'Travel', 'Groceries', 'Banking', 'Transfer',
    'Utilities', 'Loan Payment', 'Uncategorized'
];

export async function loadCategories() {
    if (!state.currentWorkspaceId) {
        state.categories = [...DEFAULT_CATEGORIES];
        return;
    }

    const ref = doc(state.db, "categories", state.currentWorkspaceId);
    const snap = await getDoc(ref);

    if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        state.categories = snap.data().list;
    } else {
        // First time this workspace has needed categories — seed the defaults.
        state.categories = [...DEFAULT_CATEGORIES];
        try {
            await setDoc(ref, { list: state.categories, updatedAt: serverTimestamp() });
        } catch (e) {
            console.warn('Could not seed default categories:', e);
        }
    }

    renderCategoryManagerList();
    populateCategorySelect();
}

async function saveCategories(list) {
    state.categories = list;
    await setDoc(
        doc(state.db, "categories", state.currentWorkspaceId),
        { list, updatedAt: serverTimestamp() }
    );
    populateCategorySelect();
}

// Fills the expense modal's category <select> from state.categories,
// preserving whatever's currently selected if it's still in the list.
export function populateCategorySelect() {
    const select = document.getElementById('expenseCategory');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">Select Category</option>' +
        state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    if (current && state.categories.includes(current)) {
        select.value = current;
    }
}

// ===================== CATEGORY MANAGEMENT UI =====================
// Used both from Settings and from the onboarding wizard's category step.

export function renderCategoryManagerList(containerId = 'categoryManagerList') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = state.categories.map((c, i) => `
        <div class="category-chip">
            <span>${escapeHtml(c)}</span>
            <button type="button" onclick="removeCategory(${i}, '${containerId}')" aria-label="Remove ${escapeHtml(c)}">&times;</button>
        </div>
    `).join('');
}

window.addCategoryFromInput = async function(inputId, containerId) {
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if (!name) return;

    if (state.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
        showToast('That category already exists', 'error');
        return;
    }

    const list = [...state.categories, name];
    try {
        await saveCategories(list);
        renderCategoryManagerList(containerId);
        input.value = '';
    } catch (e) {
        showToast('Failed to add category: ' + e.message, 'error');
    }
};

window.removeCategory = async function(index, containerId) {
    if (state.categories.length <= 1) {
        showToast('You need at least one category', 'error');
        return;
    }
    const list = state.categories.filter((_, i) => i !== index);
    try {
        await saveCategories(list);
        renderCategoryManagerList(containerId);
    } catch (e) {
        showToast('Failed to remove category: ' + e.message, 'error');
    }
};

window.openAppSettingsModal = function() {
    renderCategoryManagerList('categoryManagerList');
    renderVendorList('vendorManagerList');

    const vendorCategorySelect = document.getElementById('settingsVendorCategory');
    if (vendorCategorySelect) {
        vendorCategorySelect.innerHTML = '<option value="">Category</option>' +
            state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    document.getElementById('appSettingsModal')?.classList.add('active');
};

window.closeAppSettingsModal = function() {
    document.getElementById('appSettingsModal')?.classList.remove('active');
};

document.getElementById('appSettingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'appSettingsModal') window.closeAppSettingsModal();
});
