// ===================== CHARTS & STATS =====================
// Color helpers, count-up animation, category donut, budget gauge,
// monthly trend line, spending heatmap, and the stat-card / chart
// data crunching that feeds them (updateStats / updateCharts).
import { state } from './state.js';
import { escapeHtml, formatDate, getSplitParticipants, getSplitTotal } from './utils.js';
import { getBudget } from './settings.js';

        // ===================== SHARED: COLOR HELPERS & BAR ANIMATION =====================
export function lightenColor(hex, amt) {
            hex = (hex || '#3d6b75').replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const num = parseInt(hex, 16);
            let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
            r = Math.round(r + (255 - r) * amt);
            g = Math.round(g + (255 - g) * amt);
            b = Math.round(b + (255 - b) * amt);
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        }
        // Darkens a color toward black by `amt` (0-1) — used for gradients so bars/segments
        // deepen into a richer shade of themselves instead of washing out toward white.
export function darkenColor(hex, amt) {
            hex = (hex || '#3d6b75').replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const num = parseInt(hex, 16);
            let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
            r = Math.round(r * (1 - amt));
            g = Math.round(g * (1 - amt));
            b = Math.round(b * (1 - amt));
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        }
export function hexToRgba(hex, alpha) {
            hex = (hex || '#3d6b75').replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const num = parseInt(hex, 16);
            const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
            return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }
export function animateBarFills(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const fills = container.querySelectorAll('.chart-bar-fill[data-target]');
            fills.forEach(f => f.style.transform = 'scaleX(0)');
            fills.forEach(f => f.getBoundingClientRect());
            requestAnimationFrame(() => {
                fills.forEach(f => {
                    const target = Math.min(parseFloat(f.getAttribute('data-target')) / 100, 1);
                    f.style.transform = 'scaleX(' + target + ')';
                });
            });
        }

        // ===================== CATEGORY BREAKDOWN DONUT (thin ring, distinct category colors, glow, animated draw-in) =====================
        // Curated categorical palette so each slice reads as its own color (teal / blue / slate / green / violet / amber...)
        // instead of one continuous hue sweep — matches the thin, multi-color reference design.
        const DONUT_PALETTE = ['#2dd4bf', '#38bdf8', '#94a3b8', '#4ade80', '#a78bfa', '#fbbf24', '#f472b6', '#fb923c'];
