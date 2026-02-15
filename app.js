// ===== MISSION CONTROL v14.0 (New Features Edition) — app.js =====

var HIDDEN_TAGS = ['🔄 Internal Transfer', '💰 Savings'];
var AUTO_ESSENTIALS = ['🏠 Rent', '🏠 Bills', '🛒 Groceries', '🐾 Maya & Dobby', '💊 Health', '🚇 Transport', '📞 Phone'];

var CAT_COLORS = {
    '💰 Salary': '#22c55e', '🏠 Rent': '#8b5cf6', '🏠 Bills': '#7c3aed',
    '🏠 Home & Kitchen': '#a78bfa', '🛒 Groceries': '#22c55e',
    '☕ Coffee & Eating Out': '#f59e0b', '🍕 Takeaway': '#f97316',
    '🐾 Maya & Dobby': '#ec4899', '📚 Books': '#06b6d4',
    '💄 Self Care': '#f472b6', '💊 Health': '#ef4444',
    '💪 Gym & Fitness': '#10b981', '🛍️ Shopping': '#f97316',
    '💳 Buy Now Pay Later': '#fb923c', '💳 Credit Card Payment': '#94a3b8',
    '📱 Subscriptions': '#06b6d4', '🚇 Transport': '#3b82f6',
    '🎮 Entertainment': '#6366f1', '✏️ Art & Hobbies': '#a855f7',
    '📱 Tech & Gadgets': '#0ea5e9', '💊 Therapy': '#e11d48',
    '❤️ Charity': '#f43f5e', '📞 Phone': '#14b8a6',
    '🏦 Bank Fees': '#64748b', '🔄 Internal Transfer': '#475569',
    '💰 Savings': '#34d399', '📦 Other': '#64748b'
};

var ALL_CATEGORIES = [
    '💰 Salary', '🏠 Rent', '🏠 Bills', '🏠 Home & Kitchen',
    '🛒 Groceries', '☕ Coffee & Eating Out', '🍕 Takeaway',
    '🐾 Maya & Dobby', '📚 Books', '💄 Self Care', '💊 Health',
    '💪 Gym & Fitness', '🛍️ Shopping', '💳 Buy Now Pay Later',
    '💳 Credit Card Payment', '📱 Subscriptions', '🚇 Transport',
    '🎮 Entertainment', '✏️ Art & Hobbies', '📱 Tech & Gadgets',
    '💊 Therapy', '❤️ Charity', '📞 Phone', '🏦 Bank Fees',
    '🔄 Internal Transfer', '💰 Savings', '📦 Other'
];

// ---------- STATE ----------
var state = { transactions: [], budget: 1000, balance: 0, totalSavings: 0, nextId: 1, showHidden: false };
var editingTxId = null;
var csvData = null;

// ---------- NEW FEATURE FLAGS ----------
// These flags prevent things from firing repeatedly
var hasSpokenThisSession = false;
var notificationsEnabled = false;

// ---------- INIT ----------
function init() {
    console.log("🚀 Mission Control v14.0 launching...");
    loadState();
    bindEvents();
    try {
        var dateInput = document.getElementById('txDate');
        if (dateInput) dateInput.valueAsDate = new Date();
        populateCategorySelect();
        populateFilterCategories();
        renderAll();

        // NEW: Set up desktop notifications
        setupNotifications();

        // NEW: Check spending every 5 minutes and notify if needed
        // setInterval runs a function repeatedly on a timer
        // 300000ms = 5 minutes (1000ms * 60s * 5min)
        setInterval(function() {
            checkSpendingAndNotify(state);
        }, 300000);

        console.log("✅ All systems go.");
    } catch (e) {
        console.error("Init error:", e);
    }
}

function saveState() { localStorage.setItem('missionControl', JSON.stringify(state)); }

function loadState() {
    try {
        var saved = localStorage.getItem('missionControl');
        if (saved) {
            var parsed = JSON.parse(saved);
            state = { transactions: [], budget: 1000, balance: 0, totalSavings: 0, nextId: 1, showHidden: false };
            for (var key in parsed) { state[key] = parsed[key]; }
            state.transactions.forEach(function(tx) {
                if (tx.isEssential === undefined) {
                    tx.isEssential = AUTO_ESSENTIALS.indexOf(tx.category) !== -1;
                }
            });
        }
    } catch (e) { console.error("Load error:", e); }

    var b = document.getElementById('monthlyBudget');
    if (b) b.value = state.budget;
    var bl = document.getElementById('currentBalance');
    if (bl) bl.value = state.balance || '';
    var sv = document.getElementById('totalSavings');
    if (sv) sv.value = state.totalSavings || '';
}

// ============================================
// TALKING DASHBOARD - speaks your spending summary on load
// ============================================

function speakSpendingSummary(state) {
    // If we've already spoken, or the browser doesn't support speech, bail out
    if (hasSpokenThisSession || !window.speechSynthesis) return;

    // Don't speak if there are no transactions loaded yet
    if (!state.transactions || state.transactions.length === 0) return;

    // Mark that we've spoken so we don't repeat ourselves
    hasSpokenThisSession = true;

    // --- Gather the data we need ---

    // Filter to just expenses (not income), excluding hidden categories
    var expenses = state.transactions.filter(function(t) {
        return t.type === 'expense' && !isHidden(t);
    });

    // Total amount spent
    var totalSpent = expenses.reduce(function(sum, t) {
        return sum + Math.abs(parseFloat(t.amount));
    }, 0);

    // How much budget is left
    var remaining = state.budget - totalSpent;

    // Use the existing pay cycle function instead of hardcoding
    var cycle = getPayCycleDates(0);
    var daysLeft = cycle.daysLeft;

    // Find the category you've spent the most on
    var categoryTotals = {};
    expenses.forEach(function(t) {
        var cat = t.category || 'Uncategorised';
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += Math.abs(parseFloat(t.amount));
    });

    var topCategory = Object.entries(categoryTotals)
        .sort(function(a, b) { return b[1] - a[1]; })[0];

    // --- Build the sentence ---
    var today = new Date();
    var greeting;
    var hour = today.getHours();
    if (hour < 12) greeting = 'Morning';
    else if (hour < 17) greeting = 'Afternoon';
    else greeting = 'Evening';

    var summary = greeting + '. ';

    if (daysLeft === 0) {
        summary += 'Its payday! ';
    } else {
        summary += 'You have ' + daysLeft + ' days until payday. ';
    }

    summary += 'You have spent ' + Math.round(totalSpent) + ' pounds so far this cycle. ';

    if (remaining > 0) {
        summary += 'You have ' + Math.round(remaining) + ' pounds left to play with. ';
    } else {
        summary += 'You are ' + Math.round(Math.abs(remaining)) + ' pounds over budget. Yikes. ';
    }

    if (topCategory) {
        // Strip emojis for speech because the voice will try to describe them
        var cleanName = topCategory[0].replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim();
        summary += 'Your biggest spend category is ' + cleanName +
            ' at ' + Math.round(topCategory[1]) + ' pounds.';
    }

    // --- Speak it ---
    // Small delay so the page has time to render first
    setTimeout(function() {
        var msg = new SpeechSynthesisUtterance(summary);

        // Get available voices and try to find a British one
        var voices = speechSynthesis.getVoices();
        var britishVoice = voices.find(function(v) {
            return v.lang === 'en-GB';
        });
        if (britishVoice) msg.voice = britishVoice;

        msg.rate = 0.95;
        msg.pitch = 1.05;

        speechSynthesis.speak(msg);
        console.log('🛸 Mission Control says:', summary);
    }, 1500);
}

