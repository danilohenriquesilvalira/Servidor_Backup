import { getDiskStats, getAllUsersUsage, getUserUsage } from '../services/disk.js'
import { authenticate, requireAdmin } from '../middleware/authenticate.js'
import { query } from '../config/db.js'

export default async function systemRoutes(fastify) {

  // GET /api/system/disk — espaço do disco (qualquer usuário autenticado)
  fastify.get('/disk', { preHandler: authenticate }, async (_req, reply) => {
    try {
      return { disk: await getDiskStats() }
    } catch (err) {
      fastify.log.error('getDiskStats error:', err)
      return reply.code(500).send({ error: 'Não foi possível ler informações do disco' })
    }
  })

  // GET /api/system/storage — resumo de uso
  //   Admin  → todos os usuários + disco
  //   User   → próprio uso + limite
  fastify.get('/storage', { preHandler: authenticate }, async (request) => {
    if (request.user.role === 'admin') {
      const [users, disk] = await Promise.all([getAllUsersUsage(), getDiskStats()])
      return { users, disk }
    }

    const [usage, limitRow] = await Promise.all([
      getUserUsage(request.user.id),
      query('SELECT storage_limit FROM users WHERE id = $1', [request.user.id])
    ])
    const limit = limitRow.rows[0]?.storage_limit
      ? parseInt(limitRow.rows[0].storage_limit)
      : null

    return {
      used:    usage.used,
      files:   usage.files,
      limit,
      usedPct: limit ? Math.min(100, Math.round((usage.used / limit) * 100)) : null
    }
  })

  // GET /api/system/charts — dados agregados para gráficos do dashboard
  // Admin  → visão completa do servidor
  // User   → visão dos próprios dados
  fastify.get('/charts', { preHandler: authenticate }, async (request) => {
    const userId = request.user.id
    const isAdmin = request.user.role === 'admin'

    // Série de 30 dias com uploads diários
    const dailyUploads = await query(`
      SELECT
        dates.day::date AS day,
        COALESCE(daily.uploads, 0)   AS uploads,
        COALESCE(daily.size_added, 0) AS size_added
      FROM
        generate_series(
          (NOW() - INTERVAL '29 days')::date,
          NOW()::date,
          '1 day'::interval
        ) AS dates(day)
      LEFT JOIN (
        SELECT
          created_at::date AS day,
          COUNT(*)          AS uploads,
          SUM(size)         AS size_added
        FROM files
        WHERE created_at >= NOW() - INTERVAL '30 days'
          ${isAdmin ? '' : 'AND user_id = $1'}
        GROUP BY created_at::date
      ) daily ON daily.day = dates.day
      ORDER BY dates.day ASC
    `, isAdmin ? [] : [userId])

    // Total acumulado anterior à janela (base para o gráfico cumulativo)
    const baseRow = await query(`
      SELECT COALESCE(SUM(size), 0)::bigint AS base
      FROM files
      WHERE created_at < NOW() - INTERVAL '30 days'
        ${isAdmin ? '' : 'AND user_id = $1'}
    `, isAdmin ? [] : [userId])

    const base = parseInt(baseRow.rows[0].base)

    // Gera série cumulativa no backend
    let cumulative = base
    const dailyRows = dailyUploads.rows.map(r => {
      cumulative += parseInt(r.size_added)
      return {
        day:       r.day,
        uploads:   parseInt(r.uploads),
        sizeAdded: parseInt(r.size_added),
        cumulative
      }
    })

    // Atividade por hora (últimas 24 h) — para o heatmap de admin
    const hourly = isAdmin ? await query(`
      SELECT
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*) AS count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `) : null

    // Uso por usuário (apenas admin)
    const userUsage = isAdmin ? await getAllUsersUsage() : null

    // Disco (apenas admin)
    const disk = isAdmin ? await getDiskStats() : null

    // Tipos de ação nos últimos 30 dias
    const actionStats = await query(`
      SELECT action, COUNT(*)::int AS count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
        ${isAdmin ? '' : 'AND user_id = $1'}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `, isAdmin ? [] : [userId])

    // Top 5 arquivos mais baixados nos últimos 30 dias
    const topDownloads = await query(`
      SELECT
        l.details->>'name' AS name,
        COUNT(*)::int       AS downloads
      FROM activity_logs l
      WHERE l.action = 'FILE_DOWNLOAD'
        AND l.created_at >= NOW() - INTERVAL '30 days'
        ${isAdmin ? '' : 'AND l.user_id = $1'}
      GROUP BY l.details->>'name'
      ORDER BY downloads DESC
      LIMIT 5
    `, isAdmin ? [] : [userId])

    return {
      daily: dailyRows,
      actionStats: actionStats.rows,
      topDownloads: topDownloads.rows,
      ...(isAdmin && {
        userUsage,
        disk,
        hourly: hourly.rows,
      })
    }
  })
}
