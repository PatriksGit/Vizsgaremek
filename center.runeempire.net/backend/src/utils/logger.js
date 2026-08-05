import chalk from 'chalk'

function timestamp() {
  return chalk.gray(`[${new Date().toLocaleTimeString('hu-HU')}]`)
}

export const log = {
  info: (msg) => console.log(`${timestamp()} ${msg}`),
  ok: (msg) => console.log(`${timestamp()} ${chalk.green('[ OK ]')} ${msg}`),
  warn: (msg) => console.warn(`${timestamp()} ${chalk.yellow('[ Warn ]')} ${msg}`),
  error: (msg) => console.error(`${timestamp()} ${chalk.red('[ HIBA ]')} ${chalk.red(msg)}`),
}