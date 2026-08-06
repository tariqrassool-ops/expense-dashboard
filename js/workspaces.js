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

    // Read the user profile
    const userRef = doc(state.db, "users", state.currentUser.uid);
    const userSnap = await getDoc(userRef);

    // User already has a workspace
    if (userSnap.exists() && userSnap.data().defaultWorkspaceId) {
        return userSnap.data().defaultWorkspaceId;
    }

    // Create a new workspace with an auto-generated ID
    const workspaceRef = await addDoc(collection(state.db, "workspaces"), {
        name: "Personal",
        type: "personal",
        ownerId: state.currentUser.uid,
        createdAt: serverTimestamp()
    });

    const workspaceId = workspaceRef.id;

    // Create membership record
    await setDoc(
        doc(state.db, "workspaceMembers", `${workspaceId}_${state.currentUser.uid}`),
        {
            workspaceId,
            userId: state.currentUser.uid,
            role: "owner",
            joinedAt: serverTimestamp()
        }
    );

    // Save workspace ID onto the user profile
    await setDoc(
        userRef,
        {
            defaultWorkspaceId: workspaceId
        },
        { merge: true }
    );

    return workspaceId;
}
