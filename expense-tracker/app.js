const STORAGE_KEY = "expense-tracker-transactions-v1";
const SETTINGS_KEY = "expense-tracker-settings-v1";

const form = document.querySelector("#transaction-form");
const list = document.querySelector("#transaction-list");
const dateInput = document.querySelector("#transaction-date");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const typeInput = document.querySelector("#transaction-type");
const currencyInput = document.querySelector("#input-currency");
const themeButton = document.querySelector(".theme-toggle");
const currencyButtons = document.querySelectorAll(".currency-option");
const logoutButton = document.querySelector(".logout-button");

let transactions = [];
let settings = loadSettings();
let useAPI = false;

function loadTransactions() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter(isValidTransaction) : [];
    } catch {
        return [];
    }
}

async function loadTransactionsFromAPI() {
    const apiTransactions = await fetchAllTransactions();
    if (apiTransactions.length > 0) {
        transactions = apiTransactions;
        useAPI = true;
        saveTransactions();
        return transactions;
    } else {
        transactions = [];
        useAPI = true;
        return [];
    }
}

function isValidTransaction(item) {
    return item && typeof item.id === "string" && typeof item.description === "string" &&
        Number.isFinite(item.amount) && item.amount > 0 &&
        (item.type === "income" || item.type === "expense") && typeof item.date === "string";
}

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        return {
            currency: saved.currency === "INR" ? "INR" : "USD",
            theme: saved.theme === "dark" ? "dark" : "light"
        };
    } catch {
        return { currency: "USD", theme: "light" };
    }
}

function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat(settings.currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: settings.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
        .format(new Date(year, month - 1, day));
}

function renderSummary() {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    document.querySelector("#income-total").textContent = formatCurrency(income);
    document.querySelector("#expense-total").textContent = formatCurrency(expense);
    document.querySelector("#balance-total").textContent = formatCurrency(income - expense);
    document.querySelector("#transaction-count").textContent = transactions.length;
}

function createTransactionRow(transaction) {
    const row = document.createElement("article");
    row.className = `transaction-row ${transaction.type}`;

    const main = document.createElement("div");
    main.className = "transaction-main";
    const symbol = document.createElement("span");
    symbol.className = "transaction-symbol";
    const symbolIcon = document.createElement("i");
    symbolIcon.className = transaction.type === "income" ? "fa-solid fa-arrow-down" : "fa-solid fa-arrow-up";
    symbolIcon.setAttribute("aria-hidden", "true");
    symbol.append(symbolIcon);

    const details = document.createElement("div");
    details.className = "transaction-details";
    const description = document.createElement("p");
    description.className = "transaction-description";
    description.textContent = transaction.description;
    const date = document.createElement("p");
    date.className = "transaction-date";
    const calendarIcon = document.createElement("i");
    calendarIcon.className = "fa-regular fa-calendar";
    calendarIcon.setAttribute("aria-hidden", "true");
    date.append(calendarIcon, document.createTextNode(formatDate(transaction.date)));
    details.append(description, date);
    main.append(symbol, details);

    const amount = document.createElement("span");
    amount.className = "transaction-amount";
    amount.textContent = `${transaction.type === "income" ? "+" : "−"}${formatCurrency(transaction.amount)}`;

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.setAttribute("aria-label", `Delete ${transaction.description}`);
    remove.title = "Delete transaction";
    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fa-regular fa-trash-can";
    deleteIcon.setAttribute("aria-hidden", "true");
    remove.append(deleteIcon);
    remove.addEventListener("click", async () => {
        const transactionId = transaction._originalId || transaction.id;
        if (useAPI) {
            const success = await deleteTransactionFromAPI(transactionId);
            if (success) {
                transactions = transactions.filter((item) => item.id !== transaction.id);
                saveTransactions();
                render();
            } else {
                console.error("Failed to delete transaction from API");
            }
        } else {
            transactions = transactions.filter((item) => item.id !== transaction.id);
            saveTransactions();
            render();
        }
    });

    row.append(main, amount, remove);
    return row;
}

