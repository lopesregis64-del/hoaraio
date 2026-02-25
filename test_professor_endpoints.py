import requests
import json

BACKEND = "http://localhost:8000"

# Credenciais de professor
PROFESSOR_EMAIL = "prof@test.com"
PROFESSOR_SENHA = "123456"

print("=== TESTE COMPLETO DOS ENDPOINTS DO PROFESSOR ===\n")

# 1. Login
print("1. Fazendo login como professor...")
response = requests.post(
    f"{BACKEND}/token",
    data={
        "username": PROFESSOR_EMAIL,
        "password": PROFESSOR_SENHA
    }
)
print(f"   Status: {response.status_code}")

if response.status_code != 200:
    print(f"   ❌ Erro no login: {response.text}")
    exit(1)

data = response.json()
token = data.get("access_token")
usuario_id = data.get("usuario_id")
print(f"   ✅ Login bem-sucedido!")
print(f"   Token: {token[:30]}...")
print(f"   Usuario ID: {usuario_id}\n")

headers = {"Authorization": f"Bearer {token}"}

# 2. GET /professor/professor-subjects
print("2. Testando GET /professor/professor-subjects?turno_id=1...")
response = requests.get(
    f"{BACKEND}/professor/professor-subjects?turno_id=1",
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code != 200:
    print(f"   ❌ Erro: {response.text}")
else:
    print(f"   ✅ Sucesso")
    print(f"   Response: {response.json()}\n")

# 3. GET /professor/allocations
print("3. Testando GET /professor/allocations?turno_id=1...")
response = requests.get(
    f"{BACKEND}/professor/allocations?turno_id=1",
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code != 200:
    print(f"   ❌ Erro: {response.text}")
else:
    print(f"   ✅ Sucesso")
    print(f"   Response: {response.json()}\n")

# 4. POST /professor/professor-subjects
print("4. Testando POST /professor/professor-subjects...")
payload = {
    "subject_id": 1,
    "class_id": 1,
    "turno_id": 1,
    "quantidade_aulas": 5
}
print(f"   Payload: {json.dumps(payload, indent=2)}")
response = requests.post(
    f"{BACKEND}/professor/professor-subjects",
    json=payload,
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code != 200:
    print(f"   ❌ Erro: {response.text}")
else:
    print(f"   ✅ Sucesso")
    created_subject = response.json()
    print(f"   Response: {json.dumps(created_subject, indent=2)}\n")
    
    # 5. POST /professor/allocations (só faz teste se conseguiu criar disciplina)
    print("5. Testando POST /professor/allocations...")
    allocation_payload = {
        "professor_subject_id": created_subject.get("id"),
        "professor_id": created_subject.get("professor_id"),
        "subject_id": created_subject.get("subject_id"),
        "class_id": created_subject.get("class_id"),
        "classroom_id": 1,
        "turno_id": created_subject.get("turno_id"),
        "dia_semana": 0,
        "slot": 0
    }
    print(f"   Payload: {json.dumps(allocation_payload, indent=2)}")
    response = requests.post(
        f"{BACKEND}/professor/allocations",
        json=allocation_payload,
        headers=headers
    )
    print(f"   Status: {response.status_code}")
    if response.status_code != 200:
        print(f"   ❌ Erro: {response.text}")
    else:
        print(f"   ✅ Sucesso")
        print(f"   Response: {json.dumps(response.json(), indent=2)}\n")

print("=== TESTES COMPLETOS ===")
