// ===================== WORKSPACE INVITES =====================
// Invite-by-email flow. Invites work even if the invitee hasn't signed up
// yet — the invite doc is just keyed on their email, and it surfaces the
// next time they log in and their address matches a pending invite.
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";
import { showToast, showLoading, hideLoading } from "./utils.js";
import { loadUserWorkspaces } from "./workspaces.js";

export async function loadPendingInvites() {
    if (!state.currentUser || !state.currentUser.email) return;

    const snap = await getDocs(
        query(
            collection(state.db, "invites"),
            where("invitedEmail", "==", state.currentUser.email.toLowerCase()),
            where("status", "==", "pending")
        )
    );

    state.pendingInvites = [];
    snap.forEach(d => state.pendingInvites.push({ id: d.id, ...d.data() }));

    renderInviteBadge();
}

function renderInviteBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.classList.toggle('hidden', state.pendingInvites.length === 0);
}

window.sendWorkspaceInvite = async function() {
    const input = document.getElementById('inviteEmailInput');
    const email = input.value.trim().toLowerCase();

    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email', 'error');
        return;
    }
    if (email === (state.currentUser.email || '').toLowerCase()) {
        showToast("That's your own email", 'error');
        return;
    }

    showLoading('Sending invite...');
    try {
        await addDoc(collection(state.db, "invites"), {
            workspaceId: state.currentWorkspaceId,
            workspaceName: state.currentWorkspace?.name || 'Workspace',
            invitedEmail: email,
            invitedByUid: state.currentUser.uid,
            invitedByName: state.currentUser.displayName || state.currentUser.email,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        input.value = '';
        showToast(`Invite sent to ${email}`, 'success');
    } catch (e) {
        showToast('Failed to send invite: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};

// Owns the notification bell — replaces the earlier stub in topbar.js.
window.showNotifications = function() {
    renderInvitesModal();
    document.getElementById('invitesModal')?.classList.add('active');
};

window.closeInvitesModal = function() {
    document.getElementById('invitesModal')?.classList.remove('active');
};

document.getElementById('invitesModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'invitesModal') window.closeInvitesModal();
});

function renderInvitesModal() {
    const container = document.getElementById('invitesList');
    if (!container) return;

    if (state.pendingInvites.length === 0) {
        container.innerHTML = '<p style="color: var(--gray);">No pending invites right now.</p>';
        return;
    }

    container.innerHTML = state.pendingInvites.map(invite => `
        <div class="invite-card">
            <div class="invite-card-text">
                <strong>${escapeForDisplay(invite.invitedByName || 'Someone')}</strong> invited you to
                <strong>${escapeForDisplay(invite.workspaceName || 'a workspace')}</strong>
            </div>
            <div class="invite-actions">
                <button class="btn btn-primary" style="padding: 5px 12px; font-size: 0.8rem;" onclick="acceptInvite('${invite.id}')">Accept</button>
                <button class="btn" style="padding: 5px 12px; font-size: 0.8rem; background: var(--light-gray); color: var(--dark);" onclick="declineInvite('${invite.id}')">Decline</button>
            </div>
        </div>
    `).join('');
}

// Minimal local escape so invite text (names/workspace names, which came
// from other users) can't inject markup into this modal.
function escapeForDisplay(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.acceptInvite = async function(inviteId) {
    const invite = state.pendingInvites.find(i => i.id === inviteId);
    if (!invite) return;

    showLoading('Joining workspace...');
    try {
        await setDoc(
            doc(state.db, "workspaceMembers", `${invite.workspaceId}_${state.currentUser.uid}`),
            {
                workspaceId: invite.workspaceId,
                userId: state.currentUser.uid,
                role: 'member',
                displayName: state.currentUser.displayName || state.currentUser.email || 'Member',
                email: state.currentUser.email || '',
                joinedAt: serverTimestamp(),
                viaInviteId: inviteId
            }
        );
        await updateDoc(doc(state.db, "invites", inviteId), { status: 'accepted' });

        showToast(`Joined ${invite.workspaceName}!`, 'success');
        await loadPendingInvites();
        await loadUserWorkspaces();
        window.closeInvitesModal();
    } catch (e) {
        showToast('Failed to accept invite: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};

window.declineInvite = async function(inviteId) {
    showLoading('Declining...');
    try {
        await updateDoc(doc(state.db, "invites", inviteId), { status: 'declined' });
        await loadPendingInvites();
        renderInvitesModal();
        showToast('Invite declined', 'info');
    } catch (e) {
        showToast('Failed: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
};
