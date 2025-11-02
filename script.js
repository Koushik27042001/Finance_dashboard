// Elements
const typeEl = document.getElementById('type');
const descEl = document.getElementById('description');
const categoryEl = document.getElementById('category');
const amountEl = document.getElementById('amount');
const dateEl = document.getElementById('date');
const addBtn = document.getElementById('add-btn');

const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const balanceEl = document.getElementById('balance');

const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const selectedMonthLabel = document.getElementById('selected-month');

const monthIncomeEl = document.getElementById('month-income');
const monthExpenseEl = document.getElementById('month-expense');
const monthBalanceEl = document.getElementById('month-balance');

const monthlyGoalInput = document.getElementById('monthly-goal');
const saveGoalBtn = document.getElementById('save-goal');
const progressFill = document.getElementById('progress-fill');
const goalValueEl = document.getElementById('goal-value');
const goalFeedbackEl = document.getElementById('goal-feedback');

const sixMonthsContainer = document.getElementById('six-months');

const transactionsListEl = document.getElementById('transactions');
const filterEl = document.getElementById('filter');
const searchEl = document.getElementById('search');

const themeToggle = document.getElementById('theme-toggle');

// State & storage keys
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let monthlyGoal = parseFloat(localStorage.getItem('monthlyGoal')) || 0;
let selectedMonth = new Date(); // Date object representing currently selected month
selectedMonth.setDate(1); // normalize to month start

// Helper: format currency
function fmt(amount) { return '₹' + amount.toFixed(2); }

// Helper: YYYY-MM
function monthKey(dateObj) { return `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`; }

// Helper: month display
function formatMonthLabel(dateObj) {
    return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// --- Persist helpers
function saveTransactions() { localStorage.setItem('transactions', JSON.stringify(transactions)); }

function saveGoal() { localStorage.setItem('monthlyGoal', monthlyGoal); }

// --- Transaction functions
function addTransaction() {
    const type = typeEl.value;
    const description = descEl.value.trim();
    const category = categoryEl.value;
    const rawAmount = parseFloat(amountEl.value);
    const rawDate = dateEl.value ? new Date(dateEl.value) : new Date();

    if (!description || isNaN(rawAmount) || rawAmount <= 0) {
        alert('Please enter a valid description and positive amount.');
        return;
    }

    const tx = {
        id: Date.now(),
        type,
        description,
        category,
        amount: rawAmount,
        dateISO: rawDate.toISOString()
    };

    transactions.push(tx);
    saveTransactions();
    clearForm();
    renderEverything();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderEverything();
}

// --- Calculations
function calcTotalsAll() {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
}

// Totals for specific month (Date object)
function calcTotalsForMonth(dateObj) {
    const key = monthKey(dateObj);
    const filtered = transactions.filter(t => {
        const d = new Date(t.dateISO);
        return monthKey(d) === key;
    });
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
}

// Last N months summary
function computeLastNMonths(n = 6) {
    const arr = [];
    const base = new Date(selectedMonth); // using selectedMonth as reference
    base.setDate(1);
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        const totals = calcTotalsForMonth(d);
        arr.push({ label: formatMonthLabel(d), key: monthKey(d), ...totals });
    }
    return arr;
}

// --- Rendering
function renderMainSummary() {
    const totals = calcTotalsAll();
    incomeEl.textContent = fmt(totals.income);
    expenseEl.textContent = fmt(totals.expense);
    balanceEl.textContent = fmt(totals.balance);
}

