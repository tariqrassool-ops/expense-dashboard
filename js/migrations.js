import {
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function migrateWorkspaceIds() {
    if (!state.currentUser) return;

    const workspaceId = `${state.currentUser.uid}_personal`;

    // ---------- Expenses ----------
    let snapshot = await getDocs(
        query(
            collection(state.db, "expenses"),
            where("userId", "==", state.currentUser.uid)
        )
    );

    if (!snapshot.empty) {
        const batch = writeBatch(state.db);

        snapshot.forEach(document => {
            const data = document.data();

            if (!data.workspaceId) {
                batch.update(doc(state.db, "expenses", document.id), {
                    workspaceId
                });
            }
        });

        await batch.commit();
    }

    // ---------- Loans ----------
    snapshot = await getDocs(
        query(
            collection(state.db, "loans"),
            where("userId", "==", state.currentUser.uid)
        )
    );

    if (!snapshot.empty) {
        const batch = writeBatch(state.db);

        snapshot.forEach(document => {
            const data = document.data();

            if (!data.workspaceId) {
                batch.update(doc(state.db, "loans", document.id), {
                    workspaceId
                });
            }
        });

        await batch.commit();
    }
}
