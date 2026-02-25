#!/usr/bin/env python3
import requests
import time

print("=== TESTE DE AUTENTICAÇÃO ===\n")

# Tentar conectar
max_tentativas = 3
for tentativa in range(max_tentativas):
    try:
        response = requests.post(
            'http://localhost:8000/token',
            data={
                'username': 'admin@test.com',
                'password': '123456'
            },
            timeout=5
        )
        
        print(f'Status do login: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token', 'ERRO')
            usuario_tipo = data.get('usuario_tipo', 'ERRO')
            print(f'✅ Token gerado!')
            print(f'Token: {token[:50]}...')
            print(f'Tipo: {usuario_tipo}')
            
            # Testar endpoint com token
            print("\n=== TESTE DE ENDPOINT PROTEGIDO ===\n")
            headers = {"Authorization": f"Bearer {token}"}
            response2 = requests.get("http://localhost:8000/admin/turnos", headers=headers)
            print(f'Status /admin/turnos: {response2.status_code}')
            print(f'Response: {response2.json()}')
        else:
            print(f'❌ Erro: {response.text}')
        break
    except Exception as e:
        print(f'❌ Tentativa {tentativa+1}: {e}')
        if tentativa < max_tentativas - 1:
            time.sleep(2)
