// ===================== WORKSPACES =====================
// Loads every workspace the signed-in user belongs to (their personal one
// plus any shared ones), renders the topbar switcher, and lets a member
// switch the active workspace or create a brand-new shared one.
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getCountFromServer,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";
import { showToast, showLoading, hideLoading, escapeHtml } from "./utils.js";
import { loadExpenses } from "./expenses.js";
import { loadLoans } from "./loans.js";

// Loads the roster of the currently active workspace — used to populate
// the "split with a real member" picker. Reads directly from
// workspaceMembers (which denormalizes each member's name/email onto
// their own record) rather than the users collection, since a user's
// profile doc isn't readable by anyone but themselves under current rules.
export async function loadWorkspaceMembers() {
    if (!state.currentWorkspaceId) {
        state.currentWorkspaceMembers = [];
        return;
    }

    const snap = await getDocs(
        query(
            collection(state.db, "workspaceMembers"),
            where("workspaceId", "==", state.currentWorkspaceId)
        )
    );

    state.currentWorkspaceMembers = snap.docs
        .map(d => d.data())
        .filter(m => m.userId !== state.currentUser?.uid);
}

export async function loadUserWorkspaces() {
    if (!state.currentUser) return;

    const memberSnap = await getDocs(
        query(
            collection(state.db, "workspaceMembers"),
            where("userId", "==", state.currentUser.uid)
        )
    );

    const workspaces = [];
    for (const memberDoc of memberSnap.docs) {
        const { workspaceId, role } = memberDoc.data();
        const wsSnap = await getDoc(doc(state.db, "workspaces", workspaceId));
        if (wsSnap.exists()) {
            workspaces.push({ id: wsSnap.id, role, ...wsSnap.data() });
        }
    }

    workspaces.sort((a, b) => {
        if (a.id === state.currentWorkspaceId) return -1;
        if (b.id === state.currentWorkspaceId) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    state.workspaces = workspaces;
    renderWorkspaceSwitcher();
}

export async function switchWorkspace(workspaceId) {
    if (workspaceId === state.currentWorkspaceId) return;

    const target = state.workspaces.find(w => w.id === workspaceId);
    if (!target) return;

    state.currentWorkspaceId = workspaceId;
    state.currentWorkspace = target;

    showLoading('Switching workspace...');
    try {
        await loadExpenses();
        await loadLoans();
        await loadWorkspaceMembers();
        renderWorkspaceSwitcher();
        const menu = document.getElementById('workspaceSwitcherMenu');
        if (menu) menu.classList.add('hidden');
        showToast(`Switched to ${target.name}`, 'success');
    } finally {
        hideLoading();
    }
}
window.switchWorkspace = switchWorkspace;

window.toggleWorkspaceSwitcher = function() {
    const menu = document.getElementById('workspaceSwitcherMenu');
    if (menu) menu.classList.toggle('hidden');
};

// Close the switcher when clicking anywhere outside it.
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('workspaceSwitcherWrap');
    const menu = document.getElementById('workspaceSwitcherMenu');
    if (wrap && menu && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

export function renderWorkspaceSwitcher() {
    const label = document.getElementById('workspaceSwitcherLabel');
    const menu = document.getElementById('workspaceSwitcherMenu');
    if (!label || !menu) return;

    const current = state.workspaces.find(w => w.id === state.currentWorkspaceId);
    label.textContent = current ? current.name : 'Workspace';

    const items = state.workspaces.map(w => `
        <button type="button" class="workspace-menu-item${w.id === state.currentWorkspaceId ? ' active' : ''}" onclick="switchWorkspace('${w.id}')">
            <span>${w.name}</span>
            ${w.type === 'shared' ? '<span class="workspace-tag">Shared</span>' : ''}
        </button>
    `).join('');

    menu.innerHTML = items + `
        <div class="workspace-menu-divider"></div>
        <button type="button" class="workspace-menu-item" onclick="openWorkspaceModal()">
            &#9881;&#65039; Manage workspaces
        </button>
    `;
}

window.openWorkspaceModal = async function() {
    const nameEl = document.getElementById('workspaceModalCurrentName');
    if (nameEl) nameEl.textContent = state.currentWorkspace ? state.currentWorkspace.name : 'Workspace';
    document.getElementById('workspaceModal')?.classList.add('active');
    await renderWorkspaceModalList();
};

// Shows every workspace you belong to with its expense/loan count, so it's
// obvious which ones are empty duplicates before you delete anything.
async function renderWorkspaceModalList() {
    const container = document.getElementById('workspaceModalList');
    if (!container) return;

    container.innerHTML = '<p style="color: var(--gray); font-size: 0.8rem;">Loading workspace details...</p>';

    const rows = await Promise.all(state.workspaces.map(async (w) => {
        const [expSnap, loanSnap] = await Promise.all([
            getCountFromServer(query(collection(state.db, 'expenses'), where('workspaceId', '==', w.id))),
            getCountFromServer(query(collection(state.db, 'loans'), where('workspaceId', '==', w.id)))
        ]);
        return { ...w, expenseCount: expSnap.data().count, loanCount: loanSnap.data().count };
    }));

    container.innerHTML = rows.map(w => {
        const canDelete = w.role === 'owner' && state.workspaces.length > 1;
        return `
        <div class="workspace-row${w.id === state.currentWorkspaceId ? ' active' : ''}">
            <div class="workspace-row-info">
                <div class="workspace-row-name">
                    ${escapeHtml(w.name)}
                    ${w.id === state.currentWorkspaceId ? '<span class="workspace-tag">Current</span>' : ''}
                </div>
                <div class="workspace-row-meta">
                    ${w.expenseCount} expense${w.expenseCount === 1 ? '' : 's'} &middot;
                    ${w.loanCount} loan${w.loanCount === 1 ? '' : 's'} &middot;
                    ${w.role}
                </div>
            </div>
            ${canDelete
                ? `<button type="button" class="workspace-delete-btn" onclick="deleteWorkspace('${w.id}')">Delete</button>`
                : ''}
        </div>`;
    }).join('');
}

// Deletes a workspace, but only if you own it, it's not your last one, and
// it has zero expenses/loans in it — refuses otherwise rather than risking
// silently orphaning real data.
window.deleteWorkspace = async function(workspaceId) {
    const ws = state.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    if (ws.role !== 'owner') {
        showToast('Only the workspace owner can delete it', 'error');
        return;
    }
    if (state.workspaces.length <= 1) {
        showToast('You need at least one workspace', 'error');
        return;
    }

    showLoading('Checking workspace contents...');
    let expenseCount = 0;
    let loanCount = 0;
    try {
        const [expSnap, loanSnap] = await Promise.all([
            getCountFromServer(query(collection(state.db, 'expenses'), where('workspaceId', '==', workspaceId))),
            getCountFromServer(query(collection(state.db, 'loans'), where('workspaceId', '==', workspaceId)))
        ]);
        expenseCount = expSnap.data().count;
        loanCount = loanSnap.data().count;
    } catch (e) {
        hideLoading();
        showToast('Failed to check workspace: ' + e.message, 'error');
        return;
    }
    hideLoading();

    if (expenseCount > 0 || loanCount > 0) {
        showToast(
            `Can't delete "${ws.name}" — it has ${expenseCount} expense(s) and ${loanCount} loan(s). Only empty workspaces can be deleted here.`,
            'error'
        );
        return;
    }

    if (!confirm(`Delete the empty workspace "${ws.name}"? This can't be undone.`)) return;

    showLoading('Deleting workspace...');
    try {
        await deleteDoc(doc(state.db, 'workspaceMembers', `${workspaceId}_${state.currentUser.uid}`));
        await deleteDoc(doc(state.db, 'workspaces', workspaceId));

        const wasActive = workspaceId === state.currentWorkspaceId;
        await loadUserWorkspaces();

        if (wasActive && state.workspaces.length > 0) {
            const next = state.workspaces[0];
            await updateDoc(doc(state.db, 'users', state.currentUser.uid), { defaultWorkspaceId: next.id });
            await switchWorkspace(next.id);
        }

        await renderWorkspaceModalList();
        showToast(`"${ws.name}" deleted`, 'success');
    } catch (e) {
        showToast('Failed to delete: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};

window.closeWorkspaceModal = function() {
    document.getElementById('workspaceModal')?.classList.remove('active');
};

document.getElementById('workspaceModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'workspaceModal') window.closeWorkspaceModal();
});

// Create a brand-new named shared workspace, owned by the current user,
// and switch to it immediately.
window.createWorkspace = async function() {
    const input = document.getElementById('newWorkspaceName');
    const name = input.value.trim();
    if (!name) { showToast('Please enter a workspace name', 'error'); return; }

    showLoading('Creating workspace...');
    try {
        const wsRef = await addDoc(collection(state.db, "workspaces"), {
            name,
            type: 'shared',
            ownerId: state.currentUser.uid,
            createdAt: serverTimestamp()
        });

        await setDoc(
            doc(state.db, "workspaceMembers", `${wsRef.id}_${state.currentUser.uid}`),
            {
                workspaceId: wsRef.id,
                userId: state.currentUser.uid,
                role: 'owner',
                displayName: state.currentUser.displayName || state.currentUser.email || 'Owner',
                email: state.currentUser.email || '',
                joinedAt: serverTimestamp()
            }
        );

        input.value = '';
        await loadUserWorkspaces();
        await switchWorkspace(wsRef.id);
        showToast(`"${name}" workspace created!`, 'success');
    } catch (e) {
        showToast('Failed to create workspace: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};
