import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function ensureDefaultWorkspace() {
    if (!state.currentUser) return;

    const workspaceId = `${state.currentUser.uid}_personal`;

    const ref = doc(state.db, "workspaces", workspaceId);

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
        await setDoc(ref, {
            id: workspaceId,
            name: "Personal",
            ownerId: state.currentUser.uid,
            members: [state.currentUser.uid],
            type: "personal",
            createdAt: serverTimestamp()
        });
    }

    return workspaceId;
}
