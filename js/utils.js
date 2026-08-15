// ===================== UTILITIES =====================
export function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

export function escapeCsv(text) {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
}

// Normalizes an expense's split into a list of participants, so both the
// legacy single-person format (withName/owedToYou) and the current
// multi-person `participants` array can be read identically everywhere.
export function getSplitParticipants(split) {
    if (!split) return [];
    if (Array.isArray(split.participants)) return split.participants;
    if (split.withName) {
        return [{ type: 'external', name: split.withName, amount: split.owedToYou || 0 }];
    }
    return [];
}

export function getSplitTotal(split) {
    return getSplitParticipants(split).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function showLoading(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('active');
}

export function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

export function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
