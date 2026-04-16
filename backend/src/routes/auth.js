import bcrypt from 'bcrypt'
import { query } from '../config/db.js'
import { authenticate, logActivity } from '../middleware/authenticate.js'
import pool from '../config/db.js'

export default async function authRoutes(fastify) {
  // POST /api/auth/login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body
    const ip = request.ip

    const { rows } = await query(
      'SELECT id, name, email, password_hash, role, active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    const user = rows[0]

    if (!user || !user.active) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await logActivity(pool, user.id, 'LOGIN_FAILED', 'user', user.id, { email }, ip)
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '8h' }
    )

    await logActivity(pool, user.id, 'LOGIN', 'user', user.id, {}, ip)

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  })

  // GET /api/auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request) => {
    return { user: request.user }
  })

  // POST /api/auth/change-password
  fastify.post('/change-password', { preHandler: authenticate }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body
    const ip = request.ip

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return reply.code(400).send({ error: 'Nova senha deve ter no mínimo 6 caracteres' })
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [request.user.id])
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash)

    if (!valid) {
      return reply.code(401).send({ error: 'Senha atual incorreta' })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, request.user.id])
    await logActivity(pool, request.user.id, 'PASSWORD_CHANGED', 'user', request.user.id, {}, ip)

    return { message: 'Senha alterada com sucesso' }
  })
}