// ============================================
// SMART NOTIFICATIONS - warns you when you're overspending
// ============================================

function setupNotifications() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }

    if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        console.log('🔔 Notifications already enabled');
        return;
    }

    if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(function(permission) {
            notificationsEnabled = (permission === 'granted');
            console.log('🔔 Notification permission:', permission);
        });
    }
}

function checkSpendingAndNotify() {
    if (!notificationsEnabled) return;
    if (!state.transactions || state.transactions.length === 0) return;

    var cycle = getPayCycleDates(0);
    // progress = how far through the 28-day cycle (0 to 1)
    var progress = Math.min(cycle.daysIntoCycle / 28, 1);

    // Calculate total spent this cycle (excluding hidden)
    var totalSpent = state.transactions
        .filter(function(t) { return t.type === 'expense' && !isHidden(t) && isInCycle(t.date, 0); })
        .reduce(function(sum, t) {
            return sum + Math.abs(parseFloat(t.amount));
        }, 0);

    var spentRatio = state.budget > 0 ? totalSpent / state.budget : 0;

    // Overspending warning
    if (spentRatio > progress + 0.15) {
        var percentSpent = Math.round(spentRatio * 100);
        var percentCycle = Math.round(progress * 100);

        var notification = new Notification('⚠️ Mission Control', {
            body: "You're " + percentSpent + "% through your budget but only " +
                percentCycle + "% through your pay cycle. Ease up, commander.",
            tag: 'spending-warning',
            requireInteraction: false
        });

        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }

    // Positive reinforcement if UNDER budget
    if (spentRatio < progress - 0.1 && progress > 0.25) {
        var goodNotification = new Notification('🛸 Mission Control', {
            body: "Nice. You're under budget. " +
                Math.round((progress - spentRatio) * 100) +
                "% ahead of schedule. Keep it up.",
            tag: 'spending-good',
            requireInteraction: false
        });
    }
}

// ============================================
// SPENDING HEATMAP - which days drain your wallet
// ============================================

function getSpendingHeatmap(transactions) {
    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    var heatmap = {};
    days.forEach(function(d) {
        heatmap[d] = { total: 0, count: 0 };
    });

    transactions
        .filter(function(t) { return t.type === 'expense' && !isHidden(t); })
        .forEach(function(t) {
            var date = new Date(t.date);
            // getDay(): 0=Sunday, 1=Monday... we remap so Monday=0
            var dayIndex = (date.getDay() + 6) % 7;
            var dayName = days[dayIndex];
            heatmap[dayName].total += Math.abs(parseFloat(t.amount));
            heatmap[dayName].count += 1;
        });

    var maxTotal = 0;
    days.forEach(function(d) {
        if (heatmap[d].total > maxTotal) maxTotal = heatmap[d].total;
    });

    return days.map(function(day) {
        var intensity = maxTotal > 0 ? heatmap[day].total / maxTotal : 0;
        return {
            day: day,
            total: heatmap[day].total.toFixed(2),
            avg: heatmap[day].count > 0
                ? (heatmap[day].total / heatmap[day].count).toFixed(2)
                : '0.00',
            intensity: intensity,
            count: heatmap[day].count
        };
    });
}

function renderHeatmap() {
    var container = document.getElementById('heatmap-content');
    if (!container) return;

    // Use filtered transactions based on current period selection
    var filterPeriod = document.getElementById('filterPeriod').value;
    var txs = state.transactions.slice();
    if (filterPeriod === 'cycle_0') txs = txs.filter(function(tx) { return isInCycle(tx.date, 0); });
    else if (filterPeriod === 'cycle_-1') txs = txs.filter(function(tx) { return isInCycle(tx.date, -1); });

    var data = getSpendingHeatmap(txs);

    var hasData = data.some(function(d) { return d.count > 0; });
    if (!hasData) {
        container.innerHTML = '<p style="opacity:0.5; text-align:center;">No spending data yet</p>';
        return;
    }

    // Find worst day
    var worstDay = data.reduce(function(worst, current) {
        return parseFloat(current.total) > parseFloat(worst.total) ? current : worst;
    });

    var html = '<div style="display:flex; justify-content:space-between; gap:4px; margin-bottom:12px;">';

    data.forEach(function(d) {
        var alpha = 0.1 + (d.intensity * 0.9);
        var borderStyle = d.day === worstDay.day && worstDay.count > 0
            ? 'border: 1px solid rgba(168, 85, 247, 0.8);'
            : 'border: 1px solid transparent;';

        html += '<div style="flex:1; text-align:center;">';
        html += '  <div style="background:rgba(168, 85, 247, ' + alpha + '); ' +
            'border-radius:8px; padding:10px 2px; margin-bottom:4px; ' +
            borderStyle + '">';
        html += '    <div style="font-size:1em; font-weight:bold;">£' + d.total + '</div>';
        html += '    <div style="font-size:0.7em; opacity:0.7;">' + d.count + ' txns</div>';
        html += '    <div style="font-size:0.65em; opacity:0.5;">avg £' + d.avg + '</div>';
        html += '  </div>';
        html += '  <div style="font-size:0.8em; opacity:0.8;">' + d.day + '</div>';
        html += '</div>';
    });

    html += '</div>';

    if (worstDay.count > 0) {
        html += '<div style="text-align:center; font-size:0.85em; opacity:0.7; margin-top:8px;">';
        html += '💸 You haemorrhage the most cash on <strong>' + worstDay.day + 's</strong>';
        html += ' — £' + worstDay.total + ' total';
        html += '</div>';
    }

    container.innerHTML = html;
}

// ============================================
// FUTURE YOU - project your balance forward
// ============================================

function projectBalance(transactions, currentBalance, daysToProject) {
    if (!daysToProject) daysToProject = 30;

    var expenses = transactions.filter(function(t) {
        return t.type === 'expense' && !isHidden(t);
    });

    if (expenses.length === 0) return null;

    // Find date range
    var dates = expenses.map(function(t) { return new Date(t.date).getTime(); });
    var earliest = new Date(Math.min.apply(null, dates));
    var latest = new Date(Math.max.apply(null, dates));

    var totalDays = Math.max(
        1,
        (latest - earliest) / (1000 * 60 * 60 * 24)
    );

    var totalSpent = expenses.reduce(function(sum, t) {
        return sum + Math.abs(parseFloat(t.amount));
    }, 0);
    var dailyRate = totalSpent / totalDays;

    var projection = [];
    var balance = currentBalance;
    var brokeDay = null;

    for (var i = 0; i <= daysToProject; i++) {
        var date = new Date();
        date.setDate(date.getDate() + i);

        var isBroke = balance <= 0;
        if (isBroke && !brokeDay) brokeDay = i;

        projection.push({
            date: date.toISOString().split('T')[0],
            dayLabel: i === 0 ? 'Today' : 'Day ' + i,
            balance: Math.max(0, balance).toFixed(2),
            danger: balance < currentBalance * 0.2
        });

        balance -= dailyRate;
    }

    return {
        projection: projection,
        dailyRate: dailyRate.toFixed(2),
        brokeDay: brokeDay,
        daysUntilBroke: brokeDay
            ? brokeDay + ' days'
            : 'You survive! 🎉'
    };
}

