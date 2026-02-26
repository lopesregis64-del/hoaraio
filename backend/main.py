from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from typing import List
from datetime import timedelta
import models, schemas, database, websocket_manager, auth, csv, io, os
from database import engine, get_db
from websocket_manager import manager

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Horários API")

# Configuração de CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
]

# Adiciona origin do Render se estiver configurada
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    # Suporta múltiplos origens separados por vírgula e remove barras no final para evitar erro de match
    extra_origins = [o.strip().rstrip("/") for o in cors_origins_env.split(",") if o.strip()]
    origins.extend(extra_origins)

print(f"CORS Origins configuradas: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API de Horários está rodando"}

# ===== AUTENTICAÇÃO =====
@app.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Criar novo usuário"""
    print(f"Tentativa de cadastro: {user.email} - tipo: {user.tipo}")
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        print(f"Erro: Email {user.email} já existe no banco.")
        raise HTTPException(status_code=400, detail="Email já registrado")
    
    try:
        hashed_password = auth.gerar_hash_senha(user.senha)
        db_user = models.User(
            email=user.email,
            nome=user.nome,
            senha_hash=hashed_password,
            tipo=user.tipo
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"Usuário {user.email} criado com sucesso (ID: {db_user.id})")
        return db_user
    except Exception as e:
        print(f"Erro inesperado no signup: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno no servidor: {str(e)}")

@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login - retorna JWT token"""
    db_user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not db_user or not auth.verificar_senha(form_data.password, db_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.criar_token_acesso(
        data={"sub": db_user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario_tipo": db_user.tipo.value,
        "usuario_id": db_user.id
    }

@app.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(auth.obter_usuario_atual)):
    """Obter usuário atual autenticado"""
    return current_user

@app.get("/professor/me", response_model=schemas.Professor)
async def get_professor_atual(
    current_user: models.User = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db)
):
    """Obter dados do professor autenticado ou Admin (vincular ao registro Professor)"""
    if current_user.tipo not in [models.UserType.PROFESSOR, models.UserType.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado"
        )
    
    # Buscar o professor associado ao user_id
    professor = db.query(models.Professor).filter(
        models.Professor.user_id == current_user.id
    ).first()
    
    if not professor:
        # Criar se não existir
        professor = models.Professor(
            user_id=current_user.id,
            nome=current_user.nome
        )
        db.add(professor)
        db.commit()
        db.refresh(professor)
    
    professor.user_tipo = current_user.tipo.value
    return professor

# ===== ADMIN ENDPOINTS =====

