from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class UserType(str, Enum):
    ADMIN = "admin"
    PROFESSOR = "professor"

# ===== AUTENTICAÇÃO =====
class UserCreate(BaseModel):
    email: str
    nome: str
    senha: str
    tipo: UserType = UserType.PROFESSOR

class UserLogin(BaseModel):
    email: str
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario_tipo: str
    usuario_id: int

class UserResponse(BaseModel):
    id: int
    email: str
    nome: str
    tipo: UserType
    class Config:
        from_attributes = True

# ===== PROFESSOR =====
class ProfessorBase(BaseModel):
    nome: str
    email: Optional[str] = None

class ProfessorCreate(ProfessorBase):
    senha: str

class Professor(ProfessorBase):
    id: int
    user_tipo: Optional[str] = None
    class Config:
        from_attributes = True

# ===== TURNOS =====
class TurnoBase(BaseModel):
    nome: str
    hora_inicio: str
    hora_fim: str

class TurnoCreate(TurnoBase):
    pass

class Turno(TurnoBase):
    id: int
    class Config:
        from_attributes = True

# ===== DISCIPLINA =====
class SubjectBase(BaseModel):
    nome: str

class Subject(SubjectBase):
    id: int
    class Config:
        from_attributes = True

# ===== SALA =====
class ClassRoomBase(BaseModel):
    nome: str

class ClassRoom(ClassRoomBase):
    id: int
    class Config:
        from_attributes = True

# ===== TURMA =====
class SchoolClassBase(BaseModel):
    nome: str
    turno: str

class SchoolClass(SchoolClassBase):
    id: int
    class Config:
        from_attributes = True

# ===== DISCIPLINAS DO PROFESSOR =====
class ProfessorSubjectBase(BaseModel):
    subject_id: int
    class_id: int
    turno_id: int
    quantidade_aulas: int

class ProfessorSubjectCreate(BaseModel):
    subject_id: int
    class_id: int
    turno_id: int
    quantidade_aulas: int

class ProfessorSubject(ProfessorSubjectBase):
    id: int
    professor_id: int
    aulas_alocadas: int
    class Config:
        from_attributes = True

# ===== ALOCAÇÃO DE AULAS =====
class AllocationBase(BaseModel):
    professor_id: int
    subject_id: int
    class_id: int
    classroom_id: int
    turno_id: int
    dia_semana: int
    slot: int

class AllocationCreate(AllocationBase):
    professor_subject_id: int

class Allocation(AllocationBase):
    id: int
    professor_subject_id: int
    class Config:
        from_attributes = True
