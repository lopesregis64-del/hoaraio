#!/usr/bin/env python3
import requests

BACKEND = "http://localhost:8000"

# Login
response = requests.post(
    f"{BACKEND}/token",
    data={"username": "prof@test.com", "password": "123456"}
)
token = response.json()["access_token"]
print(f"Token: {token[:30]}...'\n")

# Testar /professor/me com error detalhado
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BACKEND}/professor/me", headers=headers)
print(f"Status: {response.status_code}")
print(f"Response type: {response.headers.get('content-type')}")
print(f"Response text:\n{response.text}")
