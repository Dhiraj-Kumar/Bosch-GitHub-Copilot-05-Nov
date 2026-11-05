const API_BASE_URL = "http://localhost:8000/transactions";

// Mapping between frontend and backend field names
function mapFrontendToBackend(transaction) {
    return {
        description: transaction.description,
        amount: transaction.amount,
        dateoftransaction: transaction.date,
        transactiontype: transaction.type
    };
}

// Mapping between backend and frontend field names
function mapBackendToFrontend(backendTransaction) {
    return {
        id: String(backendTransaction.id),
        _originalId: backendTransaction.id,
        description: backendTransaction.description,
        amount: backendTransaction.amount,
        date: backendTransaction.dateoftransaction,
        type: backendTransaction.transactiontype
    };
}

// Fetch all transactions from the API
async function fetchAllTransactions() {
    try {
        console.log(`[API] GET ${API_BASE_URL}`);
        const response = await fetch(API_BASE_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log(`[API] Response status:`, response.status);

        if (!response.ok) {
            console.error("Failed to fetch transactions:", response.statusText);
            return [];
        }

        const data = await response.json();
        console.log(`[API] Fetched ${data.length || 0} transactions`);
        return Array.isArray(data) ? data.map(mapBackendToFrontend) : [];
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
}

// Add a new transaction to the API
async function addTransactionToAPI(transaction) {
    try {
        const backendData = mapFrontendToBackend(transaction);
        console.log(`[API] POST ${API_BASE_URL}`, backendData);

        const response = await fetch(API_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(backendData)
        });

        console.log(`[API] Response status:`, response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to add transaction:", response.statusText, errorText);
            return null;
        }

        const data = await response.json();
        console.log(`[API] Transaction created:`, data);
        return mapBackendToFrontend(data);
    } catch (error) {
        console.error("Error adding transaction:", error);
        return null;
    }
}

// Update a transaction in the API
async function updateTransactionInAPI(transactionId, transaction) {
    try {
        const backendData = mapFrontendToBackend(transaction);

        const response = await fetch(`${API_BASE_URL}/${transactionId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(backendData)
        });

        if (!response.ok) {
            console.error("Failed to update transaction:", response.statusText);
            return null;
        }

        const data = await response.json();
        return mapBackendToFrontend(data);
    } catch (error) {
        console.error("Error updating transaction:", error);
        return null;
    }
}

// Delete a transaction from the API
async function deleteTransactionFromAPI(transactionId) {
    try {
        console.log(`[API] DELETE ${API_BASE_URL}/${transactionId}`);
        const response = await fetch(`${API_BASE_URL}/${transactionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log(`[API] Response status:`, response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to delete transaction:", response.statusText, errorText);
            return false;
        }

        console.log(`[API] Transaction deleted:`, transactionId);
        return true;
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return false;
    }
}

// Check if API is available
async function isAPIAvailable() {
    try {
        console.log(`[API] Checking availability: GET ${API_BASE_URL}`);
        const response = await fetch(API_BASE_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const available = response.ok;
        console.log(`[API] Availability check result:`, available ? "AVAILABLE" : "NOT AVAILABLE");
        return available;
    } catch (error) {
        console.warn("API is not available:", error.message);
        return false;
    }
}
