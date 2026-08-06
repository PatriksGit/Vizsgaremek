import { centerPool } from '../config/database.js'

const TABLE = 'pending_registrations'

export async function findPendingByUsername(username) {
  const [rows] = await centerPool.query(`SELECT id FROM ${TABLE} WHERE username = ?` , [username])
  return rows[0] ?? null
}

export async function findPendingByEmail(email) {
  const [rows] = await centerPool.query(`SELECT id FROM ${TABLE} WHERE email = ?` , [email])
  return rows[0] ?? null
}

export async function createPending({ username, email, passwordHash, code, expiresAt }) {
  const [result] = await centerPool.query(`INSERT INTO ${TABLE} (username, email, password_hash, code, expires_at) VALUES (?, ?, ?, ?, ?)` , [username, email, passwordHash, code, expiresAt])
  return result.insertId
}

export async function deletePending(id) {
  const [result] = await centerPool.query(`DELETE FROM ${TABLE} WHERE id = ?` , [id])
  return result.affectedRows > 0
}