import { query } from '../config/db.js'

export async function authenticate(request, reply) {
  try {
    await request.jwtVerify()
    const { rows } = await query(
      'SELECT id, name, email, role, active FROM users WHERE id = $1',
      [request.user.id]
    )
    if (!rows[0] || !rows[0].active) {
      return reply.code(401).send({ error: 'Usuário não encontrado ou inativo' })
    }
    request.user = rows[0]
  } catch (err) {
    return reply.code(401).send({ error: 'Token inválido ou expirado' })
  }
}

export async function requireAdmin(request, reply) {
  await authenticate(request, reply)
  if (request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Acesso restrito a administradores' })
  }
}

export async function logActivity(pool, userId, action, resourceType, resourceId, details, ip) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, resourceType, resourceId, JSON.stringify(details || {}), ip]
    )
  } catch (err) {
    console.error('Erro ao registrar log de atividade:', err)
  }
}