function renderProjection() {
    var container = document.getElementById('projection-content');
    if (!container) return;

    // Get current cycle transactions
    var cycleTxs = state.transactions.filter(function(t) {
        return isInCycle(t.date, 0) && !isHidden(t);
    });

    // Calculate remaining budget as "current balance"
    var expenses = cycleTxs.filter(function(t) { return t.type === 'expense'; });
    var totalSpent = expenses.reduce(function(sum, t) {
        return sum + Math.abs(parseFloat(t.amount));
    }, 0);
    var remaining = state.budget - totalSpent;

    if (remaining <= 0 || cycleTxs.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; text-align:center;">Need transaction data to project</p>';
        return;
    }

    // Project for remaining days in the 28-day cycle
    var cycle = getPayCycleDates(0);
    var daysLeft = Math.max(1, cycle.daysLeft);

    var result = projectBalance(cycleTxs, remaining, daysLeft);
    if (!result) {
        container.innerHTML = '<p style="opacity:0.5;">Not enough data</p>';
        return;
    }

    var html = '';

    // Summary stats
    html += '<div style="display:flex; justify-content:space-between; margin-bottom:16px; font-size:0.85em;">';
    html += '  <div>🔥 Burn rate: <strong>£' + result.dailyRate + '/day</strong></div>';
    html += '  <div>';
    if (result.brokeDay) {
        html += '💀 Broke in: <strong style="color:#ef4444;">' + result.daysUntilBroke + '</strong>';
    } else {
        html += '🎉 <strong style="color:#22c55e;">You make it to payday!</strong>';
    }
    html += '  </div>';
    html += '</div>';

    // Bar chart
    html += '<div style="display:flex; flex-direction:column; gap:2px;">';

    var maxBalance = parseFloat(result.projection[0].balance);

    result.projection.forEach(function(day) {
        var barWidth = maxBalance > 0
            ? (parseFloat(day.balance) / maxBalance) * 100
            : 0;

        var colour;
        if (day.danger) {
            colour = 'rgba(239, 68, 68, 0.8)';
        } else if (barWidth < 50) {
            colour = 'rgba(234, 179, 8, 0.7)';
        } else {
            colour = 'rgba(168, 85, 247, 0.7)';
        }

        html += '<div style="display:flex; align-items:center; gap:8px; font-size:0.75em;">';
        html += '  <div style="width:50px; opacity:0.6; text-align:right;">' + day.dayLabel + '</div>';
        html += '  <div style="flex:1; background:rgba(255,255,255,0.05); border-radius:4px; height:16px; overflow:hidden;">';
        html += '    <div style="width:' + barWidth + '%; height:100%; background:' + colour + '; border-radius:4px; transition: width 0.3s;"></div>';
        html += '  </div>';
        html += '  <div style="width:55px; font-size:0.9em;">£' + day.balance + '</div>';
        html += '</div>';
    });

    html += '</div>';

    container.innerHTML = html;
}

// ============================================
// SUBSCRIPTION DETECTOR - finds recurring payments
// ============================================

function findRecurring(transactions) {
    var expenses = transactions.filter(function(t) {
        return t.type === 'expense' && !isHidden(t);
    });

    // Group transactions by description
    var grouped = {};
    expenses.forEach(function(t) {
        var key = t.desc.toLowerCase().trim();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
            date: new Date(t.date),
            amount: Math.abs(parseFloat(t.amount)),
            originalDesc: t.desc
        });
    });

    var recurring = [];

    var keys = Object.keys(grouped);
    keys.forEach(function(name) {
        var entries = grouped[name];

        // Need at least 2 occurrences
        if (entries.length < 2) return;

        // Sort chronologically
        entries.sort(function(a, b) { return a.date - b.date; });

        // Calculate gaps between consecutive payments
        var gaps = [];
        for (var i = 1; i < entries.length; i++) {
            var daysBetween = (entries[i].date - entries[i - 1].date) / (1000 * 60 * 60 * 24);
            gaps.push(daysBetween);
        }

        var avgGap = gaps.reduce(function(sum, g) { return sum + g; }, 0) / gaps.length;

        var avgAmount = entries.reduce(function(sum, e) {
            return sum + e.amount;
        }, 0) / entries.length;

        // Check if amounts are consistent (within £2)
        var amountsConsistent = entries.every(function(e) {
            return Math.abs(e.amount - avgAmount) < 2;
        });

        // Determine frequency
        var frequency = null;
        if (avgGap >= 25 && avgGap <= 35 && amountsConsistent) {
            frequency = 'monthly';
        } else if (avgGap >= 12 && avgGap <= 16 && amountsConsistent) {
            frequency = 'fortnightly';
        } else if (avgGap >= 5 && avgGap <= 9 && amountsConsistent) {
            frequency = 'weekly';
        }

        if (frequency) {
            recurring.push({
                name: entries[0].originalDesc,
                amount: avgAmount.toFixed(2),
                frequency: frequency,
                occurrences: entries.length,
                totalSpent: (avgAmount * entries.length).toFixed(2),
                annualCost: (avgAmount * (frequency === 'monthly' ? 12 :
                    frequency === 'fortnightly' ? 26 : 52)).toFixed(2)
            });
        }
    });

    // Sort by annual cost descending
    recurring.sort(function(a, b) {
        return parseFloat(b.annualCost) - parseFloat(a.annualCost);
    });

    return recurring;
}

function renderRecurring() {
    var container = document.getElementById('recurring-content');
    if (!container) return;

    var subs = findRecurring(state.transactions);

    if (subs.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; text-align:center;">No recurring payments detected yet.<br><span style="font-size:0.8em;">Need at least 2 matching transactions to spot patterns.</span></p>';
        return;
    }

    // Calculate total monthly cost
    var monthlyTotal = subs.reduce(function(sum, s) {
        var monthly;
        if (s.frequency === 'monthly') monthly = parseFloat(s.amount);
        else if (s.frequency === 'fortnightly') monthly = parseFloat(s.amount) * 2.17;
        else monthly = parseFloat(s.amount) * 4.33;
        return sum + monthly;
    }, 0);

    var html = '';

    // Summary header
    html += '<div style="text-align:center; margin-bottom:12px; padding:8px; background:rgba(168,85,247,0.15); border-radius:8px;">';
    html += '  <div style="font-size:0.8em; opacity:0.7;">Detected Recurring Payments</div>';
    html += '  <div style="font-size:1.4em; font-weight:bold;">~£' + monthlyTotal.toFixed(2) + '/month</div>';
    html += '</div>';

    // List each subscription
    subs.forEach(function(s) {
        var freqEmoji = s.frequency === 'monthly' ? '📅' :
            s.frequency === 'fortnightly' ? '📆' : '🗓️';

        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">';
        html += '  <div>';
        html += '    <div style="font-weight:600;">' + escapeHtml(s.name) + '</div>';
        html += '    <div style="font-size:0.75em; opacity:0.5;">' + freqEmoji + ' ' + s.frequency + ' · ' + s.occurrences + ' payments found</div>';
        html += '  </div>';
        html += '  <div style="text-align:right;">';
        html += '    <div style="font-weight:bold;">£' + s.amount + '</div>';
        html += '    <div style="font-size:0.7em; opacity:0.5;">£' + s.annualCost + '/yr</div>';
        html += '  </div>';
        html += '</div>';
    });

    container.innerHTML = html;
}

