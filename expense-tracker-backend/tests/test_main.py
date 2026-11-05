import sqlite3
from pathlib import Path

import pytest

import main
from main import initialize_database


@pytest.fixture
def temp_db_path(tmp_path, monkeypatch):
    db_path = tmp_path / "test_expenses.db"
    monkeypatch.setattr(main, "DATABASE_PATH", db_path)
    yield db_path


def test_initialize_database_creates_file(temp_db_path: Path):
    assert not temp_db_path.exists()
    initialize_database()
    assert temp_db_path.exists()


def test_initialize_database_creates_expenses_table(temp_db_path: Path):
    initialize_database()
    connection = sqlite3.connect(temp_db_path)
    try:
        cursor = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'"
        )
        result = cursor.fetchone()
    finally:
        connection.close()
    assert result is not None
    assert result[0] == "expenses"


def test_initialize_database_table_has_expected_columns(temp_db_path: Path):
    initialize_database()
    connection = sqlite3.connect(temp_db_path)
    try:
        cursor = connection.execute("PRAGMA table_info(expenses)")
        columns = {row[1] for row in cursor.fetchall()}
    finally:
        connection.close()
    expected_columns = {
        "id",
        "description",
        "amount",
        "dateoftransaction",
        "transactiontype",
    }
    assert columns == expected_columns


def test_initialize_database_table_is_empty(temp_db_path: Path):
    initialize_database()
    connection = sqlite3.connect(temp_db_path)
    try:
        cursor = connection.execute("SELECT COUNT(*) FROM expenses")
        count = cursor.fetchone()[0]
    finally:
        connection.close()
    assert count == 0


def test_initialize_database_is_idempotent(temp_db_path: Path):
    initialize_database()
    initialize_database()  # Should not raise or duplicate table

    connection = sqlite3.connect(temp_db_path)
    try:
        cursor = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'"
        )
        tables = cursor.fetchall()
    finally:
        connection.close()
    assert len(tables) == 1


def test_initialize_database_preserves_existing_data(temp_db_path: Path):
    initialize_database()

    with main.get_connection() as connection:
        connection.execute(
            """
            INSERT INTO expenses (description, amount, dateoftransaction, transactiontype)
            VALUES (?, ?, ?, ?)
            """,
            ("Groceries", 42.50, "2024-01-15", "expense"),
        )

    # Calling initialize_database again should not wipe existing data
    initialize_database()

    connection = sqlite3.connect(temp_db_path)
    try:
        cursor = connection.execute("SELECT COUNT(*) FROM expenses")
        count = cursor.fetchone()[0]
    finally:
        connection.close()
    assert count == 1


def test_initialize_database_id_column_is_primary_key(temp_db_path: Path):
    initialize_database()
    connection = sqlite3.connect(temp_db_path)
    try:
        cursor = connection.execute("PRAGMA table_info(expenses)")
        id_column = next(row for row in cursor.fetchall() if row[1] == "id")
    finally:
        connection.close()
    # pk column index (6th field in PRAGMA table_info output) should be 1
    assert id_column[5] == 1
