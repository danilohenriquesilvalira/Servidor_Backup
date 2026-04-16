# RLS Backup — Sistema de Backup Interno

**RLS Automação Industrial** | Sistema centralizado de backup de arquivos técnicos.

---

## Pré-requisitos

- Docker Engine 24+
- Docker Compose v2+

---

## Subir o sistema (primeira vez)

```bash
# 1. Entrar na pasta do projeto
cd rls-backup

# 2. Copiar e configurar variáveis de ambiente
cp .env.example .env
# Edite o .env se necessário (recomendado em produção)

# 3. Subir tudo com um comando
docker compose up -d --build

# 4. Verificar se está rodando
docker compose ps
```

Aguarde ~30 segundos no primeiro boot (o banco inicializa).

---

## Acessar o sistema

| Serviço   | URL                          |
|-----------|------------------------------|
| Interface | http://SEU_IP:3000           |
| API       | http://SEU_IP:3001           |

---

## Usuários padrão

| Usuário | Email               | Senha     | Perfil |
|---------|---------------------|-----------|--------|
| Ramiro  | ramiro@rls.local    | rls@2024  | Admin  |
| Luiz    | luiz@rls.local      | rls@2024  | Usuário|
| Danilo  | danilo@rls.local    | rls@2024  | Usuário|
| Paulo   | paulo@rls.local     | rls@2024  | Usuário|

> **IMPORTANTE:** Altere as senhas após o primeiro login!

---

## Comandos úteis

```bash
# Ver logs em tempo real
docker compose logs -f

# Parar o sistema
docker compose down

# Parar e remover dados (CUIDADO!)
docker compose down -v

# Reiniciar um serviço
docker compose restart backend

# Ver uso de disco dos volumes
docker system df -v
```

---

## Estrutura do projeto

```
rls-backup/
├── backend/          # API Node.js + Fastify
├── frontend/         # React + Vite + Tailwind
├── database/         # Schema SQL inicial
├── docker-compose.yml
└── .env.example
```

---

## Funcionalidades

- Login com JWT (8h de sessão)
- Upload de arquivos com barra de progresso
- Suporte a múltiplos arquivos por upload
- **Versionamento automático** (uploads do mesmo arquivo geram v2, v3...)
- Navegação por pastas
- Download de arquivos
- Log de todas as atividades
- Painel administrativo (gerenciar usuários, ver estatísticas)
- Interface responsiva (desktop e mobile)

---

## Configuração para acesso externo (produção)

Edite o `.env` com o IP do servidor:

```env
FRONTEND_URL=http://192.168.1.100:3000
VITE_API_URL=http://192.168.1.100:3001
```

Reconstrua após alterar:
```bash
docker compose up -d --build
```

---

## Backup dos dados

Os dados ficam em volumes Docker:
- `postgres_data` — Banco de dados
- `uploads_data` — Arquivos enviados

Para fazer backup:
```bash
# Backup do banco
docker exec rls_db pg_dump -U rls rls_backup > backup_$(date +%Y%m%d).sql

# Backup dos arquivos (copiar o volume)
docker run --rm -v rls-backup_uploads_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```
