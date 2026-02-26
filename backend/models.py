from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Time, Enum, Boolean
from sqlalchemy.orm import relationship
import enum
from database import Base, engine, SessionLocal

class UserType(str, enum.Enum):
    ADMIN = "admin"
    PROFESSOR = "professor"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    nome = Column(String, index=True)
    tipo = Column(Enum(UserType), default=UserType.PROFESSOR)
    ativo = Column(Boolean, default=True)

class Professor(Base):
    __tablename__ = "professors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    nome = Column(String, index=True)
    # Email removido - usar User.email via relationship

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)

class ClassRoom(Base):
    __tablename__ = "classrooms"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)

class SchoolClass(Base):
    __tablename__ = "school_classes"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    turno = Column(String) # Matutino, Vespertino

class Turno(Base):
    __tablename__ = "turnos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)  # Ex: "Matutino", "Vespertino"
    hora_inicio = Column(String)  # Ex: "07:00"
    hora_fim = Column(String)     # Ex: "12:00"

class ProfessorSubject(Base):
    __tablename__ = "professor_subjects"
    id = Column(Integer, primary_key=True, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    class_id = Column(Integer, ForeignKey("school_classes.id"))
    turno_id = Column(Integer, ForeignKey("turnos.id"))
    quantidade_aulas = Column(Integer)  # Quantidade total de aulas para essa disciplina
    aulas_alocadas = Column(Integer, default=0)  # Quantidade de aulas já alocadas
    
    __table_args__ = (
        UniqueConstraint('professor_id', 'subject_id', 'class_id', 'turno_id', name='_prof_subject_uc'),
    )

class Allocation(Base):
    __tablename__ = "allocations"
    id = Column(Integer, primary_key=True, index=True)
    professor_subject_id = Column(Integer, ForeignKey("professor_subjects.id"))
    professor_id = Column(Integer, ForeignKey("professors.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    class_id = Column(Integer, ForeignKey("school_classes.id"))
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    turno_id = Column(Integer, ForeignKey("turnos.id"))
    dia_semana = Column(Integer) # 0-4 (Seg-Sex)
    slot = Column(Integer) # 0-5 (6 aulas)

    __table_args__ = (
        # Registro Único: Turma não pode ter duas aulas no mesmo horário/dia/turno
        UniqueConstraint('class_id', 'dia_semana', 'slot', 'turno_id', name='_class_schedule_uc'),
        # Registro Único: Professor não pode estar em dois lugares no mesmo horário/dia/turno
        UniqueConstraint('professor_id', 'dia_semana', 'slot', 'turno_id', name='_professor_schedule_uc'),
    )

# Base.metadata.create_all(bind=engine) - Movido para main.py para controle centralizado
