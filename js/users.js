import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from "./state.js";

export async function ensureUserProfile() {
    if (!state.currentUser) return;
    
    const workspaceId = `${state.currentUser.uid}_personal`;
    
    const ref = doc(state.db, "users", state.currentUser.uid);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
        await setDoc(ref, {
            uid: state.currentUser.uid,
            email: state.currentUser.email,
            displayName: state.currentUser.displayName || "",
            photoURL: state.currentUser.photoURL || "",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            onboardingComplete: false,
            defaultWorkspaceId: workspaceId
        });
    } else {
        await setDoc(
    ref,
    {
        lastLoginAt: serverTimestamp(),
        defaultWorkspaceId: workspaceId
    },
    { merge: true }
);
}
}
