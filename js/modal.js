// ===================== MODAL =====================
import { state } from './state.js';

window.openAddModal = function() {
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseMerchant').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseCategory').value = '';
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseSplitEnabled').checked = false;
    document.getElementById('splitWithName').value = '';
    document.getElementById('splitOwedAmount').value = '';
    document.getElementById('splitSettled').checked = false;
    document.getElementById('expensePaid').checked = true;
    window.toggleSplitFields();
    document.getElementById('modalTitle').textContent = 'Add Expense';
    document.getElementById('expenseModal').classList.add('active');
    document.getElementById('expenseDate').focus();
};

window.editExpense = function(id) {
    const expense = state.allExpenses.find(e => e.id === id);
    if (!expense) return;

    document.getElementById('expenseId').value = expense.id;
    document.getElementById('expenseDate').value = expense.date;
    document.getElementById('expenseMerchant').value = expense.merchant || '';
    document.getElementById('expenseAmount').value = expense.amount || '';
    document.getElementById('expenseCategory').value = expense.category || '';
    document.getElementById('expenseDescription').value = expense.description || '';
    const split = expense.split;
    document.getElementById('expenseSplitEnabled').checked = !!(split && split.enabled);
    document.getElementById('splitWithName').value = split ? (split.withName || '') : '';
    document.getElementById('splitOwedAmount').value = split ? (split.owedToYou || '') : '';
    document.getElementById('splitSettled').checked = !!(split && split.settled);
    document.getElementById('expensePaid').checked = expense.paid !== false;
    window.toggleSplitFields();
    document.getElementById('modalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseModal').classList.add('active');
    document.getElementById('expenseDate').focus();
};

window.toggleSplitFields = function() {
    document.getElementById('splitFieldsWrap').classList.toggle('hidden', !document.getElementById('expenseSplitEnabled').checked);
};

window.closeModal = function() {
    document.getElementById('expenseModal').classList.remove('active');
};

// Keyboard shortcuts — Escape closes whichever modal is currently open.
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// Close modal on overlay click
document.getElementById('expenseModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('expenseModal')) window.closeModal();
});