// ---------- PAY CYCLE ----------
function getPayCycleDates(offset) {
    if (offset === undefined) offset = 0;
    var anchorPay = new Date(2026, 1, 5);
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var msPerCycle = 28 * 24 * 60 * 60 * 1000;
    var cycleStart = new Date(anchorPay);
    if (now >= anchorPay) {
        while (cycleStart.getTime() + msPerCycle <= now.getTime()) {
            cycleStart = new Date(cycleStart.getTime() + msPerCycle);
        }
    } else {
        while (cycleStart > now) {
            cycleStart = new Date(cycleStart.getTime() - msPerCycle);
        }
    }
    if (offset !== 0) {
        cycleStart = new Date(cycleStart.getTime() + (offset * msPerCycle));
    }
    var cycleEnd = new Date(cycleStart.getTime() + msPerCycle - 1);
    var daysIntoCycle = 28;
    var daysLeft = 0;
    if (offset === 0) {
        daysIntoCycle = Math.floor((now - cycleStart) / (24 * 60 * 60 * 1000)) + 1;
        daysLeft = 28 - daysIntoCycle;
    }
    return { start: cycleStart, end: cycleEnd, daysIntoCycle: daysIntoCycle, daysLeft: daysLeft };
}

function isInCycle(dateStr, offset) {
    if (offset === undefined) offset = 0;
    var cycle = getPayCycleDates(offset);
    var d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d >= cycle.start && d <= cycle.end;
}

function getActiveOffset() {
    var el = document.getElementById('filterPeriod');
    if (!el) return 0;
    if (el.value === 'cycle_-1') return -1;
    return 0;
}

function isAllTime() {
    var el = document.getElementById('filterPeriod');
    return el && el.value === 'all';
}

// ---------- DATA HELPERS ----------
function isHidden(tx) { return HIDDEN_TAGS.indexOf(tx.category) !== -1; }

function getCycleIncome(offset) {
    if (offset === undefined) offset = 0;
    return state.transactions.filter(function(tx) {
        return !isHidden(tx) && tx.type === 'income' && isInCycle(tx.date, offset);
    }).reduce(function(s, tx) { return s + tx.amount; }, 0);
}

function getCycleExpenses(offset) {
    if (offset === undefined) offset = 0;
    return state.transactions.filter(function(tx) {
        return !isHidden(tx) && tx.type === 'expense' && isInCycle(tx.date, offset);
    }).reduce(function(s, tx) { return s + tx.amount; }, 0);
}

function getAvailableCash(offset) {
    if (offset === undefined) offset = 0;
    return getCycleIncome(offset) - getCycleExpenses(offset);
}

// ---------- AUTO CATEGORIZE ----------
function autoCategory(description) {
    var d = description.toLowerCase();
    if (/mandy anne lutman.*plum/i.test(description)) return '🔄 Internal Transfer';
    if (/miss m a lutman sto/i.test(description)) return '🔄 Internal Transfer';
    if (/202682 03442446.*optional/i.test(description)) return '🔄 Internal Transfer';
    if (/plum fintech/i.test(description)) return '🔄 Internal Transfer';
    if (d.indexOf('moneybox') !== -1) return '💰 Savings';
    if (/plum\b.*ddr/i.test(description)) return '💰 Savings';
    if (d.indexOf('my jaja card') !== -1) return '💳 Credit Card Payment';
    if (d.indexOf('capital one') !== -1) return '💳 Credit Card Payment';
    if (d.indexOf('primark stores ltd') !== -1) return '💰 Salary';
    if (d.indexOf('trinity estates') !== -1) return '🏠 Rent';
    if (/basingstoke.*dean/i.test(description)) return '🏠 Bills';
    if (d.indexOf('british gas') !== -1 || d.indexOf('bg services') !== -1) return '🏠 Bills';
    if (d.indexOf('ovo energy') !== -1) return '🏠 Bills';
    if (d.indexOf('south east water') !== -1) return '🏠 Bills';
    if (d.indexOf('tv licens') !== -1) return '🏠 Bills';
    if (d.indexOf('animal friends') !== -1) return '🐾 Maya & Dobby';
    if (d.indexOf('tails.com') !== -1) return '🐾 Maya & Dobby';
    if (d.indexOf('zooplus') !== -1) return '🐾 Maya & Dobby';
    if (d.indexOf('untamed') !== -1) return '🐾 Maya & Dobby';
    if (d.indexOf('anahi') !== -1) return '💊 Therapy';
    if (d.indexOf('deliveroo') !== -1) return '🍕 Takeaway';
    if (d.indexOf('just eat') !== -1) return '🍕 Takeaway';
    if (d.indexOf('uber eats') !== -1) return '🍕 Takeaway';
    if (d.indexOf('pret a manger') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('cafe destino') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('caffe nero') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('muffin break') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('itsu') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('costa') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('starbucks') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('greggs') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('whittard') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('nandos') !== -1 || d.indexOf('mcdonalds') !== -1) return '☕ Coffee & Eating Out';
    if (d.indexOf('waterstones') !== -1) return '📚 Books';
    if (d.indexOf('skin + me') !== -1 || d.indexOf('skin+me') !== -1) return '💄 Self Care';
    if (d.indexOf('superdrug') !== -1) return '💄 Self Care';
    if (d.indexOf('boots') !== -1) return '💄 Self Care';
    if (d.indexOf('pharmacy') !== -1) return '💊 Health';
    if (d.indexOf('gll better') !== -1) return '💪 Gym & Fitness';
    if (d.indexOf('trainline') !== -1) return '🚇 Transport';
    if (d.indexOf('stagecoach') !== -1) return '🚇 Transport';
    if (d.indexOf('tfl') !== -1) return '🚇 Transport';
    if (d.indexOf('clearpay') !== -1) return '💳 Buy Now Pay Later';
    if (d.indexOf('klarna') !== -1) return '💳 Buy Now Pay Later';
    if (d.indexOf('netflix') !== -1) return '📱 Subscriptions';
    if (d.indexOf('spotify') !== -1) return '📱 Subscriptions';
    if (d.indexOf('disney') !== -1) return '📱 Subscriptions';
    if (d.indexOf('sky digital') !== -1) return '📱 Subscriptions';
    if (d.indexOf('apple.com') !== -1) return '📱 Subscriptions';
    if (d.indexOf('microsoft') !== -1) return '📱 Subscriptions';
    if (d.indexOf('google youtube') !== -1) return '📱 Subscriptions';
    if (d.indexOf('google one') !== -1) return '📱 Subscriptions';
    if (d.indexOf('google cloud') !== -1) return '📱 Subscriptions';
    if (d.indexOf('google play') !== -1) return '📱 Subscriptions';
    if (d.indexOf('openai') !== -1) return '📱 Subscriptions';
    if (d.indexOf('anthropic') !== -1) return '📱 Subscriptions';
    if (d.indexOf('typingmind') !== -1) return '📱 Subscriptions';
    if (d.indexOf('discord') !== -1) return '📱 Subscriptions';
    if (d.indexOf('emma app') !== -1) return '📱 Subscriptions';
    if (d.indexOf('experian') !== -1) return '📱 Subscriptions';
    if (d.indexOf('amazon prime') !== -1) return '📱 Subscriptions';
    if (d.indexOf('lebara') !== -1) return '📞 Phone';
    if (d.indexOf('sainsbury') !== -1) return '🛒 Groceries';
    if (d.indexOf('tesco') !== -1) return '🛒 Groceries';
    if (d.indexOf('asda') !== -1) return '🛒 Groceries';
    if (d.indexOf('aldi') !== -1) return '🛒 Groceries';
    if (d.indexOf('lidl') !== -1) return '🛒 Groceries';
    if (d.indexOf('morrisons') !== -1) return '🛒 Groceries';
    if (d.indexOf('waitrose') !== -1) return '🛒 Groceries';
    if (d.indexOf('co-op') !== -1) return '🛒 Groceries';
    if (/marks.spencer/i.test(description)) return '🛒 Groceries';
    if (d.indexOf('national lottery') !== -1) return '🎮 Entertainment';
    if (d.indexOf('unwfp') !== -1) return '❤️ Charity';
    if (d.indexOf('blue rewards fee') !== -1) return '🏦 Bank Fees';
    if (/plum\b.*fee/i.test(description)) return '🏦 Bank Fees';
    if (d.indexOf('dunelm') !== -1) return '🏠 Home & Kitchen';
    if (d.indexOf('robert dyas') !== -1) return '🏠 Home & Kitchen';
    if (d.indexOf('amazon') !== -1 || d.indexOf('amzn') !== -1) return '🛍️ Shopping';
    if (d.indexOf('argos') !== -1) return '🛍️ Shopping';
    if (/sports? ?direct/i.test(description)) return '🛍️ Shopping';
    if (/t ?k ?maxx/i.test(description)) return '🛍️ Shopping';
    if (d.indexOf('cotton on') !== -1) return '🛍️ Shopping';
    if (d.indexOf('paypal') !== -1) return '🛍️ Shopping';
    return '📦 Other';
}

