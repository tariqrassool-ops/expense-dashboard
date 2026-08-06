import {
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function migratePersonalWorkspace() {
    if (!state.currentUser) return;

    const userRef = doc(state.db, "users", state.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const user = userSnap.data();

    // Already migrated
    if (
        user.defaultWorkspaceId &&
        !user.defaultWorkspaceId.endsWith("_personal")
    ) {
        return;
    }

    // Create the new workspace
    const workspaceRef = await addDoc(
        collection(state.db, "workspaces"),
        {
            name: "Personal",
            type: "personal",
            ownerId: state.currentUser.uid,
            createdAt: serverTimestamp()
        }
    );

    const workspaceId = workspaceRef.id;

    // Create membership
    await setDoc(
        doc(
            state.db,
            "workspaceMembers",
            `${workspaceId}_${state.currentUser.uid}`
        ),
        {
            workspaceId,
            userId: state.currentUser.uid,
            role: "owner",
            joinedAt: serverTimestamp()
        }
    );

    // Update the user profile
    await setDoc(
        userRef,
        {
            defaultWorkspaceId: workspaceId
        },
        { merge: true }
    );
}
