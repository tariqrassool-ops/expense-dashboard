// ===================== MODAL =====================
import { state } from './state.js';
import { getSplitParticipants } from './utils.js';

// Holds the split participants for whichever expense is currently open in
// the modal. Rebuilt on open/edit, mutated as the person adds/edits rows,
// and read by expenses.js's saveExpense() when the form is submitted.
let splitDraft = [];

export function getSplitDraft() {
    return splitDraft;
}

window.openAddModal = function() {
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseMerchant').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseCategory').value = '';
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseSplitEnabled').checked = false;
    document.getElementById('splitSettled').checked = false;
    document.getElementById('expensePaid').checked = true;
    splitDraft = [];
    renderSplitParticipants();
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
    document.getElementById('splitSettled').checked = !!(split && split.settled);
    // getSplitParticipants reads both the old single-person format and the
    // current multi-person one, so old expenses populate correctly here too.
    splitDraft = getSplitParticipants(split).map(p => ({ ...p }));
    renderSplitParticipants();

    document.getElementById('expensePaid').checked = expense.paid !== false;
    window.toggleSplitFields();
    document.getElementById('modalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseModal').classList.add('active');
    document.getElementById('expenseDate').focus();
};

window.toggleSplitFields = function() {
    const enabled = document.getElementById('expenseSplitEnabled').checked;
    document.getElementById('splitFieldsWrap').classList.toggle('hidden', !enabled);
    if (enabled && splitDraft.length === 0) {
        splitDraft.push({ type: 'external', name: '', amount: 0 });
        renderSplitParticipants();
    }
};

window.closeModal = function() {
    document.getElementById('expenseModal').classList.remove('active');
};

// ===================== SPLIT PARTICIPANTS =====================

function escAttr(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderSplitParticipants() {
    const container = document.getElementById('splitParticipantsList');
    if (!container) return;

    const members = state.currentWorkspaceMembers || [];

    container.innerHTML = splitDraft.map((p, i) => {
        const memberOptions = members.map(m => {
            const label = m.displayName || m.email || 'Member';
            const selected = p.type === 'member' && p.uid === m.userId;
            return `<option value="member:${m.userId}"${selected ? ' selected' : ''}>${escAttr(label)}</option>`;
        }).join('');

        return `
        <div class="split-participant-row">
            <select onchange="updateSplitParticipantType(${i}, this.value)" aria-label="Split with">
                <option value="external"${p.type === 'external' ? ' selected' : ''}>Someone else&hellip;</option>
                ${memberOptions}
            </select>
            ${p.type === 'external'
                ? `<input type="text" placeholder="Name" value="${escAttr(p.name)}" oninput="updateSplitParticipantName(${i}, this.value)" aria-label="Name">`
                : ''}
            <input type="number" step="0.01" min="0" placeholder="0.00" value="${p.amount || ''}" oninput="updateSplitParticipantAmount(${i}, this.value)" aria-label="Amount owed">
            <button type="button" class="split-remove-btn" onclick="removeSplitParticipant(${i})" aria-label="Remove person">&times;</button>
        </div>`;
    }).join('');

    updateSplitTotalLine();
}

function updateSplitTotalLine() {
    const el = document.getElementById('splitTotalLine');
    if (!el) return;

    const total = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const owed = splitDraft.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const yourShare = total - owed;

    el.textContent = splitDraft.length > 0
        ? `Others owe: LKR ${owed.toFixed(2)} \u00b7 Your share: LKR ${yourShare.toFixed(2)}`
        : '';
    el.style.color = yourShare < 0 ? '#c0392b' : 'var(--gray)';
}

window.addSplitParticipant = function() {
    splitDraft.push({ type: 'external', name: '', amount: 0 });
    renderSplitParticipants();
};

window.removeSplitParticipant = function(index) {
    splitDraft.splice(index, 1);
    renderSplitParticipants();
};

window.updateSplitParticipantType = function(index, value) {
    const existing = splitDraft[index];
    if (!existing) return;

    if (value === 'external') {
        splitDraft[index] = { type: 'external', name: '', amount: existing.amount || 0 };
    } else if (value.startsWith('member:')) {
        const uid = value.slice('member:'.length);
        const member = (state.currentWorkspaceMembers || []).find(m => m.userId === uid);
        splitDraft[index] = {
            type: 'member',
            uid,
            name: member ? (member.displayName || member.email || 'Member') : 'Member',
            amount: existing.amount || 0
        };
    }
    renderSplitParticipants();
};

window.updateSplitParticipantName = function(index, value) {
    if (splitDraft[index]) splitDraft[index].name = value;
    updateSplitTotalLine();
};

window.updateSplitParticipantAmount = function(index, value) {
    if (splitDraft[index]) splitDraft[index].amount = parseFloat(value) || 0;
    updateSplitTotalLine();
};

// Splits the total expense evenly across everyone listed, plus you (the
// payer) as an implicit extra share — so 3 people added = a 4-way split.
window.splitEvenly = function() {
    if (splitDraft.length === 0) {
        splitDraft.push({ type: 'external', name: '', amount: 0 });
    }

    const total = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const totalPeople = splitDraft.length + 1;
    const share = Math.round((total / totalPeople) * 100) / 100;

    splitDraft.forEach(p => { p.amount = share; });
    renderSplitParticipants();
};

// Recalculate the "your share" line live as the total amount changes.
document.getElementById('expenseAmount')?.addEventListener('input', updateSplitTotalLine);

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
