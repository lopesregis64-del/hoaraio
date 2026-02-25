"""
Script para popular o banco de dados com dados de teste
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import auth

def seed_database():
    # Criar tabelas
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Criar usuário admin
    try:
        admin = db.query(models.User).filter(models.User.email == "admin@test.com").first()
        if not admin:
            admin = models.User(
                email="admin@test.com",
                nome="Administrador",
                senha_hash=auth.gerar_hash_senha("123456"),
                tipo=models.UserType.ADMIN,
                ativo=True
            )
            db.add(admin)
            db.flush()
            print("✓ Usuário Admin criado: admin@test.com / 123456")
        else:
            print("✓ Usuário Admin já existe: admin@test.com / 123456")
    except Exception as e:
        print(f"✗ Erro ao criar admin: {e}")
        db.rollback()
    
    # Criar usuário professor
    try:
        professor = db.query(models.User).filter(models.User.email == "prof@test.com").first()
        if not professor:
            professor = models.User(
                email="prof@test.com",
                nome="Professor Teste",
                senha_hash=auth.gerar_hash_senha("123456"),
                tipo=models.UserType.PROFESSOR,
                ativo=True
            )
            db.add(professor)
            db.flush()
            print("✓ Usuário Professor criado: prof@test.com / 123456")
        else:
            print("✓ Usuário Professor já existe: prof@test.com / 123456")
    except Exception as e:
        print(f"✗ Erro ao criar professor: {e}")
        db.rollback()
    
    # Criar turnos
    turnos_data = [
        {"nome": "Matutino", "hora_inicio": "07:00", "hora_fim": "12:00"},
        {"nome": "Vespertino", "hora_inicio": "13:00", "hora_fim": "18:00"},
        {"nome": "Noturno", "hora_inicio": "19:00", "hora_fim": "22:00"},
    ]
    
    turnos = []
    for turno_data in turnos_data:
        try:
            turno = db.query(models.Turno).filter(models.Turno.nome == turno_data["nome"]).first()
            if not turno:
                turno = models.Turno(**turno_data)
                db.add(turno)
                db.flush()
                print(f"✓ Turno criado: {turno_data['nome']}")
            else:
                print(f"✓ Turno já existe: {turno_data['nome']}")
            turnos.append(turno)
        except Exception as e:
            print(f"✗ Erro ao criar turno: {e}")
            db.rollback()
    
    # Criar disciplinas
    disciplinas_data = [
        "Matemática",
        "Português",
        "História",
        "Geografia",
        "Ciências",
        "Inglês",
        "Educação Física",
        "Artes",
    ]
    
    disciplinas = []
    for nome in disciplinas_data:
        try:
            disciplina = db.query(models.Subject).filter(models.Subject.nome == nome).first()
            if not disciplina:
                disciplina = models.Subject(nome=nome)
                db.add(disciplina)
                db.flush()
                print(f"✓ Disciplina criada: {nome}")
            else:
                print(f"✓ Disciplina já existe: {nome}")
            disciplinas.append(disciplina)
        except Exception as e:
            print(f"✗ Erro ao criar disciplina: {e}")
            db.rollback()
    
    # Criar turmas
    turmas_data = [
        {"nome": "1º Ano A", "turno": "Matutino"},
        {"nome": "1º Ano B", "turno": "Matutino"},
        {"nome": "2º Ano A", "turno": "Vespertino"},
        {"nome": "2º Ano B", "turno": "Vespertino"},
        {"nome": "3º Ano A", "turno": "Noturno"},
        {"nome": "3º Ano B", "turno": "Noturno"},
    ]
    
    turmas = []
    for turma_data in turmas_data:
        try:
            turma = db.query(models.SchoolClass).filter(models.SchoolClass.nome == turma_data["nome"]).first()
            if not turma:
                turma = models.SchoolClass(**turma_data)
                db.add(turma)
                db.flush()
                print(f"✓ Turma criada: {turma_data['nome']} ({turma_data['turno']})")
            else:
                print(f"✓ Turma já existe: {turma_data['nome']} ({turma_data['turno']})")
            turmas.append(turma)
        except Exception as e:
            print(f"✗ Erro ao criar turma: {e}")
            db.rollback()
    
    db.commit()
    print("\n✓ Banco de dados populado/verificado com sucesso!")
    db.close()

if __name__ == "__main__":
    seed_database()
