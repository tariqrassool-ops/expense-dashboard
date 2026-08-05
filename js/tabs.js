// ===================== TABS =====================
window.switchTab = function(tab) {
    const isDashboard = tab === 'dashboard';
    const isTransactions = tab === 'transactions';
    const isLoans = tab === 'loans';
    document.getElementById('panelDashboard').classList.toggle('hidden', !isDashboard);
    document.getElementById('panelTransactions').classList.toggle('hidden', !isTransactions);
    document.getElementById('panelLoans').classList.toggle('hidden', !isLoans);
    document.getElementById('tabBtnDashboard').classList.toggle('active', isDashboard);
    document.getElementById('tabBtnTransactions').classList.toggle('active', isTransactions);
    document.getElementById('tabBtnLoans').classList.toggle('active', isLoans);
    document.getElementById('tabBtnDashboard').setAttribute('aria-selected', isDashboard);
    document.getElementById('tabBtnTransactions').setAttribute('aria-selected', isTransactions);
    document.getElementById('tabBtnLoans').setAttribute('aria-selected', isLoans);
};
