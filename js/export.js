// ===================== EXPORT =====================
import { getFilteredExpenses } from './expenses.js';
import { showToast, escapeCsv, getSplitParticipants, getSplitTotal } from './utils.js';

window.exportData = function() {
    const filtered = getFilteredExpenses();
    if (filtered.length === 0) { showToast('No data to export', 'error'); return; }

    let csv = 'Date,Merchant,Category,Amount,Description,Source,Split With,Owed To You,Settled\n';
    filtered.forEach(e => {
        const split = e.split && e.split.enabled ? e.split : null;
        const participants = split ? getSplitParticipants(split) : [];
        const names = participants.map(p => p.name).join('; ');
        const owedTotal = split ? getSplitTotal(split) : 0;
        csv += e.date + ',' + escapeCsv(e.merchant || '') + ',' + (e.category || '') + ',' + (e.amount || 0) + ',' + escapeCsv(e.description || '') + ',' + (e.source || '') + ',' +
            escapeCsv(names) + ',' + (split ? owedTotal : '') + ',' + (split ? (split.settled ? 'Yes' : 'No') : '') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
};
