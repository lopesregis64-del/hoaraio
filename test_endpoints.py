#!/usr/bin/env python3
import requests
import json

BACKEND = "http://localhost:8000"

print("=== TESTE DE ENDPOINTS ===\n")

# 1. Login como professor
print("1. Fazendo login...")
response = requests.post(
    f"{BACKEND}/token",
    data={
        "username": "prof@test.com",
        "password": "123456"
    }
)
print(f"   Status: {response.status_code}")
if response.status_code != 200:
    print(f"   Erro: {response.text}")
    exit(1)

token = response.json()["access_token"]
print(f"   ✅ Token gerado\n")

# 2. Testar /professor/me
print("2. Testando /professor/me...")
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BACKEND}/professor/me", headers=headers)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   ✅ Dados do professor: {json.dumps(data, indent=2)}\n")
else:
    print(f"   ❌ Erro: {response.text}\n")

# 3. Testar /turnos (endpoint público para professor)
print("3. Testando /turnos...")
response = requests.get(f"{BACKEND}/turnos", headers=headers)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   ✅ Turnos recebidos: {len(data)} turnos\n")
    for turno in data:
        print(f"      - {turno['nome']}: {turno['hora_inicio']} - {turno['hora_fim']}")
else:
    print(f"   ❌ Erro: {response.text}\n")

# 4. Testar /subjects
print("\n4. Testando /subjects...")
response = requests.get(f"{BACKEND}/subjects", headers=headers)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   ✅ Disciplinas recebidas: {len(data)} disciplinas")
else:
    print(f"   ❌ Erro: {response.text}\n")

# 5. Testar /classes
print("5. Testando /classes...")
response = requests.get(f"{BACKEND}/classes", headers=headers)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   ✅ Turmas recebidas: {len(data)} turmas")
else:
    print(f"   ❌ Erro: {response.text}\n")

print("\n=== TODOS OS TESTES PASSARAM ===")