function guessType(amount, description) {
    var d = description.toLowerCase();
    if (d.indexOf('primark stores ltd') !== -1) return 'income';
    if (d.indexOf('plum fintech bgc') !== -1) return 'income';
    if (amount > 0) return 'income';
    return 'expense';
}

// ---------- CSV (DO NOT TOUCH) ----------
function parseCSVLine(line) {
    var res = []; var cur = ''; var inQ = false;
    for (var i = 0; i < line.length; i++) {
        var c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
        else { cur += c; }
    }
    res.push(cur.trim());
    return res;
}

function parseDate(raw) {
    if (!raw) return null;
    var m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
        var y = parseInt(m[3]); if (y < 100) y += 2000;
        return y + '-' + String(parseInt(m[2])).padStart(2, '0') + '-' + String(parseInt(m[1])).padStart(2, '0');
    }
    var m2 = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m2) return raw.substring(0, 10);
    var d = new Date(raw);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return null;
}

function handleCsvUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    console.log("📁 CSV file:", file.name);
    var reader = new FileReader();
    reader.onload = function(event) {
        var text = event.target.result;
        var lines = text.split('\n').filter(function(l) { return l.trim(); });
        if (lines.length < 2) { alert('CSV looks empty.'); return; }
        csvData = lines.map(function(l) { return parseCSVLine(l); });
        var headers = csvData[0];
        console.log("Headers:", headers);
        document.getElementById('csvPreview').textContent = lines.slice(0, 6).join('\n');
        var mapDiv = document.getElementById('csvMapping');
        mapDiv.innerHTML = '';
        var fields = [
            { key: 'date', label: 'Date Column' },
            { key: 'description', label: 'Description Column' },
            { key: 'amount', label: 'Amount Column' }
        ];
        fields.forEach(function(f) {
            var selected = -1;
            headers.forEach(function(h, i) {
                var lh = h.toLowerCase();
                if (f.key === 'date' && lh.indexOf('date') !== -1) selected = i;
                if (f.key === 'description' && (lh.indexOf('desc') !== -1 || lh.indexOf('memo') !== -1 || lh.indexOf('narrative') !== -1)) selected = i;
                if (f.key === 'amount' && (lh.indexOf('amount') !== -1 || lh.indexOf('value') !== -1)) selected = i;
            });
            var options = '';
            headers.forEach(function(h, i) {
                options += '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + h + '</option>';
            });
            mapDiv.innerHTML += '<div class="form-group"><label>' + f.label + '</label><select class="form-input" data-field="' + f.key + '">' + options + '</select></div>';
        });
        document.getElementById('csvModal').classList.add('active');
    };
    reader.readAsText(file);
    e.target.value = '';
}

function importCsv() {
    if (!csvData || csvData.length < 2) { console.error("No CSV data"); return; }
    var selects = document.querySelectorAll('#csvMapping select');
    var map = {};
    selects.forEach(function(s) { map[s.getAttribute('data-field')] = parseInt(s.value); });
    console.log("Mapping:", map);
    var added = 0; var hidden = 0;
    for (var i = 1; i < csvData.length; i++) {
        var row = csvData[i];
        if (!row || row.length < 2) continue;
        var rawDate = row[map.date] || '';
        var desc = row[map.description] || '';
        var rawAmt = row[map.amount] || '0';
        if (!rawDate || !desc) continue;
        var date = parseDate(rawDate);
        if (!date) continue;
        rawAmt = rawAmt.replace(/[£$€,\s]/g, '');
        var num = parseFloat(rawAmt);
        if (isNaN(num)) continue;
        var amount = Math.abs(num);
        var type = guessType(num, desc);
        var category = autoCategory(desc);
        var isEssential = AUTO_ESSENTIALS.indexOf(category) !== -1;
        if (HIDDEN_TAGS.indexOf(category) !== -1) hidden++;
        var isDupe = state.transactions.some(function(t) {
            return t.date === date && t.desc === desc && Math.abs(t.amount - amount) < 0.01;
        });
        if (!isDupe) {
            state.transactions.push({ id: state.nextId++, desc: desc, amount: amount, type: type, category: category, date: date, isEssential: isEssential });
            added++;
        }
    }
    state.transactions.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    saveState(); renderAll(); populateFilterCategories();
    document.getElementById('csvModal').classList.remove('active');
    csvData = null;
    alert('🚀 Imported ' + added + ' transactions!\n🔄 ' + hidden + ' hidden.');

    // NEW: Check spending right after import
    checkSpendingAndNotify();
}

// ---------- RENDER ALL ----------
function renderAll() {
    try {
        renderCycleBanner();
        renderInsights();
        renderBudgetProgress();
        renderHiddenSummary();
        renderTransactions();
        renderCategoryBars();
        renderAffordContext();
        renderTopSpends();
        renderSurvivalPanel();

        // NEW: Render new panels
        renderHeatmap();
        renderProjection();
        renderRecurring();

        // NEW: Speak summary (only fires once per session)
        speakSpendingSummary(state);
    } catch (e) { console.error("Render error:", e); }
}

