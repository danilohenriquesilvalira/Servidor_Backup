import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcrypt'

import pool, { query } from './config/db.js'
import authRoutes   from './routes/auth.js'
import fileRoutes   from './routes/files.js'
import folderRoutes from './routes/folders.js'
import userRoutes   from './routes/users.js'
import logRoutes    from './routes/logs.js'
import systemRoutes from './routes/system.js'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const fastify = Fastify({
  logger:    { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
  bodyLimit: 1073741824   // 1 GB
})

await fastify.register(cors, {
  origin: true, credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'rls-super-secret-jwt-key-change-this'
})

await fastify.register(multipart, {
  limits: { fileSize: 1073741824, files: 10 }
})

await fastify.register(authRoutes,   { prefix: '/api/auth' })
await fastify.register(fileRoutes,   { prefix: '/api/files' })
await fastify.register(folderRoutes, { prefix: '/api/folders' })
await fastify.register(userRoutes,   { prefix: '/api/users' })
await fastify.register(logRoutes,    { prefix: '/api/logs' })
await fastify.register(systemRoutes, { prefix: '/api/system' })

fastify.get('/health', async () => ({
  status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0'
}))

// ── Migration v2 — roda na inicializacao se necessario ──────────────
async function runMigrations() {
  console.log('Verificando migrations...')
  await query(`
    ALTER TABLE files ADD COLUMN IF NOT EXISTS
      visibility VARCHAR(10) DEFAULT 'private'
      CHECK (visibility IN ('private', 'public'))
  `)
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS
      storage_limit BIGINT DEFAULT NULL
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_files_visibility ON files(visibility)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_files_user_size  ON files(user_id, size)`)
  await query(`
    ALTER TABLE files ADD COLUMN IF NOT EXISTS
      last_accessed_at TIMESTAMPTZ DEFAULT NULL
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_files_accessed ON files(last_accessed_at)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_files_created  ON files(created_at)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_created   ON activity_logs(created_at)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_logs_action    ON activity_logs(action)`)
  console.log('Migrations OK')
}

// ── Seed de usuarios iniciais ────────────────────────────────────────
async function seedUsers() {
  const { rows } = await query('SELECT COUNT(*) FROM users')
  if (parseInt(rows[0].count) > 0) return

  console.log('Criando usuarios padrao...')
  const pwd  = process.env.DEFAULT_PASSWORD || 'rls@2024'
  const hash = await bcrypt.hash(pwd, 12)

  const DEFAULT_LIMIT = process.env.DEFAULT_STORAGE_LIMIT_BYTES
    ? parseInt(process.env.DEFAULT_STORAGE_LIMIT_BYTES)
    : null   // null = ilimitado

  const users = [
    { name: 'Ramiro', email: 'ramiro@rls.local', role: 'admin' },
    { name: 'Luiz',   email: 'luiz@rls.local',   role: 'user' },
    { name: 'Danilo', email: 'danilo@rls.local',  role: 'user' },
    { name: 'Paulo',  email: 'paulo@rls.local',   role: 'user' },
  ]

  for (const u of users) {
    await query(
      'INSERT INTO users (name, email, password_hash, role, storage_limit) VALUES ($1,$2,$3,$4,$5)',
      [u.name, u.email, hash, u.role, DEFAULT_LIMIT]
    )
    console.log(`  + ${u.name} (${u.email})`)
  }
  console.log(`  Senha padrao: ${pwd}`)
}

// ── Aguardar banco ───────────────────────────────────────────────────
async function waitForDatabase(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1')
      console.log('Banco de dados conectado')
      return
    } catch {
      console.log(`Aguardando banco... (${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error('Nao foi possivel conectar ao banco de dados')
}

// ── Boot ─────────────────────────────────────────────────────────────
try {
  await waitForDatabase()
  await runMigrations()
  await seedUsers()
  await fastify.listen({ port: parseInt(process.env.PORT || '3001'), host: '0.0.0.0' })
  console.log(`RLS Backup API v2.0 em http://0.0.0.0:${process.env.PORT || 3001}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
