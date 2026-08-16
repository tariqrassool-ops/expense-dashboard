import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function ensureUserProfile() {
    if (!state.currentUser) return true;

    const ref = doc(state.db, "users", state.currentUser.uid);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
        // First-ever login: seed a placeholder default workspace ID.
        // migratePersonalWorkspace() will replace this with a real
        // workspace on its first run.
        await setDoc(ref, {
            uid: state.currentUser.uid,
            email: state.currentUser.email,
            displayName: state.currentUser.displayName || "",
            photoURL: state.currentUser.photoURL || "",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            onboardingComplete: false,
            defaultWorkspaceId: `${state.currentUser.uid}_personal`
        });
        return true;
    }

    // Existing user: just bump lastLoginAt. Never touch
    // defaultWorkspaceId here — it's owned by migratePersonalWorkspace()
    // once a real workspace exists, and overwriting it on every login
    // was causing a brand-new "Personal" workspace to be created each time.
    await setDoc(
        ref,
        { lastLoginAt: serverTimestamp() },
        { merge: true }
    );

    return snapshot.data().onboardingComplete !== true;
}

export async function markOnboardingComplete() {
    if (!state.currentUser) return;
    await setDoc(
        doc(state.db, "users", state.currentUser.uid),
        { onboardingComplete: true },
        { merge: true }
    );
}
