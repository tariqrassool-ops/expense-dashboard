// ===================== SHARED APP STATE =====================
// Every other module reads/writes through this object instead of holding
// its own copy, so state stays in sync across files.
// (Kept as a single mutable object rather than separate `let` exports
// because ES module bindings can't be reassigned from outside the file
// that declares them — this way `state.currentUser = x` works anywhere.)
import { DEFAULT_BUDGET } from './config.js';

export const state = {
    app: null,
    auth: null,
    db: null,
    currentUser: null,
    currentWorkspaceId: null,
    currentWorkspace: null,
    workspaces: [],
    pendingInvites: [],
    allExpenses: [],
    allLoans: [],
    gmailAccessToken: null,
    selectedExpenses: new Set(),
    currentBudget: DEFAULT_BUDGET,
    currentDisplayName: 'there',
    appInitialized: false,
};
