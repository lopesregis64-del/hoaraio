import sqlite3
import sys

try:
    print("Tentando conexão com app.db...")
    conn = sqlite3.connect('app.db', timeout=5)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Conexão bem-sucedida! Tabelas: {tables}")
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"Erro ao conectar: {e}")
    sys.exit(1)