export function renderCategoryDonut(sortedCats, total) {
            const donutEl = document.getElementById('categoryDonut');
            if (!total || total <= 0) {
                donutEl.innerHTML = '<p style="color: var(--gray);">No data yet</p>';
                return;
            }
            const r = 64, cx = 75, cy = 75, strokeW = 8, circumference = 2 * Math.PI * r;
            const gapDeg = sortedCats.length > 1 ? 3 : 0; // small visual gap between segments
            let offsetDeg = 0;
            let defs = '<filter id="donutGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
            let segments = '';
            sortedCats.forEach(([cat, amount], i) => {
                const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
                const gid = 'donutGrad' + i;
                const fracDeg = (amount / total) * 360;
                const segDeg = Math.max(fracDeg - gapDeg, 0.001);
                const dash = (segDeg / 360) * circumference;
                defs += '<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
                    '<stop offset="0%" stop-color="' + darkenColor(color, 0.15) + '"/>' +
                    '<stop offset="100%" stop-color="' + color + '"/>' +
                '</linearGradient>';
                segments += '<circle class="donut-segment" data-cat="' + escapeHtml(cat) + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#' + gid + ')" stroke-width="' + strokeW + '" stroke-linecap="round" ' +
                    'stroke-dasharray="' + dash + ' ' + (circumference - dash) + '" stroke-dashoffset="' + (dash) + '" ' +
                    'transform="rotate(' + (-90 + offsetDeg) + ' ' + cx + ' ' + cy + ')" filter="url(#donutGlow)" ' +
                    'style="transition: stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) ' + (i * 0.08) + 's;"></circle>';
                offsetDeg += fracDeg;
            });

            let legend = '';
            sortedCats.forEach(([cat, amount], i) => {
                const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
                legend += '<div class="donut-legend-item" data-cat="' + escapeHtml(cat) + '">' +
                    '<div class="donut-legend-left"><span class="donut-legend-dot" style="background:' + color + ';"></span>' +
                    '<span class="donut-legend-cat">' + escapeHtml(cat) + '</span></div>' +
                    '<span class="donut-legend-amount" data-amount="' + amount + '">LKR 0</span>' +
                '</div>';
            });

            donutEl.innerHTML =
                '<div class="donut-svg-wrap">' +
                    '<svg viewBox="0 0 150 150" role="img" aria-label="Category breakdown donut chart"><defs>' + defs + '</defs>' + segments + '</svg>' +
                    '<div class="donut-center"><div class="total-value" id="donutTotalValue">LKR 0</div><div class="total-label">Total spent this period</div></div>' +
                '</div>' +
                '<div class="donut-legend">' + legend + '</div>';

            animateCounter(document.getElementById('donutTotalValue'), total, v => 'LKR ' + formatCompactAmount(v, 0));
            donutEl.querySelectorAll('.donut-legend-amount').forEach(el => {
                animateCounter(el, parseFloat(el.getAttribute('data-amount')), v => 'LKR ' + formatCompactAmount(v, 0));
            });

            // Animate the draw-in
            const segEls = donutEl.querySelectorAll('.donut-segment');
            segEls.forEach(s => s.getBoundingClientRect());
            requestAnimationFrame(() => { segEls.forEach(s => { s.style.strokeDashoffset = '0'; }); });

            // Legend <-> segment hover linking
            const wrapEl = donutEl;
            function setActive(cat) {
                if (!cat) {
                    wrapEl.classList.remove('has-hover');
                    segEls.forEach(s => s.classList.remove('active'));
                    donutEl.querySelectorAll('.donut-legend-item').forEach(li => li.classList.remove('active'));
                    return;
                }
                wrapEl.classList.add('has-hover');
                segEls.forEach(s => s.classList.toggle('active', s.getAttribute('data-cat') === cat));
                donutEl.querySelectorAll('.donut-legend-item').forEach(li => li.classList.toggle('active', li.getAttribute('data-cat') === cat));
            }
            donutEl.querySelectorAll('.donut-legend-item, .donut-segment').forEach(elm => {
                elm.addEventListener('mouseenter', () => setActive(elm.getAttribute('data-cat')));
                elm.addEventListener('mouseleave', () => setActive(null));
            });
        }

        // ===================== SHARED: COUNT-UP ANIMATION =====================
        const animCache = new WeakMap();
export function animateCounter(el, endVal, formatFn, duration) {
            if (!el) return;
            duration = duration || 900;
            const startVal = animCache.has(el) ? animCache.get(el) : 0;
            const startTime = performance.now();
            const prevRaf = el._animRaf;
            if (prevRaf) cancelAnimationFrame(prevRaf);
            function tick(now) {
                const t = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                const current = startVal + (endVal - startVal) * eased;
                el.textContent = formatFn(current);
                if (t < 1) {
                    el._animRaf = requestAnimationFrame(tick);
                } else {
                    animCache.set(el, endVal);
                }
            }
            el._animRaf = requestAnimationFrame(tick);
        }

        // ===================== MONTHLY BUDGET (crisp SVG radial gauge) =====================
