// ===================== LOANS =====================
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { state } from './state.js';
import { showLoading, hideLoading, showToast, escapeHtml, formatDate } from './utils.js';
import { darkenColor, hexToRgba, loanHeatColor } from './charts.js';
import { loadExpenses } from './expenses.js';

        // ===================== LOANS =====================
export async function loadLoans() {
            try {
                const q = query(
                    collection(state.db, 'loans'),
                    where('userId', '==', state.currentUser.uid)
                );
                const snapshot = await getDocs(q);
                state.allLoans = [];
                snapshot.forEach(d => state.allLoans.push({ id: d.id, ...d.data() }));
                state.allLoans.sort((a, b) => (a.status === 'paid_off') - (b.status === 'paid_off') || (a.name || '').localeCompare(b.name || ''));
                renderLoans();
            } catch (e) {
                showToast('Failed to load loans: ' + e.message, 'error');
            }
        }

        function renderLoans() {
            const container = document.getElementById('loansGrid');
            if (!state.allLoans.length) {
                container.innerHTML = '<div class="empty-state">' +
                    '<div class="empty-state-icon" aria-hidden="true">&#x1F3E6;</div>' +
                    '<h3>No loans tracked yet</h3>' +
                    '<p>Add a bank loan or lease to start tracking what you owe</p></div>';
                return;
            }

            let html = '';
            state.allLoans.forEach(loan => {
                const principal = loan.principal || 0;
                const remaining = Math.max(loan.remainingBalance || 0, 0);
                const paidOff = remaining <= 0;
                const paidFrac = principal > 0 ? Math.min(((principal - remaining) / principal) * 100, 100) : 0;
                const owedFrac = principal > 0 ? Math.min((remaining / principal) * 100, 100) : 0;
                const heatColor = loanHeatColor(owedFrac);
                const heatColorDark = darkenColor(heatColor, 0.4);
                const safeName = escapeHtml(loan.name || 'Loan');

                html += '<div class="loan-card' + (paidOff ? ' paid-off' : '') + '">' +
                    '<div class="loan-card-head">' +
                        '<div class="loan-card-name">' + safeName + '</div>' +
                        '<span class="loan-type-badge">' + escapeHtml(loan.type || 'Other') + '</span>' +
                    '</div>' +
                    (paidOff ? '<span class="loan-status-badge">&#x2713; Paid Off</span>' : '') +
                    (loan.cardNumber ? renderLoanMiniCard(loan, safeName) : '') +
                    '<div class="loan-balance-row">' +
                        '<div>' +
                            '<div class="loan-balance-label">Remaining Balance</div>' +
                            '<div class="loan-balance-value">LKR ' + remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' +
                        '</div>' +
                        '<div style="text-align:right;">' +
                            '<div class="loan-balance-label">Paid Off</div>' +
                            '<div class="loan-balance-value" style="font-size:1.05rem;">' + paidFrac.toFixed(0) + '%</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="loan-progress-track"><div class="loan-progress-fill" style="width:' + paidFrac.toFixed(1) + '%; background: linear-gradient(90deg, ' + heatColorDark + ', ' + heatColor + '); box-shadow: 0 0 6px ' + hexToRgba(heatColor, 0.3) + ';"></div></div>' +
                    '<div class="loan-meta-row"><span>Original Amount</span><span>LKR ' + principal.toLocaleString('en-US') + '</span></div>' +
                    (loan.installmentAmount ? '<div class="loan-meta-row"><span>Installment</span><span>LKR ' + (loan.installmentAmount || 0).toLocaleString('en-US') + '/mo</span></div>' : '') +
                    (loan.interestRate ? '<div class="loan-meta-row"><span>Interest Rate</span><span>' + loan.interestRate + '% p.a.</span></div>' : '') +
                    (loan.dueDate && !paidOff ? '<div class="loan-meta-row"><span>Next Due</span><span>' + formatDate(loan.dueDate) + '</span></div>' : '') +
                    '<div class="loan-card-actions">' +
                        (paidOff ? '' : '<button class="btn btn-primary" onclick="openLoanPaymentModal(\'' + loan.id + '\')">Log Payment</button>') +
                        '<button class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="editLoan(\'' + loan.id + '\')">Edit</button>' +
                        '<button class="btn btn-danger" onclick="deleteLoan(\'' + loan.id + '\')">Delete</button>' +
                    '</div>' +
                '</div>';
            });
            container.innerHTML = html;
        }

        window.openAddLoanModal = function() {
            document.getElementById('loanId').value = '';
            document.getElementById('loanName').value = '';
            document.getElementById('loanType').value = 'Bank Loan';
            document.getElementById('loanPrincipal').value = '';
            document.getElementById('loanRemaining').value = '';
            document.getElementById('loanInstallment').value = '';
            document.getElementById('loanInterestRate').value = '';
            document.getElementById('loanDueDate').value = '';
            document.getElementById('loanCardNetwork').value = '';
            document.getElementById('loanCardNumber').value = '';
            document.getElementById('loanCardExpiry').value = '';
            document.getElementById('loanModalTitle').textContent = 'Add Loan';
            document.getElementById('loanModal').classList.add('active');
            document.getElementById('loanName').focus();
        };

        window.editLoan = function(id) {
            const loan = state.allLoans.find(l => l.id === id);
            if (!loan) return;
            document.getElementById('loanId').value = loan.id;
            document.getElementById('loanName').value = loan.name || '';
            document.getElementById('loanType').value = loan.type || 'Bank Loan';
            document.getElementById('loanPrincipal').value = loan.principal || '';
            document.getElementById('loanRemaining').value = loan.remainingBalance != null ? loan.remainingBalance : '';
            document.getElementById('loanInstallment').value = loan.installmentAmount || '';
            document.getElementById('loanInterestRate').value = loan.interestRate || '';
            document.getElementById('loanDueDate').value = loan.dueDate || '';
            document.getElementById('loanCardNetwork').value = loan.cardNetwork || '';
            document.getElementById('loanCardNumber').value = loan.cardNumber || '';
            document.getElementById('loanCardExpiry').value = loan.cardExpiry || '';
            document.getElementById('loanModalTitle').textContent = 'Edit Loan';
            document.getElementById('loanModal').classList.add('active');
            document.getElementById('loanName').focus();
        };

        // When adding a new loan, default the remaining balance to the principal (only if remaining is still empty)
        window.syncLoanRemainingDefault = function() {
            const remainingInput = document.getElementById('loanRemaining');
            if (!document.getElementById('loanId').value && !remainingInput.value) {
                remainingInput.value = document.getElementById('loanPrincipal').value;
            }
        };

        window.closeLoanModal = function() {
            document.getElementById('loanModal').classList.remove('active');
        };

        window.saveLoan = async function() {
            const id = document.getElementById('loanId').value;
            const principal = parseFloat(document.getElementById('loanPrincipal').value);
            const remaining = parseFloat(document.getElementById('loanRemaining').value);
            const installmentRaw = document.getElementById('loanInstallment').value;
            const interestRaw = document.getElementById('loanInterestRate').value;

            const data = {
                userId: state.currentUser.uid,
                name: document.getElementById('loanName').value.trim(),
                type: document.getElementById('loanType').value,
                principal: principal,
                remainingBalance: remaining,
                installmentAmount: installmentRaw ? parseFloat(installmentRaw) : null,
                interestRate: interestRaw ? parseFloat(interestRaw) : null,
                dueDate: document.getElementById('loanDueDate').value || null,
                cardNetwork: document.getElementById('loanCardNetwork').value || null,
                cardNumber: document.getElementById('loanCardNumber').value.trim() || null,
                cardExpiry: document.getElementById('loanCardExpiry').value.trim() || null,
                status: remaining <= 0 ? 'paid_off' : 'active',
                updatedAt: serverTimestamp()
            };

            if (!data.name || isNaN(data.principal) || data.principal < 0 || isNaN(data.remainingBalance) || data.remainingBalance < 0) {
                showToast('Please fill all required fields correctly', 'error');
                return;
            }

            showLoading(id ? 'Updating...' : 'Saving...');
            try {
                if (id) {
                    await updateDoc(doc(state.db, 'loans', id), data);
                    showToast('Loan updated!', 'success');
                } else {
                    data.createdAt = serverTimestamp();
                    await addDoc(collection(state.db, 'loans'), data);
                    showToast('Loan added!', 'success');
                }
                closeLoanModal();
                loadLoans();
            } catch (e) {
                showToast('Failed to save loan: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        window.deleteLoan = async function(id) {
            if (!confirm('Delete this loan? Any expense entries already logged for its payments will stay in your expense history.')) return;
            showLoading('Deleting...');
            try {
                await deleteDoc(doc(state.db, 'loans', id));
                showToast('Loan deleted', 'success');
                loadLoans();
            } catch (e) {
                showToast('Failed to delete: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        window.openLoanPaymentModal = function(id) {
            const loan = state.allLoans.find(l => l.id === id);
            if (!loan) return;
            document.getElementById('loanPaymentLoanId').value = loan.id;
            document.getElementById('loanPaymentDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('loanPaymentAmount').value = loan.installmentAmount || '';
            document.getElementById('loanPaymentNote').value = '';
            document.getElementById('loanPaymentModalTitle').textContent = 'Log Payment — ' + (loan.name || 'Loan');
            document.getElementById('loanPaymentModal').classList.add('active');
            document.getElementById('loanPaymentAmount').focus();
        };

        window.closeLoanPaymentModal = function() {
            document.getElementById('loanPaymentModal').classList.remove('active');
        };

        window.saveLoanPayment = async function() {
            const loanId = document.getElementById('loanPaymentLoanId').value;
            const loan = state.allLoans.find(l => l.id === loanId);
            if (!loan) { showToast('Loan not found', 'error'); return; }

            const amount = parseFloat(document.getElementById('loanPaymentAmount').value);
            const date = document.getElementById('loanPaymentDate').value;
            const note = document.getElementById('loanPaymentNote').value.trim();

            if (!date || isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid date and amount', 'error');
                return;
            }

            showLoading('Logging payment...');
            try {
                // 1. Record the payment as an expense so it flows into your totals/charts
                await addDoc(collection(state.db, 'expenses'), {
                    userId: state.currentUser.uid,
                    date: date,
                    merchant: loan.name || 'Loan Payment',
                    amount: amount,
                    category: 'Loan Payment',
                    description: note || ('Loan payment — ' + (loan.name || '')),
                    source: 'loan_payment',
                    loanId: loan.id,
                    split: null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                // 2. Reduce the loan's remaining balance and push the due date forward a month if still active
                const newRemaining = Math.max((loan.remainingBalance || 0) - amount, 0);
                const isPaidOff = newRemaining <= 0;
                const update = {
                    remainingBalance: newRemaining,
                    status: isPaidOff ? 'paid_off' : 'active',
                    updatedAt: serverTimestamp()
                };
                if (loan.dueDate && !isPaidOff) {
                    const d = new Date(loan.dueDate);
                    d.setMonth(d.getMonth() + 1);
                    update.dueDate = d.toISOString().split('T')[0];
                }
                await updateDoc(doc(state.db, 'loans', loan.id), update);

                showToast(isPaidOff ? 'Payment logged — loan paid off! 🎉' : 'Payment logged!', 'success');
                closeLoanPaymentModal();
                loadLoans();
                loadExpenses();
            } catch (e) {
                showToast('Failed to log payment: ' + e.message, 'error');
            } finally {
                hideLoading();
            }
        };

        // Distinct color per network so cards read like the different physical cards they represent.
        const LOAN_CARD_GRADIENTS = {
            visa: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',        // blue -> teal
            mastercard: 'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)',  // violet -> deep purple
            amex: 'linear-gradient(135deg, #fb7185 0%, #9333ea 100%)',       // coral -> purple
            default: [
                'linear-gradient(135deg, #9b58de 0%, #d946ef 55%, #ef4d6f 100%)', // purple -> magenta -> coral
                'linear-gradient(135deg, #2a0e4a 0%, #9b58de 60%, #d946ef 100%)', // deep purple -> violet -> magenta
                'linear-gradient(135deg, #1fa2e0 0%, #2ac9c9 55%, #1fa25e 100%)'  // blue -> teal -> green
            ]
        };
        function loanCardGradient(loan, index) {
            if (loan.cardNetwork && LOAN_CARD_GRADIENTS[loan.cardNetwork]) return LOAN_CARD_GRADIENTS[loan.cardNetwork];
            const fallback = LOAN_CARD_GRADIENTS.default;
            return fallback[index % fallback.length];
        }
        function renderLoanNetworkLogo(network) {
            if (network === 'visa') return '<span class="card-logo-visa">VISA</span>';
            if (network === 'mastercard') return '<span class="card-logo-mastercard"><span></span><span></span></span>';
            if (network === 'amex') return '<span class="card-logo-amex">AMEX</span>';
            return '';
        }
        function renderLoanMiniCard(loan, safeName) {
            const gradient = loanCardGradient(loan, (state.allLoans.indexOf(loan) || 0));
            const safeNumber = escapeHtml(loan.cardNumber || '');
            const safeExpiry = escapeHtml(loan.cardExpiry || '');
            return '<div class="loan-mini-card" style="background:' + gradient + ';">' +
                '<div class="loan-mini-card-top">' +
                    '<div>' +
                        '<div class="loan-mini-card-label">Card</div>' +
                        '<div class="loan-mini-card-issuer">' + safeName + '</div>' +
                    '</div>' +
                    '<div class="loan-mini-card-network-mark">' + renderLoanNetworkLogo(loan.cardNetwork) + '</div>' +
                '</div>' +
                (safeNumber ? '<div class="loan-mini-card-number">' + safeNumber + '</div>' : '') +
                '<div class="loan-mini-card-bottom">' +
                    (safeExpiry ? '<div><div class="loan-mini-card-expiry-label">Expires</div><div class="loan-mini-card-expiry-value">' + safeExpiry + '</div></div>' : '<div></div>') +
                '</div>' +
            '</div>';
        }

        // An expense that's split shows the full amount you logged (e.g. the whole bill),
        // but only your actual share should count toward totals/averages/charts.

// ===================== CARD-NUMBER / EXPIRY AUTO-FORMAT =====================
// Formats the loan card number field into groups of 4 (or 4-6-5 for Amex)
// and the expiry field into MM/YY as the user types.
(function () {
    const numberInput = document.getElementById('loanCardNumber');
    const networkSelect = document.getElementById('loanCardNetwork');
    if (numberInput) {
        const formatNumber = () => {
            const isAmex = networkSelect && networkSelect.value === 'amex';
            const digits = numberInput.value.replace(/\D/g, '').slice(0, isAmex ? 15 : 16);
            numberInput.value = isAmex
                ? digits.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '))
                : digits.replace(/(.{4})/g, '$1 ').trim();
        };
        numberInput.addEventListener('input', formatNumber);
        if (networkSelect) networkSelect.addEventListener('change', formatNumber);
    }
    const expiryInput = document.getElementById('loanCardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', () => {
            let digits = expiryInput.value.replace(/\D/g, '').slice(0, 4);
            if (digits.length > 2) digits = digits.slice(0, 2) + '/' + digits.slice(2);
            expiryInput.value = digits;
        });
    }
})();
