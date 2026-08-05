// ===================== APP ENTRY POINT =====================
// This is the only script index.html loads directly. Every other module
// is pulled in here (or transitively via each other's imports) purely for
// its side effects — most of them attach handlers onto `window` so the
// inline onclick="..." attributes in index.html can find them.
//
// Import order mostly doesn't matter: the browser resolves each module's
// own `import` statements first, so everything ends up initialized in the
// right dependency order regardless of the order listed below.

import './firebase-init.js';
import './auth.js';
import './topbar.js';
import './tabs.js';
import './modal.js';
import './expenses.js';
import './gmail-sync.js';
import './loans.js';
import './settings.js';
import './charts.js';
import './export.js';
