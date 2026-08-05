// ===================== EXPENSES =====================
// Data layer (Firestore CRUD) + table rendering/filtering for the
// Transactions tab.
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from './state.js';
import { showLoading, hideLoading, showToast, formatDate, escapeHtml } from './utils.js';
import { updateStats, updateCharts } from './charts.js';

        // ===================== DATA =====================
export async function loadExpenses() {
            showLoading('Loading expenses...');
            try {
                const q = query(
                    collection(state.db, 'expenses'),
                    where('userId', '==', state.currentUser.uid)
                );
                const snapshot = await getDocs(q);

                state.allExpenses = [];
                snapshot.forEach(doc => state.allExpenses.push({ id: doc.id, ...doc.data() }));
                state.allExpenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

                applyFilters();
                updateStats();
                updateCharts();
            } catch (e) {
                showToast('Failed to load expenses: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        }

        window.saveExpense = async function() {
            const id = document.getElementById('expenseId').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const splitEnabled = document.getElementById('expenseSplitEnabled').checked;
            const splitWithName = document.getElementById('splitWithName').value.trim();
            const splitOwed = parseFloat(document.getElementById('splitOwedAmount').value);

            if (splitEnabled) {
                if (!splitWithName || isNaN(splitOwed) || splitOwed <= 0) {
                    showToast('Please enter who you split with and a valid amount owed to you', 'error');
                    return;
                }
                if (splitOwed >= amount) {
                    showToast('Amount owed to you must be less than the total expense amount', 'error');
                    return;
                }
            }

            const data = {
                userId: state.currentUser.uid,
                date: document.getElementById('expenseDate').value,
                merchant: document.getElementById('expenseMerchant').value.trim(),
                amount: amount,
                category: document.getElementById('expenseCategory').value,
                description: document.getElementById('expenseDescription').value.trim(),
                source: 'manual',
                paid: document.getElementById('expensePaid').checked,
                split: splitEnabled ? {
                    enabled: true,
                    withName: splitWithName,
                    owedToYou: splitOwed,
                    settled: document.getElementById('splitSettled').checked
                } : null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (!data.date || !data.merchant || isNaN(data.amount) || data.amount < 0 || !data.category) {
                showToast('Please fill all required fields correctly', 'error');
                return;
            }

            showLoading(id ? 'Updating...' : 'Saving...');
            try {
                if (id) {
                    await updateDoc(doc(state.db, 'expenses', id), data);
                    showToast('Expense updated!', 'success');
                } else {
                    await addDoc(collection(state.db, 'expenses'), data);
                    showToast('Expense added!', 'success');
                }
                closeModal();
                loadExpenses();
            } catch (e) {
                showToast('Failed to save: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        window.deleteExpense = async function(id) {
            if (!confirm('Delete this expense?')) return;
            showLoading('Deleting...');
            try {
                await deleteDoc(doc(state.db, 'expenses', id));
                showToast('Deleted', 'success');
                loadExpenses();
            } catch (e) {
                showToast('Failed to delete: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        window.deleteSelectedExpenses = async function() {

    if (state.selectedExpenses.size === 0) return;

    if (!confirm(`Delete ${state.selectedExpenses.size} selected expenses?`)) {
        return;
    }

    try {
        const batch = writeBatch(state.db);

        state.selectedExpenses.forEach(id => {
            batch.delete(doc(state.db, 'expenses', id));
        });

        await batch.commit();

        showToast(`${state.selectedExpenses.size} expenses deleted`, 'success');

        state.selectedExpenses.clear();

        loadExpenses();

    } catch (e) {
        showToast('Delete failed: ' + e.message, 'error');
    }
};

        // ===================== UI =====================
        window.applyFilters = function() {
            const search = document.getElementById('searchFilter').value.toLowerCase();
            const category = document.getElementById('categoryFilter').value;
            const fromDate = document.getElementById('fromDate').value;
            const toDate = document.getElementById('toDate').value;
            const source = document.getElementById('sourceFilter').value;

            const filtered = state.allExpenses.filter(e => {
                if (search && !e.merchant?.toLowerCase().includes(search) && !e.description?.toLowerCase().includes(search)) return false;
                if (category && e.category !== category) return false;
                if (fromDate && e.date < fromDate) return false;
                if (toDate && e.date > toDate) return false;
                if (source && e.source !== source) return false;
                return true;
            });

            renderTable(filtered);
        };

        function renderTable(expenses) {
            const container = document.getElementById('expensesTable');
            document.getElementById('recordCount').textContent = expenses.length + ' records';

            if (expenses.length === 0) {
                container.innerHTML = '<div class="empty-state">' +
                    '<div class="empty-state-icon" aria-hidden="true">&#x1F4ED;</div>' +
                    '<h3>No expenses found</h3>' +
                    '<p>Try adjusting your filters or add new expenses</p></div>';
                return;
            }

            let html = '<table role="table" aria-label="Expenses"><thead><tr role="row">' +
    '<th scope="col"><input type="checkbox" id="selectAllExpenses" onchange="toggleSelectAllExpenses(this)"></th>' +
    '<th scope="col">Date</th><th scope="col">Merchant</th><th scope="col">Category</th>' +
    '<th scope="col">Amount</th><th scope="col">Source</th><th scope="col">Paid</th><th scope="col">Actions</th>' +
    '</tr></thead><tbody>';

            expenses.forEach(expense => {
                const catClass = 'cat-' + (expense.category || 'uncategorized').toLowerCase().replace(/\s+/g, '-');
                let sourceBadge;
                if (expense.source === 'gmail') sourceBadge = '<span class="sync-badge">&#x2713; Gmail</span>';
                else if (expense.source === 'loan_payment') sourceBadge = '<span style="font-size: 0.75rem; color: #d98f89;">&#x1F3E6; Loan Payment</span>';
                else sourceBadge = '<span style="font-size: 0.75rem; color: var(--gray);">Manual</span>';
                const descHtml = expense.description ? '<div style="font-size: 0.8rem; color: var(--gray);">' + escapeHtml(expense.description) + '</div>' : '';

                let splitHtml = '';
                if (expense.split && expense.split.enabled) {
                    const settled = !!expense.split.settled;
                    const withName = escapeHtml(expense.split.withName || 'someone');
                    const owed = (expense.split.owedToYou || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    splitHtml = '<div><button type="button" class="split-badge ' + (settled ? 'settled' : 'unsettled') + '" ' +
                        'onclick="toggleSplitSettled(\'' + expense.id + '\')" title="Click to mark as ' + (settled ? 'unsettled' : 'settled') + '">' +
                        (settled ? '&#x2713; Settled — ' : '&#x23F3; Owed by ') + withName + ' · LKR ' + owed +
                        '</button></div>';
                }

                const isPaid = expense.paid !== false;
                const paidBadge = '<button type="button" class="paid-badge ' + (isPaid ? 'is-paid' : 'is-unpaid') + '" ' +
                    'onclick="togglePaid(\'' + expense.id + '\')" title="Click to mark as ' + (isPaid ? 'unpaid' : 'paid') + '">' +
                    (isPaid ? '&#x2713; Paid' : '&#x23F3; Unpaid') +
                    '</button>';

                const safeMerchantLabel = escapeHtml(expense.merchant || 'expense');
                html += `<tr role="row" class="${isPaid ? '' : 'expense-row-unpaid'}">
    <td>
        <input 
            type="checkbox" 
            class="expense-checkbox"
            data-id="${expense.id}"
            onchange="toggleExpenseSelection('${expense.id}')"
        >
    </td>
    <td>${formatDate(expense.date)}</td>
                    <td><div style="font-weight: 500;">${escapeHtml(expense.merchant || '')}</div>${descHtml}${splitHtml}</td>
                    <td><span class="category-badge ${catClass}">${expense.category || 'Uncategorized'}</span></td>
                    <td class="amount">LKR ${(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${sourceBadge}</td>
                    <td>${paidBadge}</td>
                    <td><div class="action-btns">
                    <button class="btn" style="padding: 5px 10px; font-size: 0.75rem; background: var(--light-gray);" onclick="editExpense('${expense.id}')" aria-label="Edit ${safeMerchantLabel}">Edit</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.75rem;" onclick="deleteExpense('${expense.id}')" aria-label="Delete ${safeMerchantLabel}">Delete</button>
                    </div></td></tr>`;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        }

        window.toggleSplitSettled = async function(id) {
            const expense = state.allExpenses.find(e => e.id === id);
            if (!expense || !expense.split) return;
            showLoading('Updating...');
            try {
                await updateDoc(doc(state.db, 'expenses', id), {
                    split: { ...expense.split, settled: !expense.split.settled },
                    updatedAt: serverTimestamp()
                });
                showToast(expense.split.settled ? 'Marked as unsettled' : 'Marked as settled!', 'success');
                loadExpenses();
            } catch (e) {
                showToast('Failed to update: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        window.togglePaid = async function(id) {
            const expense = state.allExpenses.find(e => e.id === id);
            if (!expense) return;
            const currentlyPaid = expense.paid !== false;
            showLoading('Updating...');
            try {
                await updateDoc(doc(state.db, 'expenses', id), {
                    paid: !currentlyPaid,
                    updatedAt: serverTimestamp()
                });
                showToast(currentlyPaid ? 'Marked as unpaid' : 'Marked as paid!', 'success');
                loadExpenses();
            } catch (e) {
                showToast('Failed to update: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        window.toggleExpenseSelection = function(id) {
    if (state.selectedExpenses.has(id)) {
        state.selectedExpenses.delete(id);
    } else {
        state.selectedExpenses.add(id);
    }

    updateBulkDeleteButton();
}


window.toggleSelectAllExpenses = function(checkbox) {
    const checkboxes = document.querySelectorAll('.expense-checkbox');

    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;

        if (checkbox.checked) {
            state.selectedExpenses.add(cb.dataset.id);
        } else {
            state.selectedExpenses.delete(cb.dataset.id);
        }
    });

    updateBulkDeleteButton();
}


function updateBulkDeleteButton() {
    const btn = document.getElementById('bulkDeleteBtn');

    if (!btn) return;

    if (state.selectedExpenses.size > 0) {
        btn.style.display = 'inline-block';
        btn.textContent = `🗑 Delete Selected (${state.selectedExpenses.size})`;
    } else {
        btn.style.display = 'none';
    }
}


// ===================== FILTERED-EXPENSES HELPER =====================
// Shared by applyFilters() above and exportData() (export.js) so both
// read the exact same filter criteria from the DOM.
export function getFilteredExpenses() {
    const search = document.getElementById('searchFilter').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const source = document.getElementById('sourceFilter').value;

    return state.allExpenses.filter(e => {
        if (search && !e.merchant?.toLowerCase().includes(search) && !e.description?.toLowerCase().includes(search)) return false;
        if (category && e.category !== category) return false;
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        if (source && e.source !== source) return false;
        return true;
    });
}
