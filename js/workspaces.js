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
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";
import { showToast, showLoading, hideLoading, escapeHtml } from "./utils.js";
import { loadExpenses } from "./expenses.js";
import { loadLoans } from "./loans.js";
import { loadCategories } from "./categories.js";

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
        const data = memberDoc.data();

        // Backfill: membership records created before displayName/email were
        // tracked won't have them, which is what makes the split picker show
        // a generic "Member" for those people. Fix your own record forward
        // the moment you're back — everyone else gets fixed the same way on
        // their own next login.
        if (!data.displayName) {
            try {
                const fallbackName = state.currentUser.displayName || state.currentUser.email || 'Member';
                await updateDoc(memberDoc.ref, {
                    displayName: fallbackName,
                    email: state.currentUser.email || ''
                });
                data.displayName = fallbackName;
                data.email = state.currentUser.email || '';
            } catch (e) {
                console.warn('Could not backfill member profile info:', e);
            }
        }

        const wsSnap = await getDoc(doc(state.db, "workspaces", data.workspaceId));
        if (wsSnap.exists()) {
            workspaces.push({ id: wsSnap.id, role: data.role, ...wsSnap.data() });
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
        await updateDoc(doc(state.db, 'users', state.currentUser.uid), { defaultWorkspaceId: workspaceId });
        await loadExpenses();
        await loadLoans();
        await loadWorkspaceMembers();
        await loadCategories();
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
        const canLeave = w.role !== 'owner';
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
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                <button type="button" class="workspace-delete-btn workspace-neutral-btn" onclick="toggleMembersList('${w.id}')">Members</button>
                ${canLeave ? `<button type="button" class="workspace-delete-btn" onclick="leaveWorkspace('${w.id}')">Leave</button>` : ''}
                ${canDelete ? `<button type="button" class="workspace-delete-btn" onclick="deleteWorkspace('${w.id}')">Delete</button>` : ''}
            </div>
        </div>
        <div class="workspace-members-list hidden" id="members-${w.id}"></div>`;
    }).join('');
}

// ===================== MEMBERS =====================

const memberRosterCache = {};

async function getWorkspaceRoster(workspaceId, forceRefresh = false) {
    if (!forceRefresh && memberRosterCache[workspaceId]) return memberRosterCache[workspaceId];

    const snap = await getDocs(
        query(collection(state.db, 'workspaceMembers'), where('workspaceId', '==', workspaceId))
    );
    const roster = snap.docs.map(d => d.data());
    memberRosterCache[workspaceId] = roster;
    return roster;
}

async function renderMembersList(workspaceId) {
    const el = document.getElementById(`members-${workspaceId}`);
    if (!el) return;

    el.innerHTML = '<p style="font-size: 0.75rem; color: var(--gray);">Loading members...</p>';

    const roster = await getWorkspaceRoster(workspaceId, true);
    const myWorkspace = state.workspaces.find(w => w.id === workspaceId);
    const myRole = myWorkspace ? myWorkspace.role : null;

    el.innerHTML = roster.map(m => {
        const isSelf = m.userId === state.currentUser.uid;
        const canRemove = myRole === 'owner' && !isSelf;
        return `
        <div class="workspace-member-row">
            <span>
                ${escapeHtml(m.displayName || m.email || 'Member')}
                ${isSelf ? '<em style="opacity:0.6; font-style: normal;"> (you)</em>' : ''}
                <span class="workspace-tag" style="text-transform: capitalize;">${escapeHtml(m.role)}</span>
            </span>
            ${canRemove
                ? `<button type="button" class="workspace-delete-btn" onclick="removeMember('${workspaceId}','${m.userId}')">Remove</button>`
                : ''}
        </div>`;
    }).join('');
}

window.toggleMembersList = async function(workspaceId) {
    const el = document.getElementById(`members-${workspaceId}`);
    if (!el) return;

    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        await renderMembersList(workspaceId);
    } else {
        el.classList.add('hidden');
    }
};

// Owner-only: removes someone else from the workspace. They lose access
// immediately (the isWorkspaceMember() check in the rules starts failing
// for them on their next read).
window.removeMember = async function(workspaceId, memberUserId) {
    if (memberUserId === state.currentUser.uid) return;
    if (!confirm("Remove this person from the workspace? They'll lose access immediately.")) return;

    showLoading('Removing member...');
    try {
        await deleteDoc(doc(state.db, 'workspaceMembers', `${workspaceId}_${memberUserId}`));
        await renderMembersList(workspaceId);
        showToast('Member removed', 'success');
    } catch (e) {
        showToast('Failed to remove member: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};

// Any non-owner can leave a shared workspace on their own. Unlike deleting
// a workspace, this doesn't require it to be empty — you're just exiting,
// the workspace and everyone else's data are untouched.
window.leaveWorkspace = async function(workspaceId) {
    const ws = state.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    if (ws.role === 'owner') {
        showToast("As the owner, delete the workspace instead of leaving it", 'error');
        return;
    }
    if (!confirm(`Leave "${ws.name}"? You'll lose access to its expenses unless invited back.`)) return;

    showLoading('Leaving workspace...');
    try {
        await deleteDoc(doc(state.db, 'workspaceMembers', `${workspaceId}_${state.currentUser.uid}`));

        const wasActive = workspaceId === state.currentWorkspaceId;
        await loadUserWorkspaces();

        if (wasActive && state.workspaces.length > 0) {
            const next = state.workspaces[0];
            await updateDoc(doc(state.db, 'users', state.currentUser.uid), { defaultWorkspaceId: next.id });
            await switchWorkspace(next.id);
        }

        await renderWorkspaceModalList();
        showToast(`Left "${ws.name}"`, 'success');
    } catch (e) {
        showToast('Failed to leave workspace: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};

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
        const wsRef = doc(collection(state.db, "workspaces"));
        const memberRef = doc(state.db, "workspaceMembers", `${wsRef.id}_${state.currentUser.uid}`);

        const batch = writeBatch(state.db);
        batch.set(wsRef, {
            name,
            type: 'shared',
            ownerId: state.currentUser.uid,
            createdAt: serverTimestamp()
        });
        batch.set(memberRef, {
            workspaceId: wsRef.id,
            userId: state.currentUser.uid,
            role: 'owner',
            displayName: state.currentUser.displayName || state.currentUser.email || 'Owner',
            email: state.currentUser.email || '',
            joinedAt: serverTimestamp()
        });
        await batch.commit();

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
