import mysql2 from 'mysql2/promise'
import { log } from '../utils/logger.js'

function createPool(prefix) {
    return mysql2.createPool({
      host: process.env[`${prefix}_HOST`],
      port: Number(process.env[`${prefix}_PORT`]),
      user: process.env[`${prefix}_USER`],
      password: process.env[`${prefix}_PASSWORD`],
      database: process.env[`${prefix}_NAME`],
      waitForConnections: true,
      connectionLimit: 10,
      timezone: 'Z',
  })
}

export const webPool = createPool('DB_WEB')
export const authPool = createPool('DB_AUTH')

const pools = {
  web: webPool,
  auth: authPool,
}

export async function testConnections() {
  for (const [name, pool] of Object.entries(pools)) {
    try {
      await pool.query('SELECT 1')
      log.ok(`${name}: sikeres kapcsolat`)
    } catch (error) {
      log.error(`${name} : sikertelen kapcsolat : ${error.message}`)
    }
  }
}