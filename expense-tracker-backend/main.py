import os
import sqlite3
from contextlib import asynccontextmanager, contextmanager
from datetime import date
from pathlib import Path
from typing import Iterator

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


DATABASE_PATH = Path(
    os.environ.get("EXPENSE_DB_PATH", Path(__file__).with_name("expenses.db"))
)


class Expense(BaseModel):
    id: int
    description: str
    amount: float
    dateoftransaction: date
    transactiontype: str


class ExpenseCreate(BaseModel):
    description: str
    amount: float
    dateoftransaction: date
    transactiontype: str


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                dateoftransaction TEXT NOT NULL,
                transactiontype TEXT NOT NULL
            )
            """
        )


@asynccontextmanager
async def lifespan(_: FastAPI) -> Iterator[None]:
    initialize_database()
    yield


app = FastAPI(title="Expense Tracker API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/transactions",
    response_model=Expense,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(expense: ExpenseCreate) -> Expense:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO expenses (description, amount, dateoftransaction, transactiontype)
            VALUES (?, ?, ?, ?)
            """,
            (
                expense.description,
                expense.amount,
                expense.dateoftransaction.isoformat(),
                expense.transactiontype,
            ),
        )
        row = connection.execute(
            "SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return Expense(**dict(row))


@app.get("/transactions", response_model=list[Expense])
def list_transactions() -> list[Expense]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM expenses ORDER BY dateoftransaction DESC, id DESC"
        ).fetchall()
    return [Expense(**dict(row)) for row in rows]


@app.get("/transactions/{transaction_id}", response_model=Expense)
def get_transaction(transaction_id: int) -> Expense:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM expenses WHERE id = ?", (transaction_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Expense(**dict(row))


@app.put("/transactions/{transaction_id}", response_model=Expense)
def update_transaction(transaction_id: int, expense: ExpenseCreate) -> Expense:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE expenses
            SET description = ?, amount = ?, dateoftransaction = ?, transactiontype = ?
            WHERE id = ?
            """,
            (
                expense.description,
                expense.amount,
                expense.dateoftransaction.isoformat(),
                expense.transactiontype,
                transaction_id,
            ),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404, detail="Transaction not found")
        row = connection.execute(
            "SELECT * FROM expenses WHERE id = ?", (transaction_id,)
        ).fetchone()
    return Expense(**dict(row))


@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int) -> Response:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM expenses WHERE id = ?", (transaction_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404, detail="Transaction not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