export function renderBudgetGauge(pct, isOver) {
            const wrap = document.getElementById('gaugeWrap');
            let svg = document.getElementById('gaugeSvgEl');

            const size = 190, r = 78, cx = size / 2, cy = size / 2, strokeW = 13;
            const circumference = 2 * Math.PI * r;
            const sweep = 300, gap = 360 - sweep, rotate = -90 - gap / 2;
            const trackLen = circumference * (sweep / 360);
            const valueFrac = Math.min(pct, 100) / 100;
            const valueLen = trackLen * valueFrac;

            if (!svg) {
                const gaugeGradId = 'gaugeGrad_' + Math.random().toString(36).slice(2, 8);
                const html =
                    '<svg id="gaugeSvgEl" class="gauge-svg" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Monthly budget gauge">' +
                    '<defs>' +
                        '<linearGradient id="' + gaugeGradId + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
                            '<stop offset="0%" stop-color="#cbb4f7"/>' +
                            '<stop offset="100%" stop-color="#9b58de"/>' +
                        '</linearGradient>' +
                        '<linearGradient id="' + gaugeGradId + '_over" x1="0%" y1="0%" x2="100%" y2="100%">' +
                            '<stop offset="0%" stop-color="#e8776a"/>' +
                            '<stop offset="100%" stop-color="#5c1f1f"/>' +
                        '</linearGradient>' +
                        '<filter id="' + gaugeGradId + '_glow" x="-60%" y="-60%" width="220%" height="220%">' +
                            '<feGaussianBlur stdDeviation="4.5" result="blur"/>' +
                            '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
                        '</filter>' +
                    '</defs>' +
                    '<circle class="gauge-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="' + strokeW + '" stroke-linecap="round" ' +
                        'stroke-dasharray="' + trackLen + ' ' + circumference + '" transform="rotate(' + rotate + ' ' + cx + ' ' + cy + ')"></circle>' +
                    '<circle id="gaugeValueArc" class="gauge-value-arc" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#' + gaugeGradId + ')" stroke-width="' + strokeW + '" stroke-linecap="round" ' +
                        'stroke-dasharray="' + valueLen + ' ' + circumference + '" stroke-dashoffset="' + valueLen + '" transform="rotate(' + rotate + ' ' + cx + ' ' + cy + ')" filter="url(#' + gaugeGradId + '_glow)" data-grad="' + gaugeGradId + '"></circle>' +
                    '</svg>';
                wrap.insertAdjacentHTML('afterbegin', html);
                svg = document.getElementById('gaugeSvgEl');
                // Force reflow then animate the draw-in
                const arcEl = document.getElementById('gaugeValueArc');
                arcEl.getBoundingClientRect();
                requestAnimationFrame(() => { arcEl.style.strokeDashoffset = '0'; });
            }

            const arcEl = document.getElementById('gaugeValueArc');
            const gradId = arcEl.getAttribute('data-grad');
            arcEl.setAttribute('stroke', 'url(#' + gradId + (isOver ? '_over' : '') + ')');
            arcEl.setAttribute('stroke-dasharray', valueLen + ' ' + circumference);
            arcEl.style.strokeDashoffset = '0';

            const pctEl = document.getElementById('gaugePct');
            pctEl.classList.toggle('over', isOver);
            animateCounter(pctEl, pct, v => Math.round(v) + '%');
        }

        // ===================== MONTHLY TREND (smooth line/area chart) =====================
        function catmullRomToBezierPath(points) {
            if (points.length < 2) return '';
            let d = 'M ' + points[0].x + ' ' + points[0].y;
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i === 0 ? 0 : i - 1];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                d += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p2.x + ' ' + p2.y;
            }
            return d;
        }

