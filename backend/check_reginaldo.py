import sqlite3

def check_reginaldo_allocations():
    conn = sqlite3.connect('c:/projetos/horario/backend/app.db')
    cursor = conn.cursor()
    
    # 1. Encontrar o professor Reginaldo
    cursor.execute("SELECT id, nome FROM professors WHERE nome LIKE '%Reginaldo%'")
    professors = cursor.fetchall()
    print("Professores encontrados:", professors)
    
    if not professors:
        print("Nenhum professor encontrado.")
        return

    for prof_id, prof_nome in professors:
        print(f"\nAlocações para {prof_nome} (ID: {prof_id}):")
        cursor.execute("""
            SELECT a.id, a.dia_semana, a.slot, a.turno_id, a.class_id, s.nome
            FROM allocations a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.professor_id = ?
        """, (prof_id,))
        allocs = cursor.fetchall()
        for al in allocs:
            print(f"  ID: {al[0]}, Dia: {al[1]}, Slot: {al[2]}, Turno: {al[3]}, Turma ID: {al[4]}, Disciplina: {al[5]}")
    
    conn.close()

if __name__ == "__main__":
    check_reginaldo_allocations()
