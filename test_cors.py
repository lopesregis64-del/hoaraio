import requests

# Testar headers CORS
try:
    resp = requests.get("http://localhost:8000/", timeout=2)
    print(f"Status: {resp.status_code}")
    print(f"\nTodos os headers da resposta:")
    for key, value in resp.headers.items():
        print(f"  {key}: {value}")
except Exception as e:
    print(f"Erro: {e}")
