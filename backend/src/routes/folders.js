import { query } from '../config/db.js'
import { authenticate, logActivity } from '../middleware/authenticate.js'
import pool from '../config/db.js'

export default async function folderRoutes(fastify) {
  // GET /api/folders - listar pastas
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { parentId, sharedOnly } = request.query
    const isAdmin = request.user.role === 'admin'

    let conditions = []
    let params = []
    let p = 0

    if (sharedOnly === 'true') {
      conditions.push('f.is_shared = TRUE')
      if (parentId === 'null' || parentId === '') {
        // No topo do acervo, mostrar pastas que são compartilhadas 
        // mas cujo pai NÃO é compartilhado (para evitar redundância)
        conditions.push('(f.parent_id IS NULL OR (SELECT is_shared FROM folders p WHERE p.id = f.parent_id) = FALSE)')
      } else {
        conditions.push(`f.parent_id = $${++p}`)
        params.push(parentId)
      }
    } else {
      // Area Privada: Por padrão, mostrar apenas os arquivos do próprio usuário (mesmo Admin)
      const targetUserId = (isAdmin && request.query.userId) ? request.query.userId : request.user.id
      conditions.push(`f.user_id = $${++p}`)
      params.push(targetUserId)
      if (parentId === 'null' || parentId === '') {
        conditions.push('f.parent_id IS NULL')
      } else if (parentId) {
        conditions.push(`f.parent_id = $${++p}`)
        params.push(parentId)
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `WITH RECURSIVE tree AS (
         SELECT id, id as root_id FROM folders
         UNION ALL
         SELECT f.id, t.root_id FROM folders f INNER JOIN tree t ON f.parent_id = t.id
       ),
       stats AS (
         SELECT t.root_id, 
                COUNT(fi.id) as total_files, 
                COALESCE(SUM(fi.size), 0) as total_size
         FROM tree t
         LEFT JOIN files fi ON fi.folder_id = t.id
         GROUP BY t.root_id
       ),
       sub_stats AS (
         SELECT t.root_id, COUNT(DISTINCT t.id) - 1 as total_subfolders
         FROM tree t
         GROUP BY t.root_id
       )
       SELECT f.id, f.name, f.parent_id, f.is_shared, f.created_at, f.user_id,
              u.name as user_name,
              s.total_files as file_count,
              s.total_size as total_size,
              ss.total_subfolders as subfolder_count
       FROM folders f
       JOIN users u ON f.user_id = u.id
       LEFT JOIN stats s ON s.root_id = f.id
       LEFT JOIN sub_stats ss ON ss.root_id = f.id
       ${where}
       ORDER BY f.name ASC`,
      params
    )

    const foldersWithMeta = rows.map(r => ({
      ...r,
      item_count: parseInt(r.file_count) + parseInt(r.subfolder_count)
    }))

    return { folders: foldersWithMeta }
  })

  // GET /api/folders/all - listar todas as pastas (para dropdowns)
  fastify.get('/all', { preHandler: authenticate }, async (request) => {
    const isAdmin = request.user.role === 'admin'
    let queryStr = 'SELECT id, name FROM folders'
    let params = []
    
    if (!isAdmin) {
      queryStr += ' WHERE user_id = $1'
      params.push(request.user.id)
    }
    
    queryStr += ' ORDER BY name ASC'
    const { rows } = await query(queryStr, params)
    return { folders: rows }
  })

  // POST /api/folders - criar pasta
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { name, parentId, isShared } = request.body

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: 'Nome da pasta é obrigatório' })
    }

    const { rows } = await query(
      `INSERT INTO folders (name, user_id, parent_id, is_shared)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, parent_id, is_shared, created_at`,
      [name.trim(), request.user.id, parentId || null, isShared || false]
    )

    await logActivity(pool, request.user.id, 'FOLDER_CREATE', 'folder', rows[0].id,
      { name: name.trim() }, request.ip)

    return { folder: rows[0] }
  })

  // PUT /api/folders/:id - renomear pasta
  fastify.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { name, isShared } = request.body
    const { rows } = await query('SELECT * FROM folders WHERE id = $1', [request.params.id])

    if (!rows[0]) return reply.code(404).send({ error: 'Pasta não encontrada' })

    if (rows[0].user_id !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Sem permissão' })
    }

    const { rows: updated } = await query(
      `UPDATE folders SET name = COALESCE($1, name), is_shared = COALESCE($2, is_shared)
       WHERE id = $3 RETURNING *`,
      [name?.trim() || null, isShared ?? null, request.params.id]
    )

    return { folder: updated[0] }
  })

  // DELETE /api/folders/:id - deletar pasta
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { rows } = await query('SELECT * FROM folders WHERE id = $1', [request.params.id])

    if (!rows[0]) return reply.code(404).send({ error: 'Pasta não encontrada' })

    if (rows[0].user_id !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Sem permissão' })
    }

    const { rows: fileCount } = await query(
      'SELECT COUNT(*) FROM files WHERE folder_id = $1', [request.params.id]
    )

    if (parseInt(fileCount[0].count) > 0) {
      return reply.code(400).send({ error: 'Não é possível deletar pasta com arquivos. Mova ou delete os arquivos primeiro.' })
    }

    await query('DELETE FROM folders WHERE id = $1', [request.params.id])

    await logActivity(pool, request.user.id, 'FOLDER_DELETE', 'folder', rows[0].id,
      { name: rows[0].name }, request.ip)

    return { message: 'Pasta deletada com sucesso' }
  })

  // PATCH /api/folders/:id/is-shared - alternar compartilhamento
  fastify.patch('/:id/is-shared', { preHandler: authenticate }, async (request, reply) => {
    const { isShared } = request.body
    const { rows } = await query('SELECT * FROM folders WHERE id = $1', [request.params.id])

    if (!rows[0]) return reply.code(404).send({ error: 'Pasta não encontrada' })

    if (rows[0].user_id !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Sem permissão' })
    }

    // RECURSIVO: Compartilhar TUDO dentro (pastas e arquivos)
    await query(`
      WITH RECURSIVE subfolders AS (
        SELECT id FROM folders WHERE id = $1
        UNION ALL
        SELECT f.id FROM folders f INNER JOIN subfolders sf ON f.parent_id = sf.id
      )
      UPDATE folders SET is_shared = $2 WHERE id IN (SELECT id FROM subfolders)
    `, [request.params.id, isShared])

    await query(`
      WITH RECURSIVE subfolders AS (
        SELECT id FROM folders WHERE id = $1
        UNION ALL
        SELECT f.id FROM folders f INNER JOIN subfolders sf ON f.parent_id = sf.id
      )
      UPDATE files SET visibility = $2 WHERE folder_id IN (SELECT id FROM subfolders)
    `, [request.params.id, isShared ? 'public' : 'private'])

    await logActivity(pool, request.user.id, 'FOLDER_SHARE', 'folder', request.params.id,
      { name: rows[0].name, isShared, recursive: true }, request.ip)

    return { message: `Pasta e todo conteúdo ${isShared ? 'compartilhados' : 'tornados privados'} com sucesso`, isShared }
  })
}
