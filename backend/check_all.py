import sqlite3

def check_all_allocations():
    conn = sqlite3.connect('c:/projetos/horario/backend/app.db')
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.dia_semana, a.slot, a.turno_id, a.professor_id, a.class_id, s.nome
        FROM allocations a
        JOIN subjects s ON a.subject_id = s.id
    """)
    allocs = cursor.fetchall()
    print("Todas as Alocações:")
    for al in allocs:
        print(f"ID:{al[0]} | Dia:{al[1]} | Slot:{al[2]} | Turno:{al[3]} | Prof:{al[4]} | Turma:{al[5]} | Subject:{al[6]}")
    conn.close()

if __name__ == "__main__":
    check_all_allocations()
