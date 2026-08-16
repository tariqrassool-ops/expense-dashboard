// ===================== EMAIL PARSERS =====================
// Turns raw Gmail message payloads into expense records. Currently
// supports PickMe (rides / food / marketplace) receipt emails.

        // ===================== EMAIL PARSERS =====================
export function parseEmail(message, parserType) {
            const headers = {};
            message.payload.headers.forEach(h => headers[h.name.toLowerCase()] = h.value);
            const subject = headers.subject || '';
            const body = getEmailBody(message.payload);
            const date = new Date(parseInt(message.internalDate));

            if (parserType === 'pickme') return parsePickMeEmail(subject, body, date);
        }

        function getEmailBody(payload) {
            let body = '';
            if (payload.parts) {
                for (const part of payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    } else if (part.mimeType === 'text/html' && part.body?.data) {
                        body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    } else if (part.parts) {
                        body += getEmailBody(part);
                    }
                }
            } else if (payload.body?.data) {
                body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            return body;
        }

function parsePickMeEmail(subject, body, date) {

    const subjectLower = (subject || '').toLowerCase();
    const htmlLower = (body || '').toLowerCase();

    const cleanBody = (body || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();

    // -----------------------------
    // Category Detection
    // -----------------------------
    let category = 'Uncategorized';

// RIDES
if (
    subjectLower.includes('trip id') ||
    cleanBody.includes('trip id') ||
    cleanBody.includes('driver partner') ||
    cleanBody.includes('total trip fare') ||
    cleanBody.includes('estimated fare') ||
    cleanBody.includes('actual fare') ||
    cleanBody.includes('estimated distance') ||
    cleanBody.includes('actual distance') ||
    cleanBody.includes('thanks for using pickme')
) {
    category = 'Travel';
}

// MARKETPLACE
else if (
    cleanBody.includes('merchant price amendment') ||
    cleanBody.includes('packaging charge') ||
    cleanBody.includes('market@pickme.lk') ||
    cleanBody.includes('glomark') ||
    cleanBody.includes('marketplace')
) {
    category = 'Groceries';
}

// FOOD
else if (
    subjectLower.includes('delivery email receipt')
) {
    // If it is a delivery receipt and it wasn't Marketplace,
    // then it is Food.
    category = 'Food';
}

    // -----------------------------
    // Amount Extraction
    // -----------------------------
    
const normalizedBody = (body || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

// Extract every currency amount
const amounts = [...normalizedBody.matchAll(
    /(?:LKR|Rs\.?)\s*([+-]?\d[\d,]*\.\d{2})/gi
)].map(m => parseFloat(m[1].replace(/,/g, '')));

let amount = 0;

// PickMe receipts always repeat the final charged amount as the LAST amount
if (amounts.length > 0) {
    amount = amounts[amounts.length - 1];
}

    // -----------------------------
    // Merchant Extraction
    // -----------------------------
let merchant = 'PickMe';

if (category === 'Travel') {

    merchant = 'PickMe Rides';

}
else {

    const merchantMatch = normalizedBody.match(
        /thanks for ordering,.*?([a-z0-9&(),.' -]+?)\s+(marketplace|food)/is
    );

    if (merchantMatch) {

        merchant = merchantMatch[1].trim();

    }

    if (category === 'Food') {

        merchant = merchant
            ? `PickMe Food - ${merchant}`
            : 'PickMe Food';

    }
    else if (category === 'Groceries') {

        merchant = merchant
            ? `PickMe Marketplace - ${merchant}`
            : 'PickMe Marketplace';

    }

}

    // -----------------------------
    // Return
    // -----------------------------
const result = {
    date: date.toISOString().split('T')[0],
    merchant,
    amount,
    category,
    description: subject
};

return result;
}
