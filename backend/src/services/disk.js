import { statfs } from 'fs/promises'
import { query } from '../config/db.js'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

/**
 * Retorna uso real do disco onde os uploads estao armazenados.
 * Usa fs.statfs (Node 19+) — sem dependencias externas.
 */
export async function getDiskStats() {
  const s = await statfs(UPLOADS_DIR)
  const total     = s.blocks  * s.bsize
  const available = s.bavail  * s.bsize   // espaco disponivel para processos nao-root
  const free      = s.bfree   * s.bsize   // espaco livre total (incluindo reserva root)
  const used      = total - free
  const usedPct   = total > 0 ? Math.round((used / total) * 100) : 0
  return { total, used, available, free, usedPct }
}

/**
 * Calcula o total de bytes consumidos por um usuario especifico.
 */
export async function getUserUsage(userId) {
  const { rows } = await query(
    'SELECT COALESCE(SUM(size), 0)::bigint AS used, COUNT(*)::int AS files FROM files WHERE user_id = $1',
    [userId]
  )
  return { used: parseInt(rows[0].used), files: rows[0].files }
}

/**
 * Resumo de uso para todos os usuarios (admin).
 */
export async function getAllUsersUsage() {
  const { rows } = await query(`
    SELECT u.id, u.name, u.email, u.role, u.storage_limit,
           COALESCE(SUM(f.size), 0)::bigint AS used,
           COUNT(f.id)::int                  AS file_count
    FROM users u
    LEFT JOIN files f ON f.user_id = u.id
    WHERE u.active = TRUE
    GROUP BY u.id
    ORDER BY used DESC
  `)
  return rows.map(r => ({
    ...r,
    used:          parseInt(r.used),
    storage_limit: r.storage_limit ? parseInt(r.storage_limit) : null,
    usedPct: r.storage_limit
      ? Math.min(100, Math.round((parseInt(r.used) / parseInt(r.storage_limit)) * 100))
      : null
  }))
}

/**
 * Verifica se o usuario tem espaco disponivel para um novo arquivo.
 * Lanca erro se o limite for excedido.
 */
export async function assertStorageQuota(userId, incomingBytes) {
  const { rows } = await query(
    'SELECT storage_limit FROM users WHERE id = $1',
    [userId]
  )
  const limit = rows[0]?.storage_limit
  if (!limit) return  // sem limite definido

  const { used } = await getUserUsage(userId)
  if (used + incomingBytes > limit) {
    throw Object.assign(new Error('Limite de armazenamento atingido'), {
      statusCode: 413,
      used,
      limit,
    })
  }
}