export function renderMonthlyTrendChart(monthOrder, monthTotals) {
            const wrap = document.getElementById('monthlyTrendChart');
            const values = monthOrder.map(m => monthTotals[m.key] || 0);
            const maxVal = Math.max(...values, 1);
            const minVal = 0;
            const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);

            const W = 560, H = 200, padX = 8, padTop = 34, padBottom = 26;
            const plotW = W - padX * 2, plotH = H - padTop - padBottom;

            const points = values.map((v, i) => ({
                x: padX + (i / (values.length - 1 || 1)) * plotW,
                y: padTop + plotH - ((v - minVal) / (maxVal - minVal || 1)) * plotH
            }));

            const linePath = catmullRomToBezierPath(points);
            const areaPath = linePath + ' L ' + points[points.length - 1].x + ' ' + (padTop + plotH) +
                ' L ' + points[0].x + ' ' + (padTop + plotH) + ' Z';

            const avgY = padTop + plotH - ((avg - minVal) / (maxVal - minVal || 1)) * plotH;

            const firstVal = values[0], lastVal = values[values.length - 1];
            const firstPt = points[0], lastPt = points[points.length - 1];
            const gid = 'trend_' + Math.random().toString(36).slice(2, 8);

            let svg = '<svg class="trend-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Monthly spending trend">';
            svg += '<defs>' +
                '<linearGradient id="' + gid + '_fill" x1="0" y1="0" x2="0" y2="1">' +
                    '<stop offset="0%" stop-color="#9b58de" stop-opacity="0.4"/>' +
                    '<stop offset="55%" stop-color="#9b58de" stop-opacity="0.12"/>' +
                    '<stop offset="100%" stop-color="#9b58de" stop-opacity="0"/>' +
                '</linearGradient>' +
                '<linearGradient id="' + gid + '_line" x1="0" y1="0" x2="1" y2="0">' +
                    '<stop offset="0%" stop-color="#cbb4f7"/>' +
                    '<stop offset="100%" stop-color="#9b58de"/>' +
                '</linearGradient>' +
                '<filter id="' + gid + '_glow" x="-30%" y="-80%" width="160%" height="260%">' +
                    '<feGaussianBlur stdDeviation="3.2" result="b"/>' +
                    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
                '</filter>' +
            '</defs>';
            svg += '<line x1="' + padX + '" y1="' + avgY + '" x2="' + (W - padX) + '" y2="' + avgY + '" stroke="#5c5170" stroke-width="1.5" stroke-dasharray="5 5"/>';
            svg += '<path class="trend-area" d="' + areaPath + '" fill="url(#' + gid + '_fill)" stroke="none" style="opacity:0;transition:opacity 0.9s ease 0.35s;"/>';
            svg += '<path id="trendLinePath" d="' + linePath + '" fill="none" stroke="url(#' + gid + '_line)" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + gid + '_glow)"/>';
            points.forEach((p, i) => {
                const isEnd = i === points.length - 1;
                const isStart = i === 0;
                const r = isEnd ? 4.5 : (isStart ? 3.5 : 2.5);
                svg += '<circle class="trend-pt" cx="' + p.x + '" cy="' + p.y + '" r="' + r + '" fill="' + (isEnd || isStart ? '#9b58de' : '#120b1c') + '" stroke="#9b58de" stroke-width="' + (isEnd || isStart ? 0 : 1.5) + '" style="opacity:0;transition:opacity 0.4s ease ' + (0.5 + i * 0.06) + 's;"' + (isEnd ? ' class="trend-pt pulseGlow"' : '') + '/>';
            });
            svg += '</svg>';

            const leftPct = pt => (pt.x / W * 100).toFixed(2) + '%';
            const topPct = px => (px / H * 100).toFixed(2) + '%';

            wrap.innerHTML = svg +
                '<div class="trend-callout" style="left:' + leftPct(firstPt) + '; top:' + topPct(firstPt.y - 30) + '; transform: translateX(-4px);">LKR ' + Math.round(firstVal).toLocaleString('en-US') + '</div>' +
                '<div class="trend-callout" style="left:' + leftPct(lastPt) + '; top:' + topPct(lastPt.y - 30) + '; transform: translateX(-88%);">LKR ' + Math.round(lastVal).toLocaleString('en-US') + '</div>' +
                '<div class="trend-callout avg" style="left:88%; top:' + topPct(avgY - 34) + ';">Average</div>' +
                '<div class="trend-labels">' + monthOrder.map(m => '<span>' + m.label + '</span>').join('') + '</div>';

            // Animate the line drawing in, then reveal area + points
            const lineEl = document.getElementById('trendLinePath');
            const len = lineEl.getTotalLength();
            lineEl.style.strokeDasharray = len + ' ' + len;
            lineEl.style.strokeDashoffset = len;
            lineEl.style.transition = 'none';
            lineEl.getBoundingClientRect();
            requestAnimationFrame(() => {
                lineEl.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)';
                lineEl.style.strokeDashoffset = '0';
            });
            wrap.querySelectorAll('.trend-area').forEach(a => { a.getBoundingClientRect(); requestAnimationFrame(() => { a.style.opacity = '1'; }); });
            wrap.querySelectorAll('.trend-pt').forEach(p => { p.getBoundingClientRect(); requestAnimationFrame(() => { p.style.opacity = '1'; }); });
        }

        // ===================== SPENDING HEATMAP (current-month calendar) =====================
