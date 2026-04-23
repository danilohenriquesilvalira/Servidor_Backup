import { query } from '../config/db.js'
import { authenticate, requireAdmin } from '../middleware/authenticate.js'

export default async function logRoutes(fastify) {

  // GET /api/logs — listar logs (admin vê tudo, user vê os próprios)
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { page = 1, limit = 50, userId, action, search, since } = request.query
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200)
    const safePage  = Math.max(parseInt(page) || 1, 1)
    const offset    = (safePage - 1) * safeLimit
    const isAdmin = request.user.role === 'admin'

    let conditions = []
    let params = []
    let p = 0

    if (!isAdmin) {
      conditions.push(`l.user_id = $${++p}`)
      params.push(request.user.id)
    } else if (userId) {
      conditions.push(`l.user_id = $${++p}`)
      params.push(userId)
    }

    if (action) {
      conditions.push(`l.action = $${++p}`)
      params.push(action)
    }

    if (search) {
      conditions.push(`(
        u.name ILIKE $${++p} OR
        l.details::text ILIKE $${p} OR
        l.action ILIKE $${p}
      )`)
      params.push(`%${search}%`)
    }

    if (since) {
      conditions.push(`l.created_at >= $${++p}`)
      params.push(since)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const dataParams = [...params, safeLimit, offset]

    const { rows } = await query(
      `SELECT l.id, l.action, l.resource_type, l.resource_id, l.details,
              l.ip_address, l.created_at,
              u.name  AS user_name,
              u.email AS user_email
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      dataParams
    )

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ${where}`,
      params
    )

    return {
      logs:  rows,
      total: parseInt(countRows[0].count),
      page:  safePage,
      limit: safeLimit
    }
  })

  // GET /api/logs/actions — tipos distintos de ações
  fastify.get('/actions', { preHandler: requireAdmin }, async () => {
    const { rows } = await query(
      'SELECT DISTINCT action FROM activity_logs ORDER BY action ASC'
    )
    return { actions: rows.map(r => r.action) }
  })

  // GET /api/logs/stats — contadores por ação para o dashboard de logs
  fastify.get('/stats', { preHandler: authenticate }, async (request) => {
    const isAdmin = request.user.role === 'admin'
    const filter  = isAdmin ? '' : 'WHERE user_id = $1'
    const params  = isAdmin ? [] : [request.user.id]

    const { rows: byAction } = await query(
      `SELECT action, COUNT(*)::int AS count
       FROM activity_logs
       ${filter}
       GROUP BY action
       ORDER BY count DESC`,
      params
    )

    const { rows: byDay } = await query(
      `SELECT created_at::date AS day, COUNT(*)::int AS count
       FROM activity_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'
       ${isAdmin ? '' : 'AND user_id = $1'}
       GROUP BY created_at::date
       ORDER BY day ASC`,
      params
    )

    const { rows: recent } = await query(
      `SELECT l.action, l.created_at, u.name AS user_name
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${filter}
       ORDER BY l.created_at DESC
       LIMIT 5`,
      params
    )

    return { byAction, byDay, recent }
  })

  // GET /api/logs/users — lista usuários com atividade (admin only)
  fastify.get('/users', { preHandler: requireAdmin }, async () => {
    const { rows } = await query(`
      SELECT DISTINCT u.id, u.name, u.email
      FROM activity_logs l
      JOIN users u ON l.user_id = u.id
      ORDER BY u.name ASC
    `)
    return { users: rows }
  })
}
