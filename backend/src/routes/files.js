import { createWriteStream, createReadStream, existsSync } from 'fs'
import { unlink, stat } from 'fs/promises'
import { join, extname } from 'path'
import { pipeline } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'
import mime from 'mime-types'
import { query } from '../config/db.js'
import { authenticate, logActivity } from '../middleware/authenticate.js'
import pool from '../config/db.js'
import { assertStorageQuota } from '../services/disk.js'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

export default async function fileRoutes(fastify) {

  // ─────────────────────────────────────────────────────────────
  // GET /api/files — lista arquivos proprios (ou todos para admin)
  // ─────────────────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { folderId, userId, search, page = 1, limit = 50 } = request.query
    const offset   = (page - 1) * limit
    const isAdmin  = request.user.role === 'admin'

    let conditions = ['f.version = (SELECT MAX(f2.version) FROM files f2 WHERE f2.version_group_id = f.version_group_id)']
    let params = []
    let p = 0

    // Area Privada: Por padrão, mostrar apenas o que é do usuário logado (incluindo Admin)
    const targetUserId = (isAdmin && userId) ? userId : request.user.id
    conditions.push(`f.user_id = $${++p}`)
    params.push(targetUserId)

    if (folderId === 'null' || folderId === '') {
      conditions.push('f.folder_id IS NULL')
    } else if (folderId) {
      conditions.push(`f.folder_id = $${++p}`)
      params.push(folderId)
    }

    if (search) {
      conditions.push(`f.original_name ILIKE $${++p}`)
      params.push(`%${search}%`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`
    params.push(limit, offset)

    const { rows } = await query(
      `SELECT f.id, f.original_name, f.size, f.mime_type, f.version, f.version_group_id,
              f.description, f.created_at, f.last_accessed_at, f.folder_id, f.visibility,
              u.name AS user_name, u.email AS user_email,
              fo.name AS folder_name
       FROM files f
       JOIN  users   u  ON f.user_id   = u.id
       LEFT JOIN folders fo ON f.folder_id = fo.id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      params
    )

    const { rows: cnt } = await query(
      `SELECT COUNT(*) FROM files f ${where}`,
      params.slice(0, -2)
    )

    return { files: rows, total: parseInt(cnt[0].count), page: +page, limit: +limit }
  })

  // ─────────────────────────────────────────────────────────────
  // GET /api/files/shared — arquivos publicos de todos os usuarios
  // Todos os usuarios autenticados podem ver e baixar.
  // ─────────────────────────────────────────────────────────────
  fastify.get('/shared', { preHandler: authenticate }, async (request) => {
    const { folderId, search, page = 1, limit = 50 } = request.query
    const offset = (page - 1) * limit

    let conditions = [
      'f.version = (SELECT MAX(f2.version) FROM files f2 WHERE f2.version_group_id = f.version_group_id)',
      "(f.visibility = 'public' OR fo.is_shared = TRUE)"
    ]
    let params = []
    let p = 0

    if (folderId === 'null' || folderId === '') {
      conditions.push('f.folder_id IS NULL')
    } else if (folderId) {
      conditions.push(`f.folder_id = $${++p}`)
      params.push(folderId)
    }

    if (search) {
      conditions.push(`f.original_name ILIKE $${++p}`)
      params.push(`%${search}%`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`
    params.push(limit, offset)

    const { rows } = await query(
      `SELECT f.id, f.original_name, f.size, f.mime_type, f.version,
              f.description, f.created_at, f.user_id, f.visibility,
              u.name AS user_name
       FROM files f
       JOIN users u ON f.user_id = u.id
       LEFT JOIN folders fo ON f.folder_id = fo.id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      params
    )

    const { rows: cnt } = await query(
      `SELECT COUNT(*) FROM files f LEFT JOIN folders fo ON f.folder_id = fo.id ${where}`,
      params.slice(0, -2)
    )

    return { files: rows, total: parseInt(cnt[0].count), page: +page, limit: +limit }
  })

  // ─────────────────────────────────────────────────────────────
  // GET /api/files/stats/summary
  // ─────────────────────────────────────────────────────────────
  fastify.get('/stats/summary', { preHandler: authenticate }, async (request) => {
    const isAdmin = request.user.role === 'admin'
    const filter  = isAdmin ? '' : 'WHERE user_id = $1'
    const params  = isAdmin ? [] : [request.user.id]

    const { rows: s } = await query(
      `SELECT 
        (SELECT COUNT(*) FROM files ${filter}) AS total_files,
        (SELECT COALESCE(SUM(size), 0) FROM files ${filter}) AS total_size,
        (SELECT COUNT(*) FROM folders ${filter}) AS total_folders`,
      params
    )

    const { rows: recent } = await query(
      `SELECT f.id, f.original_name, f.size, f.created_at, f.visibility,
              u.name AS user_name
       FROM files f JOIN users u ON f.user_id = u.id
       ${isAdmin ? '' : 'WHERE f.user_id = $1'}
       ORDER BY f.created_at DESC LIMIT 5`,
      params
    )

    return {
      totalFiles:   parseInt(s[0].total_files),
      totalSize:    parseInt(s[0].total_size),
      totalFolders: parseInt(s[0].total_folders),
      recentFiles:  recent
    }
  })

  // ─────────────────────────────────────────────────────────────
  // POST /api/files/upload — com verificacao de quota
  // ─────────────────────────────────────────────────────────────
  fastify.post('/upload', { preHandler: authenticate }, async (request, reply) => {
    // Pre-cheque por content-length (evita desperdicar banda)
    const contentLength = parseInt(request.headers['content-length'] || '0')
    if (contentLength > 0) {
      try {
        await assertStorageQuota(request.user.id, contentLength)
      } catch (err) {
        if (err.statusCode === 413) {
          return reply.code(413).send({
            error: `Limite de armazenamento atingido`,
            used:  err.used,
            limit: err.limit
          })
        }
      }
    }

    const parts = request.parts()
    let fileData    = null
    let folderId    = null
    let description = null
    let visibility  = 'private'

    for await (const part of parts) {
      if (part.type === 'file') {
        const ext        = extname(part.filename) || ''
        const storedName = `${uuidv4()}${ext}`
        const filePath   = join(UPLOADS_DIR, storedName)
        await pipeline(part.file, createWriteStream(filePath))
        const stats = await stat(filePath)
        fileData = {
          originalName: part.filename,
          storedName,
          size:     stats.size,
          mimeType: mime.lookup(part.filename) || part.mimetype || 'application/octet-stream',
          filePath
        }
      } else {
        if (part.fieldname === 'folderId')    folderId    = part.value || null
        if (part.fieldname === 'description') description = part.value || null
        if (part.fieldname === 'visibility')  visibility  = part.value === 'public' ? 'public' : 'private'
      }
    }

    if (!fileData) return reply.code(400).send({ error: 'Nenhum arquivo enviado' })

    // Verificar quota com tamanho real apos upload
    try {
      await assertStorageQuota(request.user.id, fileData.size)
    } catch (err) {
      if (err.statusCode === 413) {
        await unlink(fileData.filePath).catch(() => {})
        return reply.code(413).send({
          error: `Limite de armazenamento atingido`,
          used:  err.used,
          limit: err.limit
        })
      }
    }

    // Versionamento
    const vq = await query(
      `SELECT version_group_id, MAX(version) AS max_version
       FROM files
       WHERE original_name = $1 AND user_id = $2 AND folder_id ${folderId ? '= $3' : 'IS NULL'}
       GROUP BY version_group_id LIMIT 1`,
      folderId
        ? [fileData.originalName, request.user.id, folderId]
        : [fileData.originalName, request.user.id]
    )

    let versionGroupId = uuidv4()
    let version        = 1
    if (vq.rows.length > 0) {
      versionGroupId = vq.rows[0].version_group_id
      version        = parseInt(vq.rows[0].max_version) + 1
    }

    const { rows } = await query(
      `INSERT INTO files
         (original_name, stored_name, size, mime_type, folder_id, user_id,
          version, version_group_id, description, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, original_name, size, mime_type, version, version_group_id, created_at, visibility`,
      [fileData.originalName, fileData.storedName, fileData.size, fileData.mimeType,
       folderId || null, request.user.id, version, versionGroupId, description, visibility]
    )

    await logActivity(pool, request.user.id, 'FILE_UPLOAD', 'file', rows[0].id,
      { name: fileData.originalName, size: fileData.size, version, visibility }, request.ip)

    return {
      file:    rows[0],
      message: version > 1 ? `Nova versao v${version} criada` : 'Arquivo enviado com sucesso'
    }
  })

  // ─────────────────────────────────────────────────────────────
  // GET /api/files/:id/download
  // Arquivos publicos podem ser baixados por qualquer usuario.
  // ─────────────────────────────────────────────────────────────
  fastify.get('/:id/download', { preHandler: authenticate }, async (request, reply) => {
    const { rows } = await query(
      'SELECT f.*, f.user_id AS owner_id FROM files f WHERE f.id = $1',
      [request.params.id]
    )
    if (!rows[0]) return reply.code(404).send({ error: 'Arquivo nao encontrado' })

    const file = rows[0]

    // Permissao: dono, admin, ou arquivo publico
    const canAccess = file.owner_id === request.user.id
      || request.user.role === 'admin'
      || file.visibility === 'public'

    if (!canAccess) return reply.code(403).send({ error: 'Sem permissao para baixar este arquivo' })

    const filePath = join(UPLOADS_DIR, file.stored_name)
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'Arquivo fisico nao encontrado' })

    // Atualiza ultimo acesso (fire-and-forget)
    query('UPDATE files SET last_accessed_at = NOW() WHERE id = $1', [file.id]).catch(() => {})

    await logActivity(pool, request.user.id, 'FILE_DOWNLOAD', 'file', file.id,
      { name: file.original_name, owner: file.owner_id }, request.ip)

    const encodedName = encodeURIComponent(file.original_name)
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`)
    reply.header('Content-Type',    file.mime_type || 'application/octet-stream')
    reply.header('Content-Length',  file.size)
    return reply.send(createReadStream(filePath))
  })

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/files/:id/visibility — alternar publico/privado
  // ─────────────────────────────────────────────────────────────
  fastify.patch('/:id/visibility', { preHandler: authenticate }, async (request, reply) => {
    const { visibility } = request.body

    if (!['private', 'public'].includes(visibility)) {
      return reply.code(400).send({ error: 'visibility deve ser "private" ou "public"' })
    }

    const { rows } = await query('SELECT * FROM files WHERE id = $1', [request.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Arquivo nao encontrado' })

    const file = rows[0]
    if (file.user_id !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Sem permissao' })
    }

    await query('UPDATE files SET visibility = $1 WHERE id = $2', [visibility, file.id])

    await logActivity(pool, request.user.id, 'VISIBILITY_CHANGE', 'file', file.id,
      { name: file.original_name, from: file.visibility, to: visibility }, request.ip)

    return { message: `Arquivo tornado ${visibility === 'public' ? 'publico' : 'privado'}`, visibility }
  })

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/files/:id/rename
  // ─────────────────────────────────────────────────────────────
  fastify.patch('/:id/rename', { preHandler: authenticate }, async (request, reply) => {
    const { name } = request.body
    if (!name?.trim()) return reply.code(400).send({ error: 'Nome inválido' })

    const { rows } = await query('SELECT * FROM files WHERE id = $1', [request.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Arquivo não encontrado' })

    const file = rows[0]
    if (file.user_id !== request.user.id && request.user.role !== 'admin')
      return reply.code(403).send({ error: 'Sem permissão' })

    await query('UPDATE files SET original_name = $1, updated_at = NOW() WHERE id = $2', [name.trim(), file.id])

    await logActivity(pool, request.user.id, 'FILE_RENAME', 'file', file.id,
      { from: file.original_name, to: name.trim() }, request.ip)

    return { success: true }
  })

  // ─────────────────────────────────────────────────────────────
  // GET /api/files/:id/versions
  // ─────────────────────────────────────────────────────────────
  fastify.get('/:id/versions', { preHandler: authenticate }, async (request, reply) => {
    const { rows: fr } = await query(
      'SELECT version_group_id, user_id, visibility FROM files WHERE id = $1',
      [request.params.id]
    )
    if (!fr[0]) return reply.code(404).send({ error: 'Arquivo nao encontrado' })

    const canSee = fr[0].user_id === request.user.id
      || request.user.role === 'admin'
      || fr[0].visibility === 'public'
    if (!canSee) return reply.code(403).send({ error: 'Sem permissao' })

    const { rows } = await query(
      'SELECT id, version, size, created_at FROM files WHERE version_group_id = $1 ORDER BY version DESC',
      [fr[0].version_group_id]
    )
    return { versions: rows }
  })

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/files/:id
  // Somente dono ou admin podem deletar.
  // ─────────────────────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { rows } = await query('SELECT * FROM files WHERE id = $1', [request.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Arquivo nao encontrado' })

    const file = rows[0]
    if (file.user_id !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Sem permissao para deletar este arquivo' })
    }

    const filePath = join(UPLOADS_DIR, file.stored_name)
    await query('DELETE FROM files WHERE id = $1', [file.id])
    try { if (existsSync(filePath)) await unlink(filePath) } catch {}

    await logActivity(pool, request.user.id, 'FILE_DELETE', 'file', file.id,
      { name: file.original_name, visibility: file.visibility }, request.ip)

    return { message: 'Arquivo deletado com sucesso' }
  })

  // ─────────────────────────────────────────────────────────────
  // NOVO: GERA TOKEN TEMPORARIO PARA DOWNLOAD "TURBADO"
  // ─────────────────────────────────────────────────────────────
  fastify.post('/:id/token', { preHandler: authenticate }, async (request, reply) => {
    const { rows } = await query('SELECT * FROM files WHERE id = $1', [request.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Arquivo não encontrado' })

    const file = rows[0]
    const canAccess = file.user_id === request.user.id || request.user.role === 'admin' || file.visibility === 'public'
    if (!canAccess) return reply.code(403).send({ error: 'Sem permissão' })

    // Token curto (1 minuto) apenas para autorizar o stream
    const token = fastify.jwt.sign({ fileId: file.id }, { expiresIn: '1m' })
    return { token }
  })

  // ─────────────────────────────────────────────────────────────
  // NOVO: DOWNLOAD VIA TOKEN (NATIVO DO NAVEGADOR)
  // ─────────────────────────────────────────────────────────────
  fastify.get('/download/turbo', async (request, reply) => {
    const { token } = request.query
    if (!token) return reply.code(400).send({ error: 'Token ausente' })

    try {
      const decoded = fastify.jwt.verify(token)
      const { rows } = await query('SELECT * FROM files WHERE id = $1', [decoded.fileId])
      if (!rows[0]) return reply.code(404).send({ error: 'Arquivo não encontrado ou link expirado' })

      const file = rows[0]
      const filePath = join(UPLOADS_DIR, file.stored_name)
      if (!existsSync(filePath)) return reply.code(404).send({ error: 'Arquivo físico não encontrado' })

      const encodedName = encodeURIComponent(file.original_name)
      reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`)
      reply.header('Content-Type', file.mime_type || 'application/octet-stream')
      reply.header('Content-Length', file.size)
      
      // RLS TURBO: Delegar a entrega física ao Nginx (Zero-Copy)
      // Isso é absurdamente mais rápido porque ignora a camada do Node.js
      return reply.header('X-Accel-Redirect', `/internal_uploads/${file.stored_name}`).send()
    } catch (err) {
      return reply.code(401).send({ error: 'Link de download inválido ou expirado' })
    }
  })
}
