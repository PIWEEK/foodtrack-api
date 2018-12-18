import crypto from 'crypto'
import util from 'util'

const randomBytes = util.promisify(crypto.randomBytes)
const scrypt = util.promisify(crypto.scrypt)

const SALT_LENGTH = 128
const KEY_LENGTH = 128
const SEPARATOR = ':'

/**
 * Devuelve un salt.
 * @param {number} length
 * @returns {Promise<string>}
 */
export function createSalt(length = SALT_LENGTH) {
  return randomBytes(length).toString('base64')
}

/**
 * Hashea una contraseña.
 * @param {string} password
 * @param {string} salt
 * @returns {Promise<string|Error>}
 */
export async function hash(password, salt) {
  const usedSalt = !salt ? await createSalt() : salt
  const derivedKey = await scrypt(password, usedSalt, KEY_LENGTH)
  return `${derivedKey.toString('base64')}${SEPARATOR}${usedSalt.toString('base64')}`
}

/**
 * Verifica si la contraseña pasada coincide con su versión hasheada.
 * @param {string} password
 * @param {string} hashedPassword
 * @returns {Promise<boolean|Error>}
 */
export async function verify(password, hashedPassword) {
  const [, usedSalt] = hashedPassword.split(SEPARATOR)
  return await hash(password, usedSalt) === hashedPassword
}

export default {
  createSalt,
  hash,
  verify
}
