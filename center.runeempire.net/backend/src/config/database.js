import mysql2 from 'mysql2/promise'
import 'dotenv/config'

function createPool(prefix) {
  return mysql2.createPool({
    host: process.env[`${prefix}_HOST`],
    port: process.env[`${prefix}_PORT`],
    user: process.env[`${prefix}_USER`],
    password: process.env[`${prefix}_PASSWORD`],
    database: process.env[`${prefix}_NAME`],
    waitForConnections: true,
    connectionLimit: 10,
  })
}

export const WebPool = createPool('DB_WEB')
export const AuthPool = createPool('DB_AUTH')
