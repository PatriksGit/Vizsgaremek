import 'dotenv/config'
import app from './app.js'
import { testConnections } from './config/database.js'
import { log } from './utils/logger.js'

const PORT = process.env.PORT || 3000

if (!await testConnections()) {
  log.error('Adatbázis nem elérhető.')
  process.exit(1)
}

app.listen(PORT, () => {
  log.ok(`A backend elindult: http://localhost:${PORT}`)
})