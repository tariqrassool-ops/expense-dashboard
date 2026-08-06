import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function loadCurrentWorkspace() {

    if (!state.currentUser) return;

    const workspaceId =
        `${state.currentUser.uid}_personal`;

    const snap = await getDoc(
        doc(state.db, "workspaces", workspaceId)
    );

    if (!snap.exists()) return;

    state.currentWorkspaceId = workspaceId;
    state.currentWorkspace = {
        id: workspaceId,
        ...snap.data()
    };
}
