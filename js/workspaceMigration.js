import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    setDoc,
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

    // Already migrated
    if (
        user.defaultWorkspaceId &&
        !user.defaultWorkspaceId.endsWith("_personal")
    ) {
        state.currentWorkspaceId = user.defaultWorkspaceId;
        return user.defaultWorkspaceId;
    }

    // Create the workspace, its owner membership, and the user's
    // defaultWorkspaceId pointer in a single atomic batch — either all
    // three land together, or none do, so there's never a half-created
    // workspace with no owner membership.
    const workspaceRef = doc(collection(state.db, "workspaces"));
    const newWorkspaceId = workspaceRef.id;
    const memberRef = doc(state.db, "workspaceMembers", `${newWorkspaceId}_${state.currentUser.uid}`);

    const batch = writeBatch(state.db);
    batch.set(workspaceRef, {
        name: "Personal",
        type: "personal",
        ownerId: state.currentUser.uid,
        createdAt: serverTimestamp()
    });
    batch.set(memberRef, {
        workspaceId: newWorkspaceId,
        userId: state.currentUser.uid,
        role: "owner",
        displayName: state.currentUser.displayName || state.currentUser.email || "Owner",
        email: state.currentUser.email || "",
        joinedAt: serverTimestamp()
    });
    batch.update(userRef, { defaultWorkspaceId: newWorkspaceId });
    await batch.commit();

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

    state.currentWorkspaceId = newWorkspaceId;

    return newWorkspaceId;
}
