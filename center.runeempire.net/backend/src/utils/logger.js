import chalk from 'chalk'

function timestamp() {
  return chalk.gray(`[${new Date().toLocaleTimeString('hu-HU')}]`)
}

export const log = {
  info: (msg) => console.log(`${timestamp()} ${msg}`),
  ok: (msg) => console.log(`${timestamp()} ${chalk.green('[ OK ]')} ${msg}`),
  warn: (msg) => console.warn(`${timestamp()} ${chalk.yellow('[ Warn ]')} ${msg}`),
  error: (msg) => console.error(`${timestamp()} ${chalk.red('[ Error ]')} ${(msg)}`),
  critical: (msg) => console.error(`${timestamp()} ${chalk.red.bold('[ Critical ] ')} ${chalk.red.bold(msg)}`),
}