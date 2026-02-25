import requests

# Test OPTIONS request (preflight)
try:
    resp = requests.options("http://localhost:8000/", timeout=2)
    print(f"OPTIONS Status: {resp.status_code}")
    print(f"\nHeaders da resposta OPTIONS:")
    for key, value in sorted(resp.headers.items()):
        if 'access' in key.lower() or 'origin' in key.lower() or 'allow' in key.lower():
            print(f"  {key}: {value}")
except Exception as e:
    print(f"Erro OPTIONS: {e}")

print("\n" + "="*50 + "\n")

# Test GET request
try:
    resp = requests.get("http://localhost:8000/", timeout=2, headers={"Origin": "http://localhost:5173"})
    print(f"GET Status: {resp.status_code}")
    print(f"\nHeaders CORS na resposta GET:")
    cors_headers = {k: v for k, v in resp.headers.items() if 'access' in k.lower() or 'origin' in k.lower()}
    if cors_headers:
        for key, value in cors_headers.items():
            print(f"  {key}: {value}")
    else:
        print("  Nenhum header CORS encontrado!")
    print(f"\nTodos os headers:")
    for key in sorted(resp.headers.keys()):
        print(f"  {key}")
except Exception as e:
    print(f"Erro GET: {e}")
