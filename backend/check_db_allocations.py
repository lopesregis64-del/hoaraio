import sqlite3
import pandas as pd

def check_allocations():
    conn = sqlite3.connect('c:/projetos/horario/backend/app.db')
    query = """
    SELECT a.id, a.dia_semana, a.slot, a.turno_id, a.professor_id, a.class_id, p.nome as professor_nome, s.nome as subject_nome
    FROM allocations a
    JOIN professors p ON a.professor_id = p.id
    JOIN subjects s ON a.subject_id = s.id
    """
    df = pd.read_sql_query(query, conn)
    print(df.to_string())
    conn.close()

if __name__ == "__main__":
    check_allocations()
