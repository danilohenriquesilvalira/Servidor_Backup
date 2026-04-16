-- Migration v2 — Controle de armazenamento, visibilidade e logs expandidos
-- Seguro para rodar multiplas vezes (IF NOT EXISTS / IF EXISTS)

-- 1. Visibilidade nos arquivos
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  visibility VARCHAR(10) DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

-- 2. Limite de armazenamento por usuario (bytes; NULL = ilimitado)
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  storage_limit BIGINT DEFAULT NULL;

-- Indice para filtrar arquivos publicos rapidamente
CREATE INDEX IF NOT EXISTS idx_files_visibility ON files(visibility);

-- Indice para facilitar calculo de uso por usuario
CREATE INDEX IF NOT EXISTS idx_files_user_size ON files(user_id, size);
