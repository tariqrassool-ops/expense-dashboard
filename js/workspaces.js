// ===================== WORKSPACES =====================
// Loads every workspace the signed-in user belongs to (their personal one
// plus any shared ones), renders the topbar switcher, and lets a member
// switch the active workspace or create a brand-new shared one.
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";
import { showToast, showLoading, hideLoading } from "./utils.js";
import { loadExpenses } from "./expenses.js";
import { loadLoans } from "./loans.js";

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

window.openWorkspaceModal = function() {
    const nameEl = document.getElementById('workspaceModalCurrentName');
    if (nameEl) nameEl.textContent = state.currentWorkspace ? state.currentWorkspace.name : 'Workspace';
    document.getElementById('workspaceModal')?.classList.add('active');
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