export function renderSpendingHeatmap() {
            const el = document.getElementById('spendingHeatmap');
            const today = new Date();
            const year = today.getFullYear(), month = today.getMonth();
            const firstDay = new Date(year, month, 1);
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startOffset = firstDay.getDay(); // 0=Sun

            const dailyTotals = {};
            for (let d = 1; d <= daysInMonth; d++) dailyTotals[d] = 0;
            state.allExpenses.forEach(e => {
                const d = new Date(e.date);
                if (d.getFullYear() === year && d.getMonth() === month) {
                    dailyTotals[d.getDate()] = (dailyTotals[d.getDate()] || 0) + netAmount(e);
                }
            });

            const maxDay = Math.max(...Object.values(dailyTotals), 1);
            const todayDate = today.getDate();

            function intensityColor(amount) {
                if (amount <= 0) return 'var(--light-gray)';
                const frac = Math.min(amount / maxDay, 1);
                const alpha = 0.15 + frac * 0.75;
                return 'rgba(155,88,222,' + alpha.toFixed(2) + ')';
            }

            let weekdaysHtml = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => '<span>' + d + '</span>').join('');
            let cellsHtml = '';
            for (let i = 0; i < startOffset; i++) cellsHtml += '<div class="heatmap-cell empty"></div>';
            for (let d = 1; d <= daysInMonth; d++) {
                const amount = dailyTotals[d];
                const isToday = d === todayDate;
                const delay = (startOffset + d - 1) * 0.015;
                cellsHtml += '<div class="heatmap-cell' + (isToday ? ' today' : '') + (amount > 0 ? ' has-spend' : '') + '" style="background:' + intensityColor(amount) + '; animation-delay:' + delay.toFixed(3) + 's;" title="' +
                    new Date(year, month, d).toLocaleDateString('en', { month: 'short', day: 'numeric' }) +
                    (amount > 0 ? ' — LKR ' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 }) : ' — no spend') + '"></div>';
            }

            const legendSwatches = [0, 0.25, 0.5, 0.75, 1].map(f =>
                '<div class="heatmap-cell" style="background:' + (f === 0 ? 'var(--light-gray)' : 'rgba(155,88,222,' + (0.15 + f * 0.75).toFixed(2) + ')') + ';"></div>'
            ).join('');

            el.innerHTML =
                '<div class="heatmap-weekdays">' + weekdaysHtml + '</div>' +
                '<div class="heatmap-grid">' + cellsHtml + '</div>' +
                '<div class="heatmap-legend">Less ' + legendSwatches + ' More</div>';
        }

export function netAmount(e) {
            const amt = e.amount || 0;
            if (e.split && e.split.enabled) {
                const owed = getSplitTotal(e.split);
                return Math.max(amt - owed, 0);
            }
            return amt;
        }

        // Compact number formatting — abbreviates large amounts with K/M so values stay on one line