// ---------- CYCLE BANNER ----------
function renderCycleBanner() {
    var offset = getActiveOffset();
    var cycle = getPayCycleDates(offset);
    var income = getCycleIncome(offset);
    var expenses = getCycleExpenses(offset);
    var available = income - expenses;
    var dailyLeft = (offset === 0 && cycle.daysLeft > 0) ? available / cycle.daysLeft : 0;

    document.getElementById('cycleDay').textContent = offset === 0 ? cycle.daysIntoCycle : 28;
    var pct = offset === 0 ? cycle.daysIntoCycle / 28 : 1;
    var dashOff = (2 * Math.PI * 52) * (1 - pct);
    var ring = document.getElementById('cycleRingFill');
    if (ring) ring.style.strokeDashoffset = dashOff;

    var fmt = function(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
    document.getElementById('cycleDates').textContent = fmt(cycle.start) + ' → ' + fmt(cycle.end);
    var cdEl = document.getElementById('cycleCountdown');
    if (offset === 0) {
        cdEl.textContent = cycle.daysLeft === 0 ? '🎉 Payday today!' : cycle.daysLeft + ' days until payday';
    } else { cdEl.textContent = '📅 Past Cycle'; }

    document.getElementById('qsIncome').textContent = '£' + income.toFixed(2);
    document.getElementById('qsSpent').textContent = '£' + expenses.toFixed(2);
    var avEl = document.getElementById('qsAvailable');
    avEl.textContent = '£' + available.toFixed(2);
    avEl.className = 'cqs-value ' + (available >= 0 ? 'blue' : 'red');
    var dlEl = document.getElementById('qsDailyLeft');
    dlEl.textContent = offset === 0 ? '£' + dailyLeft.toFixed(2) : '—';
    dlEl.className = 'cqs-value ' + (dailyLeft >= 0 ? 'purple' : 'red');
    document.getElementById('qsSavings').textContent = '£' + (state.totalSavings || 0).toFixed(2);
}

// ---------- BUDGET ----------
function renderBudgetProgress() {
    var offset = getActiveOffset();
    var expenses = getCycleExpenses(offset);
    var budget = state.budget || 1000;
    var cycle = getPayCycleDates(offset);
    var pct = Math.min((expenses / budget) * 100, 100);
    var idealPct = offset === 0 ? (cycle.daysIntoCycle / 28) * 100 : 100;
    document.getElementById('budgetTotal').textContent = budget.toFixed(0);
    document.getElementById('budgetPctLabel').textContent = pct.toFixed(0) + '% used';
    var fill = document.getElementById('budgetProgressFill');
    if (fill) {
        fill.style.width = pct + '%';
        if (pct > 90) fill.style.background = 'linear-gradient(90deg, var(--accent-red), #f87171)';
        else if (pct > 70) fill.style.background = 'linear-gradient(90deg, var(--accent-amber), #fbbf24)';
        else fill.style.background = 'linear-gradient(90deg, var(--accent-purple), #c084fc)';
    }
    var marker = document.getElementById('budgetDayMarker');
    if (marker) marker.style.left = idealPct + '%';
    var note = document.getElementById('budgetProgressNote');
    if (note) {
        if (offset !== 0) { note.textContent = 'Past Cycle'; }
        else {
            var diff = pct - idealPct;
            if (diff > 15) note.textContent = '⚠️ ' + diff.toFixed(0) + '% ahead';
            else if (diff > 5) note.textContent = '↑ Slightly ahead';
            else if (diff < -10) note.textContent = '✨ Under budget!';
            else note.textContent = '● On track';
        }
    }
}

// ---------- INSIGHTS ----------
function renderInsights() {
    var offset = getActiveOffset();
    var cycle = getPayCycleDates(offset);
    var expenses = getCycleExpenses(offset);
    var income = getCycleIncome(offset);

    var vEl = document.getElementById('insightVelocity');
    if (vEl) {
        if (offset === 0 && cycle.daysIntoCycle > 0 && expenses > 0) {
            var projected = (expenses / cycle.daysIntoCycle) * 28;
            var cls = projected > income ? 'highlight-red' : 'highlight-green';
            vEl.innerHTML = '<span class="insight-emoji">📈</span><span class="insight-text">Projected: <span class="' + cls + '">£' + projected.toFixed(0) + '</span> this cycle.</span>';
        } else if (offset !== 0) {
            vEl.innerHTML = '<span class="insight-emoji">📉</span><span class="insight-text">Total spent: £' + expenses.toFixed(0) + '</span>';
        } else {
            vEl.innerHTML = '<span class="insight-emoji">📈</span><span class="insight-text">Not enough data yet.</span>';
        }
    }
    var sEl = document.getElementById('insightStreak');
    if (sEl) {
        var noSpend = getNoSpendDays(offset);
        sEl.innerHTML = '<span class="insight-emoji">🔥</span><span class="insight-text"><strong>' + noSpend + '</strong> no-spend days.</span>';
    }
    var fEl = document.getElementById('insightFunFact');
    if (fEl) {
        var top = getTopCategory(offset);
        if (top) {
            fEl.innerHTML = '<span class="insight-emoji">👑</span><span class="insight-text">Biggest drain: <strong>' + top.cat + '</strong> (£' + top.amount.toFixed(0) + ').</span>';
        } else {
            fEl.innerHTML = '<span class="insight-emoji">💡</span><span class="insight-text">Add data to see insights!</span>';
        }
    }
}

function getNoSpendDays(offset) {
    var cycle = getPayCycleDates(offset);
    var txs = state.transactions.filter(function(tx) { return !isHidden(tx) && tx.type === 'expense' && isInCycle(tx.date, offset); });
    var spendDates = {};
    txs.forEach(function(tx) { spendDates[tx.date] = true; });
    var count = 0;
    var d = new Date(cycle.start);
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var end = (offset === 0 && now < cycle.end) ? now : cycle.end;
    while (d <= end) {
        if (!spendDates[d.toISOString().slice(0, 10)]) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

function getTopCategory(offset) {
    var txs = state.transactions.filter(function(tx) { return !isHidden(tx) && tx.type === 'expense' && isInCycle(tx.date, offset); });
    if (txs.length === 0) return null;
    var totals = {};
    txs.forEach(function(tx) { totals[tx.category] = (totals[tx.category] || 0) + tx.amount; });
    var sorted = Object.entries(totals).sort(function(a, b) { return b[1] - a[1]; });
    return { cat: sorted[0][0], amount: sorted[0][1] };
}

// ---------- TRANSACTIONS ----------
function renderTransactions() {
    var list = document.getElementById('transactionList');
    if (!list) return;
    var filterCat = document.getElementById('filterCategory').value;
    var filterType = document.getElementById('filterType').value;
    var filterPeriod = document.getElementById('filterPeriod').value;
    var filterSearch = document.getElementById('filterSearch').value.toLowerCase();

    var txs = state.transactions.slice();
    if (!state.showHidden) txs = txs.filter(function(tx) { return !isHidden(tx); });
    if (filterPeriod === 'cycle_0') txs = txs.filter(function(tx) { return isInCycle(tx.date, 0); });
    else if (filterPeriod === 'cycle_-1') txs = txs.filter(function(tx) { return isInCycle(tx.date, -1); });
    if (filterCat !== 'all') txs = txs.filter(function(tx) { return tx.category === filterCat; });

    if (filterType === 'income') txs = txs.filter(function(tx) { return tx.type === 'income'; });
    else if (filterType === 'expense') txs = txs.filter(function(tx) { return tx.type === 'expense'; });
    else if (filterType === 'essential') txs = txs.filter(function(tx) { return tx.isEssential && tx.type === 'expense'; });
    else if (filterType === 'nonessential') txs = txs.filter(function(tx) { return !tx.isEssential && tx.type === 'expense'; });

    if (filterSearch) txs = txs.filter(function(tx) { return tx.desc.toLowerCase().indexOf(filterSearch) !== -1; });
    txs.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    var label = document.getElementById('chartPeriodLabel');
    if (label) {
        if (filterPeriod === 'cycle_0') label.textContent = 'This Pay Cycle';
        else if (filterPeriod === 'cycle_-1') label.textContent = 'Last Pay Cycle';
        else label.textContent = 'All Time';
    }

    if (txs.length === 0) {
        list.innerHTML = '<div class="empty-state"><span class="empty-icon">🚀</span><p>No transactions found.</p></div>';
        return;
    }

    var html = '';
    txs.forEach(function(tx) {
        var color = CAT_COLORS[tx.category] || '#64748b';
        var dateFmt = new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        var hiddenClass = isHidden(tx) ? 'tx-hidden' : '';
        var essItemClass = tx.isEssential ? 'is-essential' : '';
        var essClass = tx.isEssential ? 'active' : '';
        var sign = tx.type === 'income' ? '+' : '-';
        var essBadge = tx.isEssential ? '<span class="tx-essential-badge">🛡️ ESSENTIAL</span>' : '';

        html += '<div class="tx-item ' + hiddenClass + ' ' + essItemClass + '">' +
            '<div class="tx-details">' +
            '<div class="tx-desc">' + escapeHtml(tx.desc) + '</div>' +
            '<div class="tx-meta">' +
            '<span class="tx-cat-badge" onclick="openCatEdit(' + tx.id + ')" style="color: ' + color + '">' + tx.category + '</span>' +
            essBadge +
            '<span class="tx-date">' + dateFmt + '</span>' +
            '</div></div>' +
            '<span class="tx-amount ' + tx.type + '">' + sign + '£' + tx.amount.toFixed(2) + '</span>' +
            '<div class="tx-actions">' +
            '<button class="tx-btn tx-essential ' + essClass + '" onclick="toggleEssential(' + tx.id + ')" title="' + (tx.isEssential ? 'Remove Essential' : 'Mark Essential') + '">🛡️</button>' +
            '<button class="tx-btn tx-delete" onclick="deleteTransaction(' + tx.id + ')" title="Delete">🗑️</button>' +
            '</div></div>';
    });
    list.innerHTML = html;
}

// ---------- CATEGORY BARS ----------
function renderCategoryBars() {
    var container = document.getElementById('categoryBars');
    if (!container) return;
    var filterPeriod = document.getElementById('filterPeriod').value;
    var txs = state.transactions.filter(function(tx) { return !isHidden(tx) && tx.type === 'expense'; });
    if (filterPeriod === 'cycle_0') txs = txs.filter(function(tx) { return isInCycle(tx.date, 0); });
    else if (filterPeriod === 'cycle_-1') txs = txs.filter(function(tx) { return isInCycle(tx.date, -1); });
    if (txs.length === 0) { container.innerHTML = '<div class="empty-state-small">No expenses for this period</div>'; return; }
    var catTotals = {};
    txs.forEach(function(tx) { catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount; });
    var sorted = Object.entries(catTotals).sort(function(a, b) { return b[1] - a[1]; });
    var maxAmount = sorted[0][1];
    var totalSpent = sorted.reduce(function(sum, e) { return sum + e[1]; }, 0);
    var html = '';
    sorted.forEach(function(entry) {
        var cat = entry[0]; var amount = entry[1];
        var percent = (amount / maxAmount) * 100;
        var ofTotal = ((amount / totalSpent) * 100).toFixed(0);
        var color = CAT_COLORS[cat] || '#64748b';
        html += '<div class="cat-bar-item"><div class="cat-bar-header"><span class="cat-bar-name">' + cat + '</span><span class="cat-bar-amount">£' + amount.toFixed(2) + ' (' + ofTotal + '%)</span></div><div class="cat-bar-track"><div class="cat-bar-fill" style="width: ' + percent + '%; background: ' + color + ';"></div></div></div>';
    });
    container.innerHTML = html;
}

// ---------- TOP SPENDS ----------
function renderTopSpends() {
    var container = document.getElementById('topSpendsList');
    if (!container) return;
    var offset = getActiveOffset();
    var txs = state.transactions.filter(function(tx) {
        return !isHidden(tx) && tx.type === 'expense' && isInCycle(tx.date, offset);
    }).sort(function(a, b) { return b.amount - a.amount; }).slice(0, 5);
    if (txs.length === 0) { container.innerHTML = '<div class="empty-state-small">No expenses yet</div>'; return; }
    var html = '';
    txs.forEach(function(tx, i) {
        var rank = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
        html += '<div class="top-spend-item"><span class="top-spend-rank ' + rank + '">' + (i + 1) + '</span><div class="top-spend-details"><div class="top-spend-desc">' + escapeHtml(tx.desc) + '</div><div class="top-spend-cat">' + tx.category + '</div></div><span class="top-spend-amount">£' + tx.amount.toFixed(2) + '</span></div>';
    });
    container.innerHTML = html;
}

// ---------- SURVIVAL PANEL ----------
function renderSurvivalPanel() {
    var container = document.getElementById('survivalStats');
    if (!container) return;
    var offset = getActiveOffset();
    var txs = state.transactions.filter(function(tx) {
        return !isHidden(tx) && tx.type === 'expense' && isInCycle(tx.date, offset);
    });

    var essentialSpend = 0;
    var discretionarySpend = 0;
    var essCatTotals = {};

    txs.forEach(function(tx) {
        if (tx.isEssential) {
            essentialSpend += tx.amount;
            essCatTotals[tx.category] = (essCatTotals[tx.category] || 0) + tx.amount;
        } else {
            discretionarySpend += tx.amount;
        }
    });

    var totalSpend = essentialSpend + discretionarySpend;
    var income = getCycleIncome(offset);
    var potentialSavings = Math.max(income - essentialSpend, 0);

    if (totalSpend === 0) {
        container.innerHTML = '<div class="empty-state-small">No expense data for this period</div>';
        return;
    }

    var essPct = (essentialSpend / totalSpend) * 100;
    var discPct = (discretionarySpend / totalSpend) * 100;

    var essSorted = Object.entries(essCatTotals).sort(function(a, b) { return b[1] - a[1]; });
    var catListHtml = '';
    if (essSorted.length > 0) {
        catListHtml = '<div class="survival-cat-list">';
        catListHtml += '<div style="font-size: 0.7rem; color: #8888a0; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Essential Breakdown</div>';
        essSorted.forEach(function(entry) {
            catListHtml += '<div class="survival-cat-item"><span class="cat-name">' + entry[0] + '</span><span class="cat-amount">£' + entry[1].toFixed(2) + '</span></div>';
        });
        catListHtml += '</div>';
    }

    container.innerHTML =
        '<div class="survival-row main"><span>🛡️ Essential</span><span class="survival-val blue">£' + essentialSpend.toFixed(2) + '</span></div>' +
        '<div class="survival-bar-bg"><div class="survival-bar-fill essential" style="width: ' + essPct + '%"></div></div>' +
        '<div class="survival-row main" style="margin-top: 12px"><span>🎉 Discretionary</span><span class="survival-val red">£' + discretionarySpend.toFixed(2) + '</span></div>' +
        '<div class="survival-bar-bg"><div class="survival-bar-fill discretionary" style="width: ' + discPct + '%"></div></div>' +
        '<div class="survival-row total"><span>💰 Max Savings Potential</span><span class="survival-val green">£' + potentialSavings.toFixed(2) + '</span></div>' +
        '<div style="font-size: 0.7rem; color: #8888a0; margin-top: 2px; font-style: italic;">(Income £' + income.toFixed(0) + ' minus Essentials)</div>' +
        catListHtml;
}

// ---------- AFFORD ----------
function renderAffordContext() {
    var available = getAvailableCash(0);
    var cycle = getPayCycleDates(0);
    var ctx = document.getElementById('affordContext');
    if (ctx) ctx.innerHTML = 'Available: <strong>£' + available.toFixed(2) + '</strong> · ' + cycle.daysLeft + ' days left';
}

function checkAfford() {
    var item = document.getElementById('affordItem').value.trim() || 'that';
    var amount = parseFloat(document.getElementById('affordAmount').value);
    var resultDiv = document.getElementById('affordResult');
    if (!amount) { resultDiv.style.display = 'none'; return; }
    var available = getAvailableCash(0);
    var after = available - amount;
    resultDiv.style.display = 'block';
    if (amount > available) {
        resultDiv.className = 'afford-result no';
        resultDiv.innerHTML = '❌ Nope. <strong>' + escapeHtml(item) + '</strong> costs £' + amount.toFixed(2) + ' but you only have £' + available.toFixed(2) + '.';
    } else {
        resultDiv.className = 'afford-result yes';
        resultDiv.innerHTML = '✅ Yes! You\'ll still have £' + after.toFixed(2) + ' left.';
    }
}

// ---------- HIDDEN SUMMARY ----------
function renderHiddenSummary() {
    var count = state.transactions.filter(function(tx) { return isHidden(tx); }).length;
    var el = document.getElementById('hiddenSummary');
    if (el) {
        if (count > 0) {
            el.style.display = 'flex';
            document.getElementById('hiddenCount').textContent = count;
            document.getElementById('toggleHidden').textContent = state.showHidden ? 'Hide' : 'Show';
        } else { el.style.display = 'none'; }
    }
}

// ---------- ACTIONS ----------
function toggleEssential(id) {
    var tx = state.transactions.find(function(t) { return t.id === id; });
    if (tx) { tx.isEssential = !tx.isEssential; saveState(); renderAll(); }
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(function(t) { return t.id !== id; });
    saveState(); renderAll();
}

function addTransaction() {
    var desc = document.getElementById('txDesc').value.trim();
    var amount = parseFloat(document.getElementById('txAmount').value);
    var type = document.getElementById('txType').value;
    var category = document.getElementById('txCategory').value;
    var date = document.getElementById('txDate').value;
    var isEssential = document.getElementById('txEssential').checked;
    if (!desc || !amount || !date) { alert('Fill in all fields!'); return; }
    state.transactions.push({ id: state.nextId++, desc: desc, amount: amount, type: type, category: category, date: date, isEssential: isEssential });
    saveState(); renderAll(); populateFilterCategories();
    document.getElementById('addModal').classList.remove('active');
}

function openCatEdit(id) {
    var tx = state.transactions.find(function(t) { return t.id === id; });
    if (!tx) return;
    editingTxId = id;
    document.getElementById('catEditDesc').textContent = '"' + tx.desc + '"';
    var html = '';
    ALL_CATEGORIES.forEach(function(cat) {
        var active = cat === tx.category ? 'active' : '';
        html += '<div class="cat-option ' + active + '" onclick="setCatForTx(\'' + cat.replace(/'/g, "\\'") + '\')">' + cat + '</div>';
    });
    document.getElementById('categoryGrid').innerHTML = html;
    document.getElementById('catModal').classList.add('active');
}

function setCatForTx(cat) {
    var tx = state.transactions.find(function(t) { return t.id === editingTxId; });
    if (tx) {
        tx.category = cat;
        if (cat === '💰 Salary') tx.type = 'income';
        if (AUTO_ESSENTIALS.indexOf(cat) !== -1) tx.isEssential = true;
        saveState(); renderAll(); populateFilterCategories();
    }
    document.getElementById('catModal').classList.remove('active');
}

function exportCSV() {
    if (state.transactions.length === 0) return;
    var csv = 'Date,Description,Amount,Type,Category,Essential\n';
    state.transactions.forEach(function(tx) {
        csv += tx.date + ',"' + tx.desc.replace(/"/g, '""') + '",' + tx.amount + ',' + tx.type + ',"' + tx.category + '",' + tx.isEssential + '\n';
    });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'mission-control-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
}

// ---------- DROPDOWNS ----------
function populateCategorySelect() {
    var select = document.getElementById('txCategory');
    if (!select) return;
    select.innerHTML = '';
    ALL_CATEGORIES.forEach(function(c) {
        select.innerHTML += '<option value="' + c + '">' + c + '</option>';
    });
}

function populateFilterCategories() {
    var sel = document.getElementById('filterCategory');
    if (!sel) return;
    var cur = sel.value;
    var cats = []; var seen = {};
    state.transactions.forEach(function(t) {
        if (!isHidden(t) && !seen[t.category]) { seen[t.category] = true; cats.push(t.category); }
    });
    cats.sort();
    sel.innerHTML = '<option value="all">All Categories</option>';
    cats.forEach(function(c) {
        sel.innerHTML += '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + c + '</option>';
    });
}

function escapeHtml(str) { var div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

// ---------- SAFE BIND ----------
function safeBind(id, event, func) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener(event, func); }
    else { console.warn('⚠️ Missing: ' + id); }
}

// ---------- BIND ----------
function bindEvents() {
    console.log("🔗 Binding...");
    safeBind('addTransactionBtn', 'click', function() { document.getElementById('addModal').classList.add('active'); });
    safeBind('closeModal', 'click', function() { document.getElementById('addModal').classList.remove('active'); });
    safeBind('addModal', 'click', function(e) { if (e.target === e.currentTarget) e.currentTarget.classList.remove('active'); });
    safeBind('saveTransactionBtn', 'click', addTransaction);
    safeBind('csvUploadBtn', 'click', function() { document.getElementById('csvFileInput').click(); });
    safeBind('csvFileInput', 'change', handleCsvUpload);
    safeBind('closeCsvModal', 'click', function() { document.getElementById('csvModal').classList.remove('active'); });
    safeBind('csvModal', 'click', function(e) { if (e.target === e.currentTarget) e.currentTarget.classList.remove('active'); });
    safeBind('importCsvBtn', 'click', function() { importCsv(); });
    safeBind('closeCatModal', 'click', function() { document.getElementById('catModal').classList.remove('active'); });
    safeBind('catModal', 'click', function(e) { if (e.target === e.currentTarget) e.currentTarget.classList.remove('active'); });
    safeBind('filterCategory', 'change', function() { renderTransactions(); renderCategoryBars(); });
    safeBind('filterType', 'change', function() { renderTransactions(); renderCategoryBars(); });
    safeBind('filterPeriod', 'change', function() { renderAll(); });
    safeBind('filterSearch', 'input', function() { renderTransactions(); });
    safeBind('toggleHidden', 'click', function() { state.showHidden = !state.showHidden; saveState(); renderAll(); });
    safeBind('saveBudgetBtn', 'click', function() { state.budget = parseFloat(document.getElementById('monthlyBudget').value) || 1000; saveState(); renderAll(); });
    safeBind('saveBalanceBtn', 'click', function() { state.balance = parseFloat(document.getElementById('currentBalance').value) || 0; saveState(); renderAll(); });
    safeBind('saveSavingsBtn', 'click', function() { state.totalSavings = parseFloat(document.getElementById('totalSavings').value) || 0; saveState(); renderAll(); });
    safeBind('affordCheckBtn', 'click', checkAfford);
    safeBind('affordAmount', 'keydown', function(e) { if (e.key === 'Enter') checkAfford(); });
    safeBind('clearAllBtn', 'click', function() { if (confirm('Delete ALL transactions?')) { state.transactions = []; state.nextId = 1; saveState(); renderAll(); populateFilterCategories(); } });
    safeBind('exportBtn', 'click', exportCSV);
    console.log("✅ Bound.");
}

// ---------- GO ----------
init();
