// ===================== GMAIL SYNC =====================
import { collection, doc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { GMAIL_CLIENT_ID, GMAIL_SCOPES, EMAIL_SOURCES } from './config.js';
import { state } from './state.js';
import { showLoading, hideLoading, showToast } from './utils.js';
import { loadExpenses } from './expenses.js';
import { parseEmail } from './email-parsers.js';

        // ===================== GMAIL SYNC =====================
        window.syncGmail = async function() {
            if (GMAIL_CLIENT_ID === 'YOUR_GMAIL_CLIENT_ID') {
                showToast('Please configure your Gmail Client ID', 'error');
                return;
            }

            if (!state.gmailAccessToken) {
                authorizeGmail();
                return;
            }

            showLoading('Syncing with Gmail...');
try {
const fromDateInput = document.getElementById('syncFromDate').value;

let afterDate;

if (fromDateInput) {
    const fromDate = new Date(fromDateInput);
    afterDate = Math.floor(fromDate.getTime() / 1000);
} else {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    afterDate = Math.floor(thirtyDaysAgo.getTime() / 1000);
}

                let newExpenses = [];
                const existingIds = new Set(state.allExpenses.map(e => e.gmailMessageId).filter(Boolean));

for (const [email, config] of Object.entries(EMAIL_SOURCES)) {
    const queryStr = `from:${email} after:${afterDate}`;

    const messages = await fetchGmailMessages(queryStr);

                    for (const message of messages) {
                        if (existingIds.has(message.id)) continue;

                        const fullMessage = await fetchGmailMessageDetail(message.id);
                        const parsed = parseEmail(fullMessage, config.parser);

                        if (parsed && parsed.amount > 0) {
                            newExpenses.push({
                                userId: state.currentUser.uid,
                                ...parsed,
                                gmailMessageId: message.id,
                                source: 'gmail',
                                createdAt: serverTimestamp()
                            });
                        }
                    }
                }

                if (newExpenses.length > 0) {
                    const batch = writeBatch(state.db);
                    newExpenses.forEach(expense => batch.set(doc(collection(state.db, 'expenses')), expense));
                    await batch.commit();
                    showToast(`Synced ${newExpenses.length} new expense${newExpenses.length > 1 ? 's' : ''}!`, 'success');
                } else {
                    showToast('No new expenses found', 'info');
                }

                loadExpenses();
            } catch (e) {
                if (e.status === 401) {
                    state.gmailAccessToken = null;
                    showToast('Gmail session expired. Please re-authorize.', 'error');
                } else {
                    showToast('Sync failed: ' + (e.message || 'Unknown error'), 'error');
                }
            } finally {
                hideLoading();
            }
        };

        function authorizeGmail() {
            if (typeof google === 'undefined' || !google.accounts) {
                showToast('Google API not loaded yet. Please wait and try again.', 'error');
                return;
            }

            const client = google.accounts.oauth2.initTokenClient({
                client_id: GMAIL_CLIENT_ID,
                scope: GMAIL_SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse?.access_token) {
                        state.gmailAccessToken = tokenResponse.access_token;
                        showToast('Gmail authorized! Click sync again.', 'success');
                    }
                },
                error_callback: (error) => {
                    showToast('Gmail authorization failed: ' + (error?.message || 'Unknown error'), 'error');
                }
            });
            client.requestAccessToken();
        }

        async function fetchGmailMessages(queryStr) {
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryStr)}`,
                { headers: { 'Authorization': `Bearer ${state.gmailAccessToken}` } }
            );
            if (!response.ok) throw { status: response.status, message: 'Failed to fetch messages' };
            const data = await response.json();
            return data.messages || [];
        }

        async function fetchGmailMessageDetail(messageId) {
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
                { headers: { 'Authorization': `Bearer ${state.gmailAccessToken}` } }
            );
            if (!response.ok) throw { status: response.status, message: 'Failed to fetch message' };
            return await response.json();
        }