export function formatCompactAmount(value, smallDecimals) {
            smallDecimals = smallDecimals === undefined ? 2 : smallDecimals;
            const abs = Math.abs(value);
            if (abs >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            if (abs >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            return value.toLocaleString('en-US', { minimumFractionDigits: smallDecimals, maximumFractionDigits: smallDecimals });
        }

export function relativeDate(dateStr) {
            const d = new Date(dateStr);
            const today = new Date();
            d.setHours(0,0,0,0); today.setHours(0,0,0,0);
            const diffDays = Math.round((today - d) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays > 1 && diffDays < 7) return diffDays + ' days ago';
            return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
        }

export function updateStats() {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();

            let total30Days = 0, totalPrev30Days = 0, totalThisMonth = 0;

            state.allExpenses.forEach(e => {
                const d = new Date(e.date);
                const amt = netAmount(e);
                if (d >= thirtyDaysAgo) total30Days += amt;
                else if (d >= sixtyDaysAgo) totalPrev30Days += amt;
                if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) totalThisMonth += amt;
            });

            // Total Expenses + trend vs previous 30 days
            animateCounter(document.getElementById('totalExpenses'), total30Days, v => 'LKR ' + formatCompactAmount(v));

            const changeEl = document.getElementById('expenseChange');
            if (totalPrev30Days > 0) {
                const pctChange = ((total30Days - totalPrev30Days) / totalPrev30Days * 100);
                const arrow = pctChange >= 0 ? '▲' : '▼';
                changeEl.textContent = arrow + ' ' + Math.abs(pctChange).toFixed(0) + '% vs last month';
                changeEl.className = 'change ' + (pctChange >= 0 ? 'up' : 'down');
            } else {
                changeEl.textContent = '--';
                changeEl.className = 'change';
            }

            // Monthly Budget — radial arc gauge (crisp SVG, glow, animated draw-in)
            const budget = getBudget();
            const budgetPct = budget > 0 ? Math.min((totalThisMonth / budget) * 100, 999) : 0;
            const isOver = budgetPct > 100;
            renderBudgetGauge(budgetPct, isOver);
            document.getElementById('gaugeSubLabel').textContent = isOver ? 'over budget' : 'of budget used';
            animateCounter(document.getElementById('gaugeSpent'), totalThisMonth, v => 'LKR ' + formatCompactAmount(v, 0));
            const remaining = budget - totalThisMonth;
            animateCounter(document.getElementById('gaugeRemaining'), Math.abs(remaining), v => (remaining < 0 ? '-' : '') + 'LKR ' + formatCompactAmount(v, 0));
            document.getElementById('gaugeRemainingBox').classList.toggle('over', remaining < 0);

            // Average Spend (last 30 days)
            animateCounter(document.getElementById('avgSpend'), total30Days / 30, v => 'LKR ' + formatCompactAmount(v, 0) + '/day');

            // Largest Purchase (last 30 days, fallback to all-time)
            let recentExpenses = state.allExpenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
            let pool = recentExpenses.length ? recentExpenses : state.allExpenses;
            let largest = null;
            pool.forEach(e => { if (!largest || netAmount(e) > netAmount(largest)) largest = e; });
            if (largest) {
                document.getElementById('largestMerchant').textContent = largest.merchant || '--';
                document.getElementById('largestDetail').textContent =
                    'LKR ' + netAmount(largest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' · ' + formatDate(largest.date);
            } else {
                document.getElementById('largestMerchant').textContent = '--';
                document.getElementById('largestDetail').textContent = '--';
            }

            // Transactions this month vs previous month
            let txnThisMonth = 0, txnPrevMonth = 0;
            const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
            state.allExpenses.forEach(e => {
                const d = new Date(e.date);
                if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) txnThisMonth++;
                else if (d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear()) txnPrevMonth++;
            });
            animateCounter(document.getElementById('txnCount'), txnThisMonth, v => Math.round(v).toString());
            const txnChangeEl = document.getElementById('txnChange');
            if (txnPrevMonth > 0) {
                const diff = txnThisMonth - txnPrevMonth;
                const arrow = diff >= 0 ? '▲' : '▼';
                txnChangeEl.textContent = arrow + ' ' + Math.abs(diff) + ' vs last month';
                txnChangeEl.className = 'change ' + (diff >= 0 ? 'up' : 'down');
            } else {
                txnChangeEl.textContent = 'Based on current month';
                txnChangeEl.className = 'change';
            }

            // Top category (this month)
            const catThisMonth = {};
            state.allExpenses.forEach(e => {
                const d = new Date(e.date);
                if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                    catThisMonth[e.category] = (catThisMonth[e.category] || 0) + netAmount(e);
                }
            });
            const topCatEntry = Object.entries(catThisMonth).sort((a, b) => b[1] - a[1])[0];
            if (topCatEntry) {
                document.getElementById('topCategory').textContent = topCatEntry[0];
                document.getElementById('topCategoryDetail').textContent = 'LKR ' + topCatEntry[1].toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' this month';
            } else {
                document.getElementById('topCategory').textContent = '--';
                document.getElementById('topCategoryDetail').textContent = '--';
            }

            // Owed to You — sum of unsettled split shares, across all split expenses
            const unsettled = state.allExpenses.filter(e => e.split && e.split.enabled && !e.split.settled);
            const owedTotal = unsettled.reduce((sum, e) => sum + getSplitTotal(e.split), 0);
            const owedPeopleKeys = new Set();
            unsettled.forEach(e => {
                getSplitParticipants(e.split).forEach(p => {
                    owedPeopleKeys.add(p.type === 'member' && p.uid ? 'member:' + p.uid : 'name:' + (p.name || 'Unknown').trim().toLowerCase());
                });
            });
            const owedPeople = owedPeopleKeys.size;
            animateCounter(document.getElementById('owedToYou'), owedTotal, v => 'LKR ' + formatCompactAmount(v));
            document.getElementById('owedToYouDetail').textContent = unsettled.length > 0
                ? unsettled.length + ' unsettled split' + (unsettled.length === 1 ? '' : 's') + ' · ' + owedPeople + ' ' + (owedPeople === 1 ? 'person' : 'people')
                : 'All settled up';
        }

