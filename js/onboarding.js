// ===================== ONBOARDING WIZARD =====================
// A one-time, first-login setup flow: welcome -> categories -> vendor
// watchlist -> shared workspace explainer -> optional Gmail connect ->
// finish. Triggered from auth.js when the user's profile has
// onboardingComplete !== true.
import { state } from './state.js';
import { markOnboardingComplete } from './users.js';
import { renderCategoryManagerList } from './categories.js';
import { renderVendorList } from './vendors.js';
import { escapeHtml } from './utils.js';

let currentStep = 0;

const steps = [
    { key: 'welcome', title: 'Welcome to your expense dashboard' },
    { key: 'categories', title: 'Set up your categories' },
    { key: 'vendors', title: 'Add vendors you want to track' },
    { key: 'workspace', title: 'About shared workspaces' },
    { key: 'gmail', title: 'Connect Gmail (optional)' },
    { key: 'finish', title: "You're all set" }
];

export function openOnboarding() {
    currentStep = 0;
    document.getElementById('onboardingModal')?.classList.add('active');
    renderStep();
}

window.skipOnboarding = async function() {
    document.getElementById('onboardingModal')?.classList.remove('active');
    try { await markOnboardingComplete(); } catch (e) { console.warn('Could not mark onboarding complete:', e); }
};

window.onboardingNext = function() {
    if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
    }
};

window.onboardingBack = function() {
    if (currentStep > 0) {
        currentStep--;
        renderStep();
    }
};

window.onboardingFinish = async function() {
    document.getElementById('onboardingModal')?.classList.remove('active');
    try { await markOnboardingComplete(); } catch (e) { console.warn('Could not mark onboarding complete:', e); }
};

function renderStep() {
    const step = steps[currentStep];
    const titleEl = document.getElementById('onboardingTitle');
    const progressEl = document.getElementById('onboardingProgress');
    const body = document.getElementById('onboardingBody');
    const footer = document.getElementById('onboardingFooter');
    if (!titleEl || !body || !footer) return;

    titleEl.textContent = step.title;
    progressEl.innerHTML = steps.map((s, i) =>
        `<span class="onboarding-dot${i === currentStep ? ' active' : ''}${i < currentStep ? ' done' : ''}"></span>`
    ).join('');

    const backBtn = currentStep > 0
        ? `<button type="button" class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="onboardingBack()">Back</button>`
        : '';

    if (step.key === 'welcome') {
        body.innerHTML = `
            <p style="margin-bottom: 12px;">This is your personal expense dashboard — track spending, sync receipts from Gmail, and optionally share a workspace with roommates, partners, or family so everyone sees the same expenses.</p>
            <p style="color: var(--gray); font-size: 0.85rem;">This quick setup takes about a minute. You can change any of this later from Settings.</p>
        `;
        footer.innerHTML = `${backBtn}<button type="button" class="btn btn-primary" onclick="onboardingNext()">Get Started</button>`;
        return;
    }

    if (step.key === 'categories') {
        body.innerHTML = `
            <p style="margin-bottom: 12px; font-size: 0.85rem; color: var(--gray);">These are the categories you'll sort expenses into. Add your own, or remove ones you won't use.</p>
            <div id="categoryManagerListOnboarding" style="margin-bottom: 14px;"></div>
            <div class="form-group" style="display:flex; gap:8px;">
                <input type="text" id="onboardingCategoryInput" placeholder="e.g. Entertainment" style="flex:1;">
                <button type="button" class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="addCategoryFromInput('onboardingCategoryInput','categoryManagerListOnboarding')">Add</button>
            </div>
        `;
        footer.innerHTML = `${backBtn}<button type="button" class="btn btn-primary" onclick="onboardingNext()">Next</button>`;
        renderCategoryManagerList('categoryManagerListOnboarding');
        return;
    }

    if (step.key === 'vendors') {
        const categoryOptions = state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        body.innerHTML = `
            <p style="margin-bottom: 12px; font-size: 0.85rem; color: var(--gray);">Add vendors and subscriptions you use regularly — Uber, Netflix, your bank, etc. We'll suggest the right category automatically when you type one of these names into a manual expense. Real Gmail auto-sync for a vendor gets added once a parser is built for it.</p>
            <div id="vendorManagerListOnboarding" style="margin-bottom: 14px;"></div>
            <div class="form-group" style="display:flex; gap:8px;">
                <input type="text" id="onboardingVendorName" placeholder="e.g. Netflix" style="flex:1.2;">
                <select id="onboardingVendorCategory" style="flex:1;"><option value="">Category</option>${categoryOptions}</select>
                <button type="button" class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="addVendorFromInputs('onboardingVendorName','onboardingVendorCategory','vendorManagerListOnboarding')">Add</button>
            </div>
        `;
        footer.innerHTML = `${backBtn}<button type="button" class="btn btn-primary" onclick="onboardingNext()">Next</button>`;
        renderVendorList('vendorManagerListOnboarding');
        return;
    }

    if (step.key === 'workspace') {
        body.innerHTML = `
            <p style="margin-bottom: 12px;">You already have a personal workspace set up. If you want to split costs with a roommate, partner, or family member, you can invite them to a shared workspace at any time — everyone in it sees the same expenses.</p>
            <p style="color: var(--gray); font-size: 0.85rem;">You can set this up now, or skip it and do it later from the workspace switcher in the top bar.</p>
        `;
        footer.innerHTML = `${backBtn}
            <button type="button" class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="onboardingNext()">Skip for now</button>
            <button type="button" class="btn btn-primary" onclick="document.getElementById('onboardingModal').classList.remove('active'); openWorkspaceModal();">Set Up Sharing</button>`;
        return;
    }

    if (step.key === 'gmail') {
        body.innerHTML = `
            <p style="margin-bottom: 12px;">Connect Gmail and we'll pull in receipts automatically (currently supports PickMe — more vendors are added as parsers get built for them). Completely optional, and you can connect anytime from Settings.</p>
        `;
        footer.innerHTML = `${backBtn}
            <button type="button" class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="onboardingNext()">Skip for now</button>
            <button type="button" class="btn btn-primary" onclick="syncGmail(); onboardingNext();">Connect Gmail</button>`;
        return;
    }

    if (step.key === 'finish') {
        body.innerHTML = `
            <p style="margin-bottom: 12px;">You're all set. Add your first expense whenever you're ready, or just explore the dashboard.</p>
        `;
        footer.innerHTML = `${backBtn}
            <button type="button" class="btn" style="background: var(--light-gray); color: var(--dark);" onclick="onboardingFinish()">Go to Dashboard</button>
            <button type="button" class="btn btn-primary" onclick="onboardingFinish(); openAddModal();">Add My First Expense</button>`;
        return;
    }
}
