import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    doc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function migratePersonalWorkspace() {
    if (!state.currentUser) return;

    const userRef = doc(state.db, "users", state.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const user = userSnap.data();
    console.log("MIGRATION USER:", user);
    console.log("MIGRATION DEFAULT WORKSPACE:", user.defaultWorkspaceId);
    console.log(
    "NEEDS MIGRATION:",
    !user.defaultWorkspaceId || user.defaultWorkspaceId.endsWith("_personal")
);

    // Already migrated
    if (
        user.defaultWorkspaceId &&
        !user.defaultWorkspaceId.endsWith("_personal")
    ) {
        return;
    }

    // Create new workspace
    const workspaceRef = await addDoc(collection(state.db, "workspaces"), {
        name: "Personal",
        type: "personal",
        ownerId: state.currentUser.uid,
        createdAt: serverTimestamp()
    });

    const newWorkspaceId = workspaceRef.id;

    // Create membership
    await setDoc(
        doc(
            state.db,
            "workspaceMembers",
            `${newWorkspaceId}_${state.currentUser.uid}`
        ),
        {
            workspaceId: newWorkspaceId,
            userId: state.currentUser.uid,
            role: "owner",
            joinedAt: serverTimestamp()
        }
    );

    // Update user
    await updateDoc(userRef, {
        defaultWorkspaceId: newWorkspaceId
    });

    // --------------------
    // Update expenses
    // --------------------

    let snapshot = await getDocs(
        query(
            collection(state.db, "expenses"),
            where("userId", "==", state.currentUser.uid)
        )
    );

    if (!snapshot.empty) {
        const batch = writeBatch(state.db);

        snapshot.forEach(document => {
            batch.update(document.ref, {
                workspaceId: newWorkspaceId
            });
        });

        await batch.commit();
    }

    // --------------------
    // Update loans
    // --------------------

    snapshot = await getDocs(
        query(
            collection(state.db, "loans"),
            where("userId", "==", state.currentUser.uid)
        )
    );

    if (!snapshot.empty) {
        const batch = writeBatch(state.db);

        snapshot.forEach(document => {
            batch.update(document.ref, {
                workspaceId: newWorkspaceId
            });
        });

        await batch.commit();
    }

    // --------------------
    // Update settings
    // --------------------

    await setDoc(
        doc(state.db, "settings", state.currentUser.uid),
        {
            workspaceId: newWorkspaceId
        },
        { merge: true }
    );

    console.log("Workspace migration complete.");
}