function renderTransactions() {
    list.replaceChildren();
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    if (sorted.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        const icon = document.createElement("span");
        icon.className = "empty-icon";
        const chartIcon = document.createElement("i");
        chartIcon.className = "fa-solid fa-receipt";
        chartIcon.setAttribute("aria-hidden", "true");
        icon.append(chartIcon);
        const title = document.createElement("p");
        title.className = "empty-title";
        title.textContent = "Nothing here yet";
        const hint = document.createElement("p");
        hint.textContent = "Add your first transaction above to get started.";
        empty.append(icon, title, hint);
        list.append(empty);
        return;
    }

    sorted.forEach((transaction) => list.append(createTransactionRow(transaction)));
}

function applySettings() {
    document.body.dataset.theme = settings.theme;
    const darkMode = settings.theme === "dark";
    themeButton.setAttribute("aria-label", darkMode ? "Switch to light theme" : "Switch to dark theme");
    themeButton.innerHTML = `<i class="fa-regular ${darkMode ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
    currencyInput.textContent = settings.currency === "INR" ? "₹" : "$";
    currencyButtons.forEach((button) => {
        const active = button.dataset.currency === settings.currency;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function render() {
    renderSummary();
    renderTransactions();
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const newTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: descriptionInput.value.trim(),
        amount,
        date: dateInput.value,
        type: typeInput.value
    };

    console.log(`[APP] Form submitted. useAPI = ${useAPI}`);
    console.log(`[APP] New transaction:`, newTransaction);

    if (useAPI) {
        console.log(`[APP] Sending to API...`);
        const result = await addTransactionToAPI(newTransaction);
        if (result) {
            console.log(`[APP] API returned:`, result);
            transactions.push(result);
            saveTransactions();
            render();
        } else {
            console.error("Failed to add transaction to API - result is null");
            alert("Failed to add transaction to API");
        }
    } else {
        console.log(`[APP] Using localStorage...`);
        transactions.push(newTransaction);
        saveTransactions();
        render();
    }

    form.reset();
    dateInput.value = getLocalDate();
    descriptionInput.focus();
});

themeButton.addEventListener("click", () => {
    settings.theme = settings.theme === "light" ? "dark" : "light";
    saveSettings();
    applySettings();
});

currencyButtons.forEach((button) => button.addEventListener("click", () => {
    settings.currency = button.dataset.currency;
    saveSettings();
    applySettings();
    render();
}));

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("expense-tracker-auth");
    window.location.replace("login.html");
});

function getLocalDate() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

let expenseIncomeChart = null;
let monthlyExpenseChart = null;

function getMonthlyExpenses() {
    const monthlyData = {};

    transactions.forEach((transaction) => {
        if (transaction.type === "expense") {
            const [year, month] = transaction.date.split("-");
            const monthKey = `${year}-${month}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + transaction.amount;
        }
    });

    return monthlyData;
}

function initExpenseIncomeChart() {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

    const ctx = document.getElementById("expenseIncomeChart").getContext("2d");

    if (expenseIncomeChart) {
        expenseIncomeChart.destroy();
    }

    const chartColors = settings.theme === "dark" ? {
        income: "#43ad7d",
        expense: "#e1847c"
    } : {
        income: "#187b5a",
        expense: "#bd5b55"
    };

    expenseIncomeChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                data: [income, expense],
                backgroundColor: [chartColors.income, chartColors.expense],
                borderColor: settings.theme === "dark" ? "#202c28" : "#ffffff",
                borderWidth: 2,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: settings.theme === "dark" ? "#314039" : "rgba(0,0,0,0.8)",
                    padding: 10,
                    titleFont: { size: 12, weight: "bold" },
                    bodyFont: { size: 11 },
                    callbacks: {
                        label: function (context) {
                            return formatCurrency(context.parsed);
                        }
                    }
                }
            }
        }
    });

    updateLegend(income, expense);
}