# --- TURNOS ---
@app.post("/admin/turnos", response_model=schemas.Turno)
async def create_turno(
    turno: schemas.TurnoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Criar novo turno (apenas admin)"""
    db_turno = db.query(models.Turno).filter(models.Turno.nome == turno.nome).first()
    if db_turno:
        raise HTTPException(status_code=400, detail="Turno já existe")
    
    db_turno = models.Turno(**turno.dict())
    db.add(db_turno)
    db.commit()
    db.refresh(db_turno)
    return db_turno

@app.get("/admin/turnos", response_model=List[schemas.Turno])
async def read_turnos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Listar todos os turnos (apenas admin)"""
    return db.query(models.Turno).all()

@app.delete("/admin/turnos/{turno_id}")
async def delete_turno(
    turno_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Excluir turno (apenas admin)"""
    db_turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno não encontrado")
    
    # Limpeza em cascata
    db.query(models.Allocation).filter(models.Allocation.turno_id == turno_id).delete()
    db.query(models.ProfessorSubject).filter(models.ProfessorSubject.turno_id == turno_id).delete()
    
    db.delete(db_turno)
    db.commit()
    return {"message": "Turno excluído com sucesso"}

# --- PROFESSORES ---
@app.post("/admin/professors", response_model=schemas.UserResponse)
async def create_professor(
    professor: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Criar novo professor (apenas admin)"""
    professor.tipo = schemas.UserType.PROFESSOR
    db_user = db.query(models.User).filter(models.User.email == professor.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já registrado")
    
    hashed_password = auth.gerar_hash_senha(professor.senha)
    db_user = models.User(
        email=professor.email,
        nome=professor.nome,
        senha_hash=hashed_password,
        tipo=models.UserType.PROFESSOR
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/admin/professors", response_model=List[schemas.UserWithStats])
async def read_professors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Listar todos os professores com estatísticas de aulas (apenas admin)"""
    users = db.query(models.User).filter(models.User.tipo == models.UserType.PROFESSOR).all()
    
    results = []
    for user in users:
        # Buscar registro de professor
        professor = db.query(models.Professor).filter(models.Professor.user_id == user.id).first()
        
        total = 0
        alocadas = 0
        
        if professor:
            # Somar aulas das disciplinas vinculadas
            stats = db.query(
                sa_func.sum(models.ProfessorSubject.quantidade_aulas).label("total"),
                sa_func.sum(models.ProfessorSubject.aulas_alocadas).label("alocadas")
            ).filter(models.ProfessorSubject.professor_id == professor.id).first()
            
            total = stats.total if stats and stats.total else 0
            alocadas = stats.alocadas if stats and stats.alocadas else 0
            
        results.append({
            "id": user.id,
            "email": user.email,
            "nome": user.nome,
            "tipo": user.tipo,
            "total_aulas": total,
            "aulas_alocadas": alocadas
        })
        
    return results

@app.delete("/admin/professors/{professor_id}")
async def delete_professor(
    professor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Excluir professor (apenas admin)"""
    db_user = db.query(models.User).filter(models.User.id == professor_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db_prof = db.query(models.Professor).filter(models.Professor.user_id == db_user.id).first()
    if db_prof:
        # Limpeza em cascata baseada no professor_id
        db.query(models.Allocation).filter(models.Allocation.professor_id == db_prof.id).delete()
        db.query(models.ProfessorSubject).filter(models.ProfessorSubject.professor_id == db_prof.id).delete()
        db.delete(db_prof)
    
    db.delete(db_user)
    db.commit()
    return {"message": "Professor excluído com sucesso"}

@app.post("/admin/professors/import")
async def import_professors(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Importar professores via CSV (nome;email;senha)"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um CSV")
    
    contentArr = await file.read()
    try:
        content = contentArr.decode('utf-8')
    except UnicodeDecodeError:
        content = contentArr.decode('latin-1')
        
    reader = csv.reader(io.StringIO(content), delimiter=';')
    
    sucessos = 0
    erros = []
    
    for row in reader:
        if not row or len(row) < 3:
            continue
        
        nome, email, senha = row[0].strip(), row[1].strip(), row[2].strip()
        
        # Pular cabeçalho se existir
        if nome.lower() == 'nome' and email.lower() == 'email':
            continue
            
        # Verificar duplicata
        db_user = db.query(models.User).filter(models.User.email == email).first()
        if db_user:
            erros.append(f"Email {email} já registrado")
            continue
            
        try:
            hashed_password = auth.gerar_hash_senha(senha)
            new_user = models.User(
                email=email,
                nome=nome,
                senha_hash=hashed_password,
                tipo=models.UserType.PROFESSOR
            )
            db.add(new_user)
            db.flush() # Para gerar o ID
            
            new_prof = models.Professor(
                user_id=new_user.id,
                nome=nome
            )
            db.add(new_prof)
            sucessos += 1
        except Exception as e:
            db.rollback()
            erros.append(f"Erro ao importar {email}: {str(e)}")
    
    db.commit()
    return {"sucessos": sucessos, "erros": erros}

@app.post("/admin/professors/import-full")
async def import_professors_full(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Importar completo via CSV (nome_prof;email_prof;senha_prof;turma;disciplina;turno;qtd_aulas)"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um CSV")
    
    contentArr = await file.read()
    try:
        content = contentArr.decode('utf-8')
    except UnicodeDecodeError:
        content = contentArr.decode('latin-1')
        
    reader = csv.reader(io.StringIO(content), delimiter=';')
    
    sucessos = 0
    erros = []
    
    for idx, row in enumerate(reader):
        if not row or len(row) < 7:
            continue
        
        # Pular cabeçalho se detectado na primeira linha
        if idx == 0 and ("nome" in row[0].lower() or "professor" in row[0].lower()):
            continue
            
        try:
            n_prof, e_prof, s_prof, n_turma, n_sub, n_turno, q_aulas = [s.strip() for s in row[:7]]
            
            # 1. Garantir Turno
            db_turno = db.query(models.Turno).filter(models.Turno.nome.ilike(n_turno)).first()
            if not db_turno:
                db_turno = models.Turno(nome=n_turno, hora_inicio="07:00", hora_fim="12:00")
                db.add(db_turno)
                db.flush()
            
            # 2. Garantir Usuário/Professor
            db_user = db.query(models.User).filter(models.User.email == e_prof).first()
            if not db_user:
                hashed_pw = auth.gerar_hash_senha(s_prof)
                db_user = models.User(email=e_prof, nome=n_prof, senha_hash=hashed_pw, tipo=models.UserType.PROFESSOR)
                db.add(db_user)
                db.flush()
            
            db_prof = db.query(models.Professor).filter(models.Professor.user_id == db_user.id).first()
            if not db_prof:
                db_prof = models.Professor(user_id=db_user.id, nome=n_prof)
                db.add(db_prof)
                db.flush()
            
            # 3. Garantir Disciplina
            db_sub = db.query(models.Subject).filter(models.Subject.nome.ilike(n_sub)).first()
            if not db_sub:
                db_sub = models.Subject(nome=n_sub)
                db.add(db_sub)
                db.flush()
                
            # 4. Garantir Turma (vinculada ao turno)
            db_class = db.query(models.SchoolClass).filter(
                models.SchoolClass.nome.ilike(n_turma), 
                models.SchoolClass.turno == db_turno.nome
            ).first()
            if not db_class:
                db_class = models.SchoolClass(nome=n_turma, turno=db_turno.nome)
                db.add(db_class)
                db.flush()
                
            # 5. Criar ProfessorSubject
            existing_ps = db.query(models.ProfessorSubject).filter(
                models.ProfessorSubject.professor_id == db_prof.id,
                models.ProfessorSubject.subject_id == db_sub.id,
                models.ProfessorSubject.class_id == db_class.id,
                models.ProfessorSubject.turno_id == db_turno.id
            ).first()
            
            if not existing_ps:
                new_ps = models.ProfessorSubject(
                    professor_id=db_prof.id,
                    subject_id=db_sub.id,
                    class_id=db_class.id,
                    turno_id=db_turno.id,
                    quantidade_aulas=int(q_aulas)
                )
                db.add(new_ps)
            else:
                existing_ps.quantidade_aulas = int(q_aulas) # Atualiza se já existir
                
            sucessos += 1
            db.commit()
        except Exception as e:
            db.rollback()
            erros.append(f"Linha {idx+1} ({e_prof}): {str(e)}")
            
    return {"sucessos": sucessos, "erros": erros}


@app.get("/admin/export-all")
async def export_all_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Exportar backup completo do sistema em CSV (incluindo alocações)"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Cabeçalho: professor;email;senha;turma;disciplina;turno;qtd_aulas;dia;slot
    writer.writerow(["nome_prof", "email_prof", "senha_prof", "nome_turma", "nome_disciplina", "nome_turno", "quantidade_aulas", "dia_semana", "slot"])
    
    # Pegar todas as alocações CROSS ProfessorSubject
    allocations = (
        db.query(models.Allocation, models.ProfessorSubject, models.Professor, models.User, models.SchoolClass, models.Subject, models.Turno)
        .join(models.ProfessorSubject, models.Allocation.professor_subject_id == models.ProfessorSubject.id)
        .join(models.Professor, models.ProfessorSubject.professor_id == models.Professor.id)
        .join(models.User, models.Professor.user_id == models.User.id)
        .join(models.SchoolClass, models.ProfessorSubject.class_id == models.SchoolClass.id)
        .join(models.Subject, models.ProfessorSubject.subject_id == models.Subject.id)
        .join(models.Turno, models.ProfessorSubject.turno_id == models.Turno.id)
        .all()
    )
    
    for a, ps, prof, u, sc, sub, t in allocations:
        writer.writerow([
            prof.nome, u.email, "EXP123", # Senha mascarada por segurança na exportação
            sc.nome, sub.nome, t.nome, ps.quantidade_aulas,
            a.dia_semana, a.slot
        ])
    
    # Adicionar também ProfessorSubjects que NÃO possuem alocação ainda
    all_ps = (
        db.query(models.ProfessorSubject, models.Professor, models.User, models.SchoolClass, models.Subject, models.Turno)
        .join(models.Professor, models.ProfessorSubject.professor_id == models.Professor.id)
        .join(models.User, models.Professor.user_id == models.User.id)
        .join(models.SchoolClass, models.ProfessorSubject.class_id == models.SchoolClass.id)
        .join(models.Subject, models.ProfessorSubject.subject_id == models.Subject.id)
        .join(models.Turno, models.ProfessorSubject.turno_id == models.Turno.id)
        .all()
    )
    
    # Mapear PS IDs ja exportados para evitar duplicidade onde não há aula
    ps_com_aula = {a.professor_subject_id for a, *rest in allocations}
    
    for ps, prof, u, sc, sub, t in all_ps:
        if ps.id not in ps_com_aula:
            writer.writerow([
                prof.nome, u.email, "EXP123",
                sc.nome, sub.nome, t.nome, ps.quantidade_aulas,
                "", "" # Sem dia/slot
            ])

    content = output.getvalue()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=backup_horarios.csv"}
    )


@app.post("/admin/import-all")
async def import_all_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Importar backup completo (Backup Geral)"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um CSV")
    
    contentArr = await file.read()
    try:
        content = contentArr.decode('utf-8')
    except UnicodeDecodeError:
        content = contentArr.decode('latin-1')
        
    reader = csv.reader(io.StringIO(content), delimiter=';')
    
    sucessos = 0
    erros = []
    
    # IMPORTANTE: No import "ALL", vamos primeiro criar as entidades e depois as alocações.
    for idx, row in enumerate(reader):
        if not row or len(row) < 7:
            continue
        if idx == 0 and "nome" in row[0].lower():
            continue
            
        try:
            n_prof, e_prof, s_prof, n_turma, n_sub, n_turno, q_aulas = [s.strip() for s in row[:7]]
            dia_raw = row[7].strip() if len(row) > 7 else ""
            slot_raw = row[8].strip() if len(row) > 8 else ""
            
            # Repetimos a lógica de import-full para entidades base...
            db_turno = db.query(models.Turno).filter(models.Turno.nome.ilike(n_turno)).first()
            if not db_turno:
                db_turno = models.Turno(nome=n_turno, hora_inicio="07:00", hora_fim="12:00")
                db.add(db_turno); db.flush()
            
            db_user = db.query(models.User).filter(models.User.email == e_prof).first()
            if not db_user:
                hashed_pw = auth.gerar_hash_senha(s_prof if s_prof != "EXP123" else "mudar123")
                db_user = models.User(email=e_prof, nome=n_prof, senha_hash=hashed_pw, tipo=models.UserType.PROFESSOR)
                db.add(db_user); db.flush()
            
            db_prof = db.query(models.Professor).filter(models.Professor.user_id == db_user.id).first()
            if not db_prof:
                db_prof = models.Professor(user_id=db_user.id, nome=n_prof)
                db.add(db_prof); db.flush()
            
            db_sub = db.query(models.Subject).filter(models.Subject.nome.ilike(n_sub)).first()
            if not db_sub:
                db_sub = models.Subject(nome=n_sub); db.add(db_sub); db.flush()
                
            db_class = db.query(models.SchoolClass).filter(
                models.SchoolClass.nome.ilike(n_turma), 
                models.SchoolClass.turno == db_turno.nome
            ).first()
            if not db_class:
                db_class = models.SchoolClass(nome=n_turma, turno=db_turno.nome)
                db.add(db_class); db.flush()
                
            existing_ps = db.query(models.ProfessorSubject).filter(
                models.ProfessorSubject.professor_id == db_prof.id,
                models.ProfessorSubject.subject_id == db_sub.id,
                models.ProfessorSubject.class_id == db_class.id,
                models.ProfessorSubject.turno_id == db_turno.id
            ).first()
            
            if not existing_ps:
                existing_ps = models.ProfessorSubject(
                    professor_id=db_prof.id, subject_id=db_sub.id, class_id=db_class.id,
                    turno_id=db_turno.id, quantidade_aulas=int(q_aulas)
                )
                db.add(existing_ps); db.flush()
            
            # AGORA AS ALOCAÇÕES (Se houver dia/slot)
            if dia_raw != "" and slot_raw != "":
                dia = int(dia_raw)
                slot = int(slot_raw)
                
                # Verificar se já existe essa alocação para evitar erro de UniqueConstraint
                existing_alloc = db.query(models.Allocation).filter(
                    models.Allocation.class_id == db_class.id,
                    models.Allocation.dia_semana == dia,
                    models.Allocation.slot == slot,
                    models.Allocation.turno_id == db_turno.id
                ).first()
                
                if not existing_alloc:
                    new_alloc = models.Allocation(
                        professor_subject_id = existing_ps.id,
                        professor_id = db_prof.id,
                        subject_id = db_sub.id,
                        class_id = db_class.id,
                        turno_id = db_turno.id,
                        dia_semana = dia,
                        slot = slot
                    )
                    db.add(new_alloc)

            sucessos += 1
            db.commit()
        except Exception as e:
            db.rollback()
            erros.append(f"Linha {idx+1} ({n_prof}): {str(e)}")
            
    return {"sucessos": sucessos, "erros": erros}

# --- DISCIPLINAS ---
@app.post("/admin/subjects", response_model=schemas.Subject)
async def create_subject(
    subject: schemas.SubjectBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Criar nova disciplina (apenas admin)"""
    db_subject = models.Subject(nome=subject.nome)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@app.get("/admin/subjects", response_model=List[schemas.Subject])
async def read_subjects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Listar todas as disciplinas (apenas admin)"""
    return db.query(models.Subject).all()

@app.delete("/admin/subjects/{subject_id}")
async def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Excluir disciplina (apenas admin)"""
    db_subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    
    # Limpeza em cascata
    db.query(models.Allocation).filter(models.Allocation.subject_id == subject_id).delete()
    db.query(models.ProfessorSubject).filter(models.ProfessorSubject.subject_id == subject_id).delete()
    
    db.delete(db_subject)
    db.commit()
    return {"message": "Disciplina excluída com sucesso"}

# --- TURMAS ---
@app.post("/admin/classes", response_model=schemas.SchoolClass)
async def create_class(
    school_class: schemas.SchoolClassBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Criar nova turma (apenas admin)"""
    db_class = models.SchoolClass(**school_class.dict())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

@app.get("/admin/classes", response_model=List[schemas.SchoolClass])
async def read_classes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Listar todas as turmas (apenas admin)"""
    return db.query(models.SchoolClass).all()

@app.delete("/admin/classes/{class_id}")
async def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_admin)
):
    """Excluir turma (apenas admin)"""
    db_class = db.query(models.SchoolClass).filter(models.SchoolClass.id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Limpeza em cascata
    db.query(models.Allocation).filter(models.Allocation.class_id == class_id).delete()
    db.query(models.ProfessorSubject).filter(models.ProfessorSubject.class_id == class_id).delete()
    
    db.delete(db_class)
    db.commit()
    return {"message": "Turma excluída com sucesso"}

# ===== PROFESSOR ENDPOINTS =====

# --- DISCIPLINAS DO PROFESSOR ---
@app.post("/professor/professor-subjects", response_model=schemas.ProfessorSubject)
async def create_professor_subject(
    prof_subject: schemas.ProfessorSubjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_professor)
):
    """Professor cadastra disciplinas com quantidade de aulas"""
    # Buscar professor associado ao user_id
    professor = db.query(models.Professor).filter(
        models.Professor.user_id == current_user.id
    ).first()
    
    if not professor:
        # Se não existir, criar um registro Professor vinculado ao User
        professor = models.Professor(
            user_id=current_user.id,
            nome=current_user.nome
        )
        db.add(professor)
        db.flush()
    
    # Verificar se já existe
    existing = db.query(models.ProfessorSubject).filter(
        models.ProfessorSubject.professor_id == professor.id,
        models.ProfessorSubject.subject_id == prof_subject.subject_id,
        models.ProfessorSubject.class_id == prof_subject.class_id,
        models.ProfessorSubject.turno_id == prof_subject.turno_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Disciplina já cadastrada para esta turma/turno")
    
    # Usar o professor_id do professor encontrado/criado
    prof_subject_data = prof_subject.dict()
    prof_subject_data['professor_id'] = professor.id
    
    db_prof_subject = models.ProfessorSubject(**prof_subject_data)
    db.add(db_prof_subject)
    db.commit()
    db.refresh(db_prof_subject)
    return db_prof_subject

@app.get("/professor/professor-subjects", response_model=List[schemas.ProfessorSubject])
async def read_professor_subjects(
    turno_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_gerenciador)
):
    """Listar disciplinas do professor para um turno específico"""
    # Se for Admin, retornar todas as disciplinas de todos os professores para este turno
    if current_user.tipo == models.UserType.ADMIN:
        return db.query(models.ProfessorSubject).filter(
            models.ProfessorSubject.turno_id == turno_id
        ).all()

    # Buscar o professor associado ao user_id
    professor = db.query(models.Professor).filter(
        models.Professor.user_id == current_user.id
    ).first()
    
    if not professor:
        # Criar se não existir
        professor = models.Professor(
            user_id=current_user.id,
            nome=current_user.nome
        )
        db.add(professor)
        db.commit()
        db.refresh(professor)
    
    return db.query(models.ProfessorSubject).filter(
        models.ProfessorSubject.professor_id == professor.id,
        models.ProfessorSubject.turno_id == turno_id
    ).all()

@app.put("/professor/professor-subjects/{ps_id}", response_model=schemas.ProfessorSubject)
async def update_professor_subject(
    ps_id: int,
    data: schemas.ProfessorSubjectBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_gerenciador)
):
    """Editar a quantidade de aulas de uma disciplina do professor"""
    ps = db.query(models.ProfessorSubject).filter(models.ProfessorSubject.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    
    # Professores só podem editar as próprias disciplinas
    if current_user.tipo == models.UserType.PROFESSOR:
        professor = db.query(models.Professor).filter(models.Professor.user_id == current_user.id).first()
        if not professor or ps.professor_id != professor.id:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    ps.quantidade_aulas = data.quantidade_aulas
    db.commit()
    db.refresh(ps)
    return ps

@app.delete("/professor/professor-subjects/{ps_id}", status_code=204)
async def delete_professor_subject(
    ps_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_gerenciador)
):
    """Excluir uma disciplina do professor e todas as suas alocações"""
    ps = db.query(models.ProfessorSubject).filter(models.ProfessorSubject.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    
    # Professores só podem excluir as próprias disciplinas
    if current_user.tipo == models.UserType.PROFESSOR:
        professor = db.query(models.Professor).filter(models.Professor.user_id == current_user.id).first()
        if not professor or ps.professor_id != professor.id:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Cascata: remover todas as alocações desta disciplina
    db.query(models.Allocation).filter(models.Allocation.professor_subject_id == ps_id).delete()
    db.delete(ps)
    db.commit()

# --- ALOCAÇÕES (com validações) ---
@app.post("/professor/allocations", response_model=schemas.Allocation)
async def create_allocation(
    allocation_request: schemas.AllocationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_gerenciador)
):
    """Alocar aula - com validação de conflitos de horário"""
    
    # 0. Determinar professor (Auto caso seja professor, ou via request caso seja Admin)
    if current_user.tipo == models.UserType.ADMIN:
        # Se for Admin, usamos o professor_id enviado no request
        # (Mas o request AllocationCreate precisa conter o professor_id)
        professor_id = allocation_request.professor_id
    else:
        professor = db.query(models.Professor).filter(
            models.Professor.user_id == current_user.id
        ).first()
        
        if not professor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Seu registro de professor não foi encontrado no sistema."
            )
        professor_id = professor.id
    
    # Criar dict do request e injetar o professor_id correto
    alloc_data = allocation_request.dict()
    alloc_data["professor_id"] = professor_id
    
    # Verificar se a aula já foi alocada
    existing_allocation = db.query(models.Allocation).filter(
        models.Allocation.professor_subject_id == alloc_data["professor_subject_id"],
        models.Allocation.dia_semana == alloc_data["dia_semana"],
        models.Allocation.slot == alloc_data["slot"]
    ).first()
    
    if existing_allocation:
        raise HTTPException(status_code=409, detail="Esta aula já foi alocada neste horário")
    
    # 1. Verificar conflito de turma (turma não pode ter 2 aulas no mesmo horário)
    class_conflict = db.query(models.Allocation).filter(
        models.Allocation.class_id == alloc_data["class_id"],
        models.Allocation.dia_semana == alloc_data["dia_semana"],
        models.Allocation.slot == alloc_data["slot"],
        models.Allocation.turno_id == alloc_data["turno_id"]
    ).first()
    
    if class_conflict:
        raise HTTPException(status_code=409, detail="Turma já possui aula neste horário")

    # 2. Verificar conflito de professor (professor não pode estar em 2 lugares no mesmo horário)
    prof_conflict = db.query(models.Allocation).filter(
        models.Allocation.professor_id == alloc_data["professor_id"],
        models.Allocation.dia_semana == alloc_data["dia_semana"],
        models.Allocation.slot == alloc_data["slot"],
        models.Allocation.turno_id == alloc_data["turno_id"]
    ).first()
    
    if prof_conflict:
        # Buscar nome da turma para mensagem mais clara
        conflicting_class = db.query(models.SchoolClass).filter(
            models.SchoolClass.id == prof_conflict.class_id
        ).first()
        class_name = conflicting_class.nome if conflicting_class else "outra turma"
        raise HTTPException(
            status_code=409, 
            detail=f"Você já possui aula alocada na turma {class_name} neste horário"
        )

    # Criar alocação
    db_allocation = models.Allocation(**alloc_data)
    db.add(db_allocation)
    
    # Atualizar contador de aulas alocadas em ProfessorSubject
    prof_subject = db.query(models.ProfessorSubject).filter(
        models.ProfessorSubject.id == alloc_data["professor_subject_id"]
    ).first()
    
    if prof_subject:
        prof_subject.aulas_alocadas += 1
    
    try:
        db.commit()
        db.refresh(db_allocation)
        
        # Broadcast the change
        await manager.broadcast({
            "type": "new_allocation",
            "data": schemas.Allocation.from_orm(db_allocation).dict()
        })
        
        return db_allocation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/professor/allocations", response_model=List[schemas.Allocation])
async def read_allocations(
    turno_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_gerenciador)
):
    """Listar todas as alocações de um turno específico"""
    return db.query(models.Allocation).filter(
        models.Allocation.turno_id == turno_id
    ).all()

@app.delete("/professor/allocations/{allocation_id}")
async def delete_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_gerenciador)
):
    """Remover alocação de aula"""
    db_allocation = db.query(models.Allocation).filter(
        models.Allocation.id == allocation_id
    ).first()
    
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Alocação não encontrada")
    
    # Verificar se o professor é dono da alocação (Pular se for Admin)
    if current_user.tipo != models.UserType.ADMIN:
        professor = db.query(models.Professor).filter(
            models.Professor.user_id == current_user.id
        ).first()
        
        if not professor or db_allocation.professor_id != professor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para remover aulas de outro professor"
            )
    
    # Decrementar contador de aulas alocadas
    prof_subject = db.query(models.ProfessorSubject).filter(
        models.ProfessorSubject.id == db_allocation.professor_subject_id
    ).first()
    
    if prof_subject and prof_subject.aulas_alocadas > 0:
        prof_subject.aulas_alocadas -= 1
    
    alloc_data = schemas.Allocation.from_orm(db_allocation).dict()
    db.delete(db_allocation)
    db.commit()
    
    # Broadcast the deletion
    await manager.broadcast({
        "type": "deleted_allocation",
        "data": alloc_data
    })
    
    return {"message": "Alocação removida"}

# --- WEBSOCKET ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- ENDPOINTS PÚBLICOS PARA PROFESSOR ---
@app.get("/turnos", response_model=List[schemas.Turno])
async def read_all_turnos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_atual)
):
    """Listar todos os turnos (professor e admin)"""
    return db.query(models.Turno).all()


@app.get("/subjects", response_model=List[schemas.Subject])
async def read_all_subjects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_atual)
):
    """Listar todas as disciplinas (professor e admin)"""
    return db.query(models.Subject).all()


@app.get("/classes", response_model=List[schemas.SchoolClass])
async def read_all_classes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_atual)
):
    """Listar todas as turmas (professor e admin)"""
    return db.query(models.SchoolClass).all()


@app.get("/professors", response_model=List[schemas.Professor])
async def read_all_professors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.obter_usuario_atual)
):
    """Listar todos os professores (professor e admin)"""
    return db.query(models.Professor).all()
