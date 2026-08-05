import argon2 from 'argon2'

function required(name) {
  const value = Number(process.env[name])
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Hiányzó vagy hibás környezeti változó: ${name}`)
  }
  return value
}

const options = {
  type: argon2.argon2id,
  memoryCost: required('ARGON_MEMORY_COST'),
  timeCost: required('ARGON_TIME_COST'),
  parallelism: required('ARGON_PARALLELISM'),
}

export async function hashPassword(plain) {
  return argon2.hash(plain, options)
}

export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}