import crypto from 'crypto'
import util from 'util'

const randomBytes = util.promisify(crypto.randomBytes)
const scrypt = util.promisify(crypto.scrypt)

const SALT_LENGTH = 128
const KEY_LENGTH = 128
const SEPARATOR = ':'

export function createSalt(length = SALT_LENGTH) {
  return randomBytes(length)
}

export async function hash(password, salt = null) {
  const usedSalt = !salt ? await createSalt() : salt
  const derivedKey = await scrypt(password, usedSalt, KEY_LENGTH)
  return `${derivedKey.toString('base64')}${SEPARATOR}${usedSalt.toString('base64')}`
}

export async function verify(password, hashedPassword) {
  const [, usedSalt] = hashedPassword.split(SEPARATOR)
  return await hash(password, usedSalt) === hashedPassword
}

export default {
  createSalt,
  hash,
  verify
}
