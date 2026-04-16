import bcrypt from 'bcrypt'
import { query } from '../config/db.js'
import { requireAdmin, logActivity } from '../middleware/authenticate.js'
import pool from '../config/db.js'

// Converte GB para bytes (aceita null/0 = sem limite)
const gbToBytes = (gb) => (gb && parseFloat(gb) > 0)
  ? Math.round(parseFloat(gb) * 1024 * 1024 * 1024)
  : null

export default async function userRoutes(fastify) {

  // GET /api/users
  fastify.get('/', { preHandler: requireAdmin }, async () => {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.storage_limit, u.created_at,
              COUNT(DISTINCT f.id)::int          AS file_count,
              COALESCE(SUM(f.size), 0)::bigint   AS total_size
       FROM users u
       LEFT JOIN files f ON f.user_id = u.id
       GROUP BY u.id
       ORDER BY u.name ASC`
    )
    return {
      users: rows.map(r => ({
        ...r,
        total_size:    parseInt(r.total_size),
        storage_limit: r.storage_limit ? parseInt(r.storage_limit) : null,
        usedPct: r.storage_limit
          ? Math.min(100, Math.round((parseInt(r.total_size) / parseInt(r.storage_limit)) * 100))
          : null
      }))
    }
  })

  // POST /api/users
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, email, password, role, storageLimitGb } = request.body

    if (!name || !email || !password)
      return reply.code(400).send({ error: 'Nome, email e senha sao obrigatorios' })
    if (password.length < 6)
      return reply.code(400).send({ error: 'Senha deve ter no minimo 6 caracteres' })

    const dup = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (dup.rows.length > 0)
      return reply.code(409).send({ error: 'Email ja cadastrado' })

    const hash  = await bcrypt.hash(password, 12)
    const limit = gbToBytes(storageLimitGb)

    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, storage_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, active, storage_limit, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash, role || 'user', limit]
    )

    await logActivity(pool, request.user.id, 'USER_CREATE', 'user', rows[0].id,
      { name: name.trim(), email }, request.ip)

    return { user: rows[0] }
  })

  // PUT /api/users/:id
  fastify.put('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, email, role, active, password, storageLimitGb } = request.body
    const { id } = request.params

    const { rows: ex } = await query('SELECT id FROM users WHERE id = $1', [id])
    if (!ex[0]) return reply.code(404).send({ error: 'Usuario nao encontrado' })

    const limit = storageLimitGb !== undefined ? gbToBytes(storageLimitGb) : undefined

    let pwUpdate = ''
    let params   = [name?.trim(), email?.toLowerCase().trim(), role, active, id]

    if (limit !== undefined) {
      // inclui storage_limit no UPDATE
      if (password) {
        if (password.length < 6) return reply.code(400).send({ error: 'Senha deve ter no minimo 6 caracteres' })
        const hash = await bcrypt.hash(password, 12)
        pwUpdate = ', password_hash = $6, storage_limit = $7'
        params   = [name?.trim(), email?.toLowerCase().trim(), role, active, id, hash, limit]
      } else {
        pwUpdate = ', storage_limit = $6'
        params   = [name?.trim(), email?.toLowerCase().trim(), role, active, id, limit]
      }
    } else if (password) {
      if (password.length < 6) return reply.code(400).send({ error: 'Senha deve ter no minimo 6 caracteres' })
      const hash = await bcrypt.hash(password, 12)
      pwUpdate = ', password_hash = $6'
      params   = [name?.trim(), email?.toLowerCase().trim(), role, active, id, hash]
    }

    const { rows } = await query(
      `UPDATE users SET
         name    = COALESCE($1, name),
         email   = COALESCE($2, email),
         role    = COALESCE($3, role),
         active  = COALESCE($4, active),
         updated_at = NOW()
         ${pwUpdate}
       WHERE id = $5
       RETURNING id, name, email, role, active, storage_limit, created_at`,
      params
    )

    await logActivity(pool, request.user.id, 'USER_UPDATE', 'user', id,
      { storageLimitGb }, request.ip)

    return { user: rows[0] }
  })

  // DELETE /api/users/:id — desativa
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params
    if (id === request.user.id)
      return reply.code(400).send({ error: 'Nao e possivel desativar sua propria conta' })

    const { rows } = await query(
      'UPDATE users SET active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name',
      [id]
    )
    if (!rows[0]) return reply.code(404).send({ error: 'Usuario nao encontrado' })

    await logActivity(pool, request.user.id, 'USER_DEACTIVATE', 'user', id,
      { name: rows[0].name }, request.ip)

    return { message: 'Usuario desativado com sucesso' }
  })
}