function updateLegend(income, expense) {
    const legendContainer = document.getElementById("expenseIncomeChartLegend");
    const total = income + expense;

    const chartColors = settings.theme === "dark" ? {
        income: "#43ad7d",
        expense: "#e1847c"
    } : {
        income: "#187b5a",
        expense: "#bd5b55"
    };

    legendContainer.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${chartColors.income}"></div>
            <div class="legend-label">
                <span class="legend-name">Income</span>
                <span class="legend-amount">${formatCurrency(income)} (${total > 0 ? Math.round((income / total) * 100) : 0}%)</span>
            </div>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${chartColors.expense}"></div>
            <div class="legend-label">
                <span class="legend-name">Expenses</span>
                <span class="legend-amount">${formatCurrency(expense)} (${total > 0 ? Math.round((expense / total) * 100) : 0}%)</span>
            </div>
        </div>
    `;
}

function initMonthlyExpenseChart() {
    const monthlyData = getMonthlyExpenses();
    const sortedMonths = Object.keys(monthlyData).sort();

    if (sortedMonths.length === 0) {
        const ctx = document.getElementById("monthlyExpenseChart").getContext("2d");
        if (monthlyExpenseChart) {
            monthlyExpenseChart.destroy();
        }
        monthlyExpenseChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
        return;
    }

    const labels = sortedMonths.map((month) => {
        const [year, monthNum] = month.split("-");
        const date = new Date(year, monthNum - 1);
        return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" }).format(date);
    });

    const data = sortedMonths.map((month) => monthlyData[month]);

    const ctx = document.getElementById("monthlyExpenseChart").getContext("2d");

    if (monthlyExpenseChart) {
        monthlyExpenseChart.destroy();
    }

    const chartColor = settings.theme === "dark" ? "#43ad7d" : "#187b5a";
    const gridColor = settings.theme === "dark" ? "#314039" : "#e8eeeb";
    const textColor = settings.theme === "dark" ? "#e8efeb" : "#172521";

    monthlyExpenseChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Monthly Expenses",
                data: data,
                borderColor: chartColor,
                backgroundColor: settings.theme === "dark" ? "rgba(67, 173, 125, 0.1)" : "rgba(24, 123, 90, 0.1)",
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: chartColor,
                pointBorderColor: settings.theme === "dark" ? "#202c28" : "#ffffff",
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: textColor,
                        font: { size: 12, weight: "600" },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: settings.theme === "dark" ? "#314039" : "rgba(0,0,0,0.8)",
                    padding: 10,
                    titleFont: { size: 12, weight: "bold" },
                    bodyFont: { size: 11 },
                    callbacks: {
                        label: function (context) {
                            return "Expenses: " + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 11 },
                        callback: function (value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

function renderCharts() {
    initExpenseIncomeChart();
    initMonthlyExpenseChart();
}

// Tab Navigation
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll("[role='tabpanel']");

tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const tabName = button.dataset.tab;

        tabButtons.forEach((btn) => {
            btn.classList.remove("is-active");
            btn.setAttribute("aria-selected", "false");
        });

        tabPanels.forEach((panel) => {
            panel.hidden = true;
        });

        button.classList.add("is-active");
        button.setAttribute("aria-selected", "true");

        const activePanel = document.getElementById(tabName + "-tab");
        if (activePanel) {
            activePanel.hidden = false;
            if (tabName === "charts") {
                setTimeout(() => renderCharts(), 100);
            }
        }
    });
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric"
}).format(new Date());
dateInput.value = getLocalDate();
dateInput.max = getLocalDate();
applySettings();

// Initialize: Try to load from API, fallback to localStorage
(async () => {
    console.log(`[APP] Initializing application...`);
    const apiAvailable = await isAPIAvailable();
    console.log(`[APP] API Available: ${apiAvailable}`);
    
    if (apiAvailable) {
        console.log(`[APP] Loading transactions from API...`);
        await loadTransactionsFromAPI();
        console.log(`[APP] useAPI flag set to: ${useAPI}`);
    } else {
        console.log("API not available, using localStorage");
        transactions = loadTransactions();
        useAPI = false;
    }
    console.log(`[APP] Loaded ${transactions.length} transactions`);
    render();
})();