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

let transactions = loadTransactions();
let settings = loadSettings();

function loadTransactions() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter(isValidTransaction) : [];
    } catch {
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
    remove.addEventListener("click", () => {
        transactions = transactions.filter((item) => item.id !== transaction.id);
        saveTransactions();
        render();
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

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) return;

    transactions.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: descriptionInput.value.trim(),
        amount,
        date: dateInput.value,
        type: typeInput.value
    });
    saveTransactions();
    render();
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

function getLocalDate() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric"
}).format(new Date());
dateInput.value = getLocalDate();
dateInput.max = getLocalDate();
applySettings();
render();