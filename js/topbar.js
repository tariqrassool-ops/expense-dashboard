// ===================== TOPBAR ACTIONS =====================
import { showToast } from './utils.js';

window.toggleTopbarSearch = function() {
    const wrap = document.getElementById('topbarSearchWrap');
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) {
        document.getElementById('topbarSearchInput').focus();
    }
};

window.topbarSearch = function(value) {
    // Mirrors the transactions search filter and jumps there if there's a query
    const searchInput = document.getElementById('searchFilter');
    if (searchInput) searchInput.value = value;
    if (value.trim().length > 0) {
        window.switchTab('transactions');
        window.applyFilters();
    }
};

window.showNotifications = function() {
    document.getElementById('notifBadge').classList.add('hidden');
    showToast("You're all caught up — no new notifications", 'info');
};
