import {
    collection,
    doc,
    getDoc,
    addDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function ensureDefaultWorkspace() {
    if (!state.currentUser) return;

    const userRef = doc(state.db, "users", state.currentUser.uid);
    const userSnap = await getDoc(userRef);

    let workspaceId;

    // Existing workspace
    if (userSnap.exists() && userSnap.data().defaultWorkspaceId) {
        workspaceId = userSnap.data().defaultWorkspaceId;
    } else {
        // Create workspace
        const workspaceRef = await addDoc(
            collection(state.db, "workspaces"),
            {
                name: "Personal",
                type: "personal",
                ownerId: state.currentUser.uid,
                createdAt: serverTimestamp()
            }
        );

        workspaceId = workspaceRef.id;

        await setDoc(
            userRef,
            {
                defaultWorkspaceId: workspaceId
            },
            { merge: true }
        );
    }

    // Ensure membership exists
    const memberRef = doc(
        state.db,
        "workspaceMembers",
        `${workspaceId}_${state.currentUser.uid}`
    );

    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
        await setDoc(memberRef, {
            workspaceId,
            userId: state.currentUser.uid,
            role: "owner",
            joinedAt: serverTimestamp()
        });
    }

    state.currentWorkspaceId = workspaceId;
    
    return workspaceId;
}