function renderMonthSummary() {
    selectedMonthLabel.textContent = formatMonthLabel(selectedMonth);
    const totals = calcTotalsForMonth(selectedMonth);
    monthIncomeEl.textContent = fmt(totals.income);
    monthExpenseEl.textContent = fmt(totals.expense);
    monthBalanceEl.textContent = fmt(totals.balance);

    // goal progress: percent of goal consumed by monthExpense (we track expense vs goal)
    if (monthlyGoal && monthlyGoal > 0) {
        const pct = Math.min(100, (totals.expense / monthlyGoal) * 100);
        progressFill.style.width = pct + '%';
        goalValueEl.textContent = fmt(monthlyGoal);
        if (totals.expense === 0) goalFeedbackEl.textContent = 'No expenses this month.';
        else if (pct < 70) goalFeedbackEl.textContent = `Good — ${Math.round(pct)}% of goal used.`;
        else if (pct < 100) goalFeedbackEl.textContent = `Warning — ${Math.round(pct)}% of goal used.`;
        else goalFeedbackEl.textContent = `Exceeded! ${Math.round(pct)}% of goal used.`;
    } else {
        progressFill.style.width = '0%';
        goalValueEl.textContent = '—';
        goalFeedbackEl.textContent = 'Set a monthly budget goal to track progress.';
    }
}

function renderSixMonths() {
    const arr = computeLastNMonths(6);
    sixMonthsContainer.innerHTML = '';
    arr.forEach(item => {
        const card = document.createElement('div');
        card.className = 'month-card';
        card.innerHTML = `<h5>${item.label}</h5>
                      <p>${fmt(item.income)} / ${fmt(item.expense)}</p>
                      <small style="color:var(--muted)">${fmt(item.balance)} balance</small>`;
        sixMonthsContainer.appendChild(card);
    });
}

function renderTransactionsList() {
    const filter = filterEl.value;
    const q = (searchEl.value || '').trim().toLowerCase();
    const list = transactions.slice().sort((a, b) => b.id - a.id); // latest first
    transactionsListEl.innerHTML = '';

    list.forEach(tx => {
        if (filter !== 'all' && tx.type !== filter) return;
        if (q) {
            const hay = (tx.description + ' ' + tx.category).toLowerCase();
            if (!hay.includes(q)) return;
        }

        const li = document.createElement('li');
        li.className = 'tx-item ' + tx.type;
        const d = new Date(tx.dateISO);
        const dateStr = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

        li.innerHTML = `
      <div class="tx-row">
        <div class="tx-left">
          <div class="tx-cat">${tx.category}</div>
          <div class="tx-desc" title="${escapeHtml(tx.description)}">${truncate(tx.description, 80)}</div>
        </div>
        <div class="tx-amount">${fmt(tx.amount)}</div>
        <div class="tx-actions">
          <button onclick="deleteTransaction(${tx.id})">Delete</button>
        </div>
      </div>
      <div class="tx-date">${dateStr}</div>
    `;
        transactionsListEl.appendChild(li);
    });
}

// Utility: escape HTML for title attribute
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m]));
}

// Utility: truncate with ellipsis
function truncate(str, len) {
    if (str.length <= len) return str;
    return str.slice(0, len - 1) + '…';
}

// Clear form
function clearForm() {
    descEl.value = '';
    amountEl.value = '';
    dateEl.value = '';
}

// Render everything
function renderEverything() {
    renderMainSummary();
    renderMonthSummary();
    renderSixMonths();
    renderTransactionsList();
}

// Month navigation
prevMonthBtn.addEventListener('click', () => {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    renderEverything();
});
nextMonthBtn.addEventListener('click', () => {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    renderEverything();
});

// Save goal
saveGoalBtn.addEventListener('click', () => {
    const v = parseFloat(monthlyGoalInput.value);
    if (!isNaN(v) && v >= 0) {
        monthlyGoal = v;
        saveGoal();
        renderMonthSummary();
        alert('Monthly goal saved.');
    } else {
        alert('Enter a valid non-negative number for goal.');
    }
});

// Add transaction
addBtn.addEventListener('click', addTransaction);

// Search/filter listeners
filterEl.addEventListener('change', renderTransactionsList);
searchEl.addEventListener('input', renderTransactionsList);

// Theme toggle (persist)
(function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    if (saved === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️ Light';
    } else {
        themeToggle.textContent = '🌙 Dark';
    }
})();
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
});

// Load saved monthly goal into input
monthlyGoalInput.value = monthlyGoal ? monthlyGoal : '';

// Initial render
renderEverything();

// Expose deleteTransaction to global scope for inline onclick (simple approach)
window.deleteTransaction = deleteTransaction;