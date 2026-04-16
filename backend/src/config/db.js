import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rls_backup',
  user: process.env.DB_USER || 'rls',
  password: process.env.DB_PASS || 'rls_secret_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexão PostgreSQL:', err)
})

export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (process.env.NODE_ENV !== 'production') {
    console.log('Query executada:', { text: text.substring(0, 80), duration, rows: res.rowCount })
  }
  return res
}

export async function getClient() {
  return pool.connect()
}

export default pool
