#!/usr/bin/env python3
"""
CHECKLIST DE VERIFICAÇÃO - Sistema de Horários
Execute este script para verificar se tudo está funcionando
"""

import requests
import json
from datetime import datetime

# Configurações
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
TEST_ADMIN_EMAIL = "admin@test.com"
TEST_ADMIN_PASSWORD = "123456"
TEST_PROF_EMAIL = "prof@test.com"
TEST_PROF_PASSWORD = "123456"

# Cores para output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

class SystemChecker:
    def __init__(self):
        self.results = []
        self.admin_token = None
        self.prof_token = None
        self.passed = 0
        self.failed = 0

    def check(self, name, condition, details=""):
        """Registra resultado de um teste"""
        status = f"{GREEN}✅ PASSOU{RESET}" if condition else f"{RED}❌ FALHOU{RESET}"
        self.results.append(f"{status} | {name}")
        if details:
            self.results.append(f"        {details}")
        
        if condition:
            self.passed += 1
        else:
            self.failed += 1

    def print_header(self, title):
        """Imprime cabeçalho"""
        print(f"\n{BOLD}{'='*60}{RESET}")
        print(f"{BOLD}{title}{RESET}")
        print(f"{BOLD}{'='*60}{RESET}")

    def test_backend_available(self):
        """Testa se backend está disponível"""
        self.print_header("1. Verificando Serviços")
        
        try:
            response = requests.get(f"{BACKEND_URL}/")
            self.check(
                "Backend respondendo",
                response.status_code == 200,
                f"Status: {response.status_code}"
            )
        except Exception as e:
            self.check("Backend respondendo", False, str(e))

    def test_login_admin(self):
        """Testa login do admin"""
        self.print_header("2. Testando Autenticação")
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/token",
                data={"username": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
            )
            
            if response.status_code == 200:
                self.admin_token = response.json()["access_token"]
                self.check("Login Admin", True)
            else:
                self.check("Login Admin", False, f"Status: {response.status_code}")
        except Exception as e:
            self.check("Login Admin", False, str(e))

    def test_login_professor(self):
        """Testa login do professor"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/token",
                data={"username": TEST_PROF_EMAIL, "password": TEST_PROF_PASSWORD}
            )
            
            if response.status_code == 200:
                self.prof_token = response.json()["access_token"]
                self.check("Login Professor", True)
            else:
                self.check("Login Professor", False, f"Status: {response.status_code}")
        except Exception as e:
            self.check("Login Professor", False, str(e))

    def test_admin_endpoints(self):
        """Testa endpoints do admin"""
        self.print_header("3. Testando Endpoints Admin")
        
        if not self.admin_token:
            self.check("Skip endpoints admin", False, "Token não disponível")
            return

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Listar turnos
        try:
            response = requests.get(f"{BACKEND_URL}/admin/turnos", headers=headers)
            self.check("GET /admin/turnos", response.status_code == 200)
        except Exception as e:
            self.check("GET /admin/turnos", False, str(e))

        # Listar professores
        try:
            response = requests.get(f"{BACKEND_URL}/admin/professors", headers=headers)
            self.check("GET /admin/professors", response.status_code == 200)
        except Exception as e:
            self.check("GET /admin/professors", False, str(e))

        # Listar disciplinas
        try:
            response = requests.get(f"{BACKEND_URL}/admin/subjects", headers=headers)
            self.check("GET /admin/subjects", response.status_code == 200)
        except Exception as e:
            self.check("GET /admin/subjects", False, str(e))

        # Listar turmas
        try:
            response = requests.get(f"{BACKEND_URL}/admin/classes", headers=headers)
            self.check("GET /admin/classes", response.status_code == 200)
        except Exception as e:
            self.check("GET /admin/classes", False, str(e))

    def test_professor_endpoints(self):
        """Testa endpoints do professor"""
        self.print_header("4. Testando Endpoints Professor")
        
        if not self.prof_token:
            self.check("Skip endpoints professor", False, "Token não disponível")
            return

        headers = {"Authorization": f"Bearer {self.prof_token}"}

        # Obter dados do professor
        try:
            response = requests.get(f"{BACKEND_URL}/professor/me", headers=headers)
            self.check("GET /professor/me", response.status_code == 200)
        except Exception as e:
            self.check("GET /professor/me", False, str(e))

        # Listar disciplinas
        try:
            response = requests.get(
                f"{BACKEND_URL}/professor/professor-subjects?turno_id=1",
                headers=headers
            )
            self.check("GET /professor/professor-subjects", response.status_code == 200)
        except Exception as e:
            self.check("GET /professor/professor-subjects", False, str(e))

        # Listar alocações
        try:
            response = requests.get(
                f"{BACKEND_URL}/professor/allocations?turno_id=1",
                headers=headers
            )
            self.check("GET /professor/allocations", response.status_code == 200)
        except Exception as e:
            self.check("GET /professor/allocations", False, str(e))

    def test_database(self):
        """Verifica banco de dados"""
        self.print_header("5. Verificando Banco de Dados")
        
        import os
        db_path = "backend/app.db"
        
        if os.path.exists(db_path):
            self.check("Banco de dados existe", True)
            size = os.path.getsize(db_path) / 1024  # KB
            self.check(f"Tamanho banco: {size:.2f}KB", size > 10)
        else:
            self.check("Banco de dados existe", False, "Arquivo não encontrado")

    def test_documentation(self):
        """Verifica documentação"""
        self.print_header("6. Verificando Documentação")
        
        import os
        
        docs = [
            "README.md",
            "RESUMO.md",
            "GUIA_TESTE.md",
            "ARQUITETURA.md",
            "API_ENDPOINTS.md",
            "COMECE_AQUI.md",
            "STATUS.md"
        ]
        
        for doc in docs:
            exists = os.path.exists(doc)
            self.check(f"Documento: {doc}", exists)

    def print_results(self):
        """Imprime resultados finais"""
        self.print_header("Resultados Finais")
        
        print("\nDetalhes:")
        for result in self.results:
            print(result)
        
        total = self.passed + self.failed
        percentage = (self.passed / total * 100) if total > 0 else 0
        
        print(f"\n{BOLD}{'='*60}{RESET}")
        print(f"{GREEN}✅ Testes Passados: {self.passed}{RESET}")
        print(f"{RED}❌ Testes Falhados: {self.failed}{RESET}")
        print(f"{BOLD}📊 Taxa de Sucesso: {percentage:.1f}%{RESET}")
        
        if self.failed == 0:
            print(f"\n{GREEN}{BOLD}🎉 TUDO FUNCIONANDO PERFEITAMENTE!{RESET}")
        else:
            print(f"\n{YELLOW}{BOLD}⚠️ Alguns testes falharam. Verifique a documentação.{RESET}")
        
        print(f"{BOLD}{'='*60}{RESET}\n")

    def run_all(self):
        """Executa todos os testes"""
        print(f"\n{BOLD}{'='*60}{RESET}")
        print(f"{BOLD}🧪 VERIFICADOR DO SISTEMA DE HORÁRIOS{RESET}")
        print(f"{BOLD}{'='*60}{RESET}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Backend: {BACKEND_URL}")
        print(f"Frontend: {FRONTEND_URL}")
        
        self.test_backend_available()
        self.test_login_admin()
        self.test_login_professor()
        self.test_admin_endpoints()
        self.test_professor_endpoints()
        self.test_database()
        self.test_documentation()
        self.print_results()

if __name__ == "__main__":
    checker = SystemChecker()
    checker.run_all()