export function updateCharts() {
            const categoryTotals = {};
            state.allExpenses.forEach(e => categoryTotals[e.category] = (categoryTotals[e.category] || 0) + netAmount(e));
            const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
            const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

            // Spending by category (gradient bars, animated fill-in)
            let catHtml = '';
            sortedCats.forEach(([cat, amount], i) => {
                const pct = total > 0 ? (amount / total * 100).toFixed(1) : 0;
                const color = categoryShade(i, sortedCats.length);
                const grad = 'linear-gradient(90deg, ' + darkenColor(color, 0.45) + ', ' + color + ')';
                catHtml += '<div class="chart-bar">' +
                    '<div class="chart-bar-label">' + cat + '</div>' +
                    '<div class="chart-bar-track" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
                    '<div class="chart-bar-fill" data-target="' + pct + '" style="background: ' + grad + '; box-shadow: 0 0 6px ' + hexToRgba(color, 0.25) + '; transition-delay: ' + (i * 0.06) + 's;"></div></div>' +
                    '<div class="chart-bar-pct">' + pct + '%</div>' +
                    '<div class="chart-bar-value">LKR ' + formatCompactAmount(amount) + '</div></div>';
            });
            document.getElementById('categoryChart').innerHTML = catHtml || '<p style="color: var(--gray);">No data yet</p>';
            animateBarFills('categoryChart');

            // Category breakdown donut — gradients, glow, animated draw-in, center total, legend hover
            renderCategoryDonut(sortedCats, total);

            // Spend — last 7 days (simple list, no bar)
            const dailyTotals = {};
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today); d.setDate(d.getDate() - i);
                dailyTotals[d.toISOString().split('T')[0]] = 0;
            }
            state.allExpenses.forEach(e => { if (dailyTotals.hasOwnProperty(e.date)) dailyTotals[e.date] += netAmount(e); });

            let weekHtml = '';
            for (const [date, amount] of Object.entries(dailyTotals)) {
                const dayName = new Date(date).toLocaleDateString('en', { weekday: 'short' });
                weekHtml += '<div class="activity-item"><div class="activity-left"><div class="activity-merchant">' + dayName + '</div></div>' +
                    '<div class="activity-amount">LKR ' + amount.toLocaleString('en-US') + '</div></div>';
            }
            document.getElementById('weeklyChart').innerHTML = weekHtml || '<p style="color: var(--gray);">No data yet</p>';

            // Monthly trend (last 7 calendar months)
            const monthTotals = {};
            const monthOrder = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const key = d.getFullYear() + '-' + d.getMonth();
                monthTotals[key] = 0;
                monthOrder.push({ key: key, label: d.toLocaleDateString('en', { month: 'short' }) });
            }
            state.allExpenses.forEach(e => {
                const d = new Date(e.date);
                const key = d.getFullYear() + '-' + d.getMonth();
                if (monthTotals.hasOwnProperty(key)) monthTotals[key] += netAmount(e);
            });
            renderMonthlyTrendChart(monthOrder, monthTotals);

            // Spending heatmap calendar (current month)
            renderSpendingHeatmap();

            // Top merchants — group PickMe Food / PickMe Marketplace variants under one umbrella name,
            // since the sync creates entries like "PickMe Food - McDonald's" or "PickMe Marketplace - Keells"
            function groupMerchantName(name) {
                if (/^pickme food\b/i.test(name)) return 'PickMe Food';
                if (/^pickme marketplace\b/i.test(name)) return 'PickMe Marketplace';
                return name;
            }
            const merchantTotals = {};
            state.allExpenses.forEach(e => {
                const key = groupMerchantName(e.merchant || 'Unknown');
                merchantTotals[key] = (merchantTotals[key] || 0) + netAmount(e);
            });
            const topMerchants = Object.entries(merchantTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
            let merchantHtml = '';
            topMerchants.forEach(([merchant, amount], i) => {
                merchantHtml += '<div class="merchant-item">' +
                    '<div class="merchant-left">' +
                    '<span class="merchant-rank">' + (i + 1) + '</span>' +
                    '<span class="merchant-name" title="' + escapeHtml(merchant) + '">' + escapeHtml(merchant) + '</span>' +
                    '</div>' +
                    '<span class="merchant-amount">LKR ' + formatCompactAmount(amount) + '</span>' +
                    '</div>';
            });
            document.getElementById('merchantChart').innerHTML = merchantHtml || '<p style="color: var(--gray);">No data yet</p>';

            // Recent activity feed
            const recent = [...state.allExpenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
            let activityHtml = '';
            recent.forEach(e => {
                activityHtml += '<div class="activity-item">' +
                    '<div class="activity-left">' +
                    '<div class="activity-merchant">' + escapeHtml(e.merchant || 'Unknown') + '</div>' +
                    '<div class="activity-date">' + relativeDate(e.date) + '</div>' +
                    '</div>' +
                    '<div class="activity-amount">LKR ' + (e.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' +
                    '</div>';
            });
            document.getElementById('recentActivity').innerHTML = activityHtml || '<p style="color: var(--gray);">No activity yet</p>';
        }

export function hslToHex(h, s, l) {
            s /= 100; l /= 100;
            const k = n => (n + h / 30) % 12;
            const a = s * Math.min(l, 1 - l);
            const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
            const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
            return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
        }
export function categoryShade(index, count) {
            const hue = 270, sat = 60;
            const minL = 34, maxL = 76;
            const t = count > 1 ? index / (count - 1) : 0;
            return hslToHex(hue, sat, minL + t * (maxL - minL));
        }
        // Loan payoff heat-meter: little owed -> green, a lot owed -> orange/red.
export function loanHeatColor(owedPct) {
            const t = Math.max(0, Math.min(owedPct, 100)) / 100;
            const hue = 130 * (1 - t); // 130 = green, ~65 = amber, 0 = red
            return hslToHex(hue, 68, 46);
        }
