import { authPool} from '../config/database.js'

export async function findByUsername(username) {
  const [rows] = await authPool.query('SELECT username FROM accounts WHERE username = ?', [username])
  return rows[0] ?? null
}

export async function findByEmail(email) {
    const [rows] = await authPool.query('SELECT username FROM accounts WHERE email = ?', [email])
    return rows[0] ?? null
}

export async function createAccount({ uuid, username, displayName, passwordHash, email }) {
  const [result] = await authPool.query(
    `INSERT INTO accounts (uuid, username, display_name, password_hash, email)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid, username, displayName, passwordHash, email]
  )
  return result.insertId
}