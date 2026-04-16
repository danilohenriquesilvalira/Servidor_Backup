#!/bin/bash
# dev.sh — modo desenvolvimento com hot-reload automatico
#
# Como funciona:
#   Frontend: Vite HMR — alteracoes em src/ refletem no navegador em < 1 segundo
#   Backend:  Node --watch — reinicia ao salvar qualquer .js
#
# Como usar:
#   ./dev.sh          (inicia modo dev)
#   Ctrl+C            (para o modo dev)
#   docker compose up -d  (volta para producao)

set -e

echo "Parando producao se estiver rodando..."
docker compose down 2>/dev/null || true

echo ""
echo "Construindo imagens de desenvolvimento..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build

echo ""
echo "Iniciando modo desenvolvimento..."
echo ""
echo "  Frontend (Vite HMR):  http://localhost:3009"
echo "  Backend  (API):       http://localhost:3010"
echo ""
echo "  Edite qualquer arquivo em frontend/src/ — atualiza instantaneamente"
echo "  Edite qualquer arquivo em backend/src/  — reinicia o servidor"
echo ""

docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Ao sair (Ctrl+C), volta automaticamente para producao
echo ""
echo "Voltando para modo producao..."
docker compose build frontend
docker compose up -d
echo "Producao disponivel em http://localhost:3009"
