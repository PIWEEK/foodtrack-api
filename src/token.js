import crypto from 'crypto'

const KEY = '$3cR3t0Ib3R1c0'

/**
 * Crea un nuevo token a partir de unos datos.
 * @param {object} data
 * @returns {string}
 */
export function create(data) {
  const encodedData = Buffer.from(JSON.stringify(data)).toString('base64')
  const hmac = crypto.createHmac('sha256', KEY)
  const signature = hmac.update(encodedData).digest('base64')
  return `${encodedData}.${signature}`
}

/**
 * Verifica que un token.
 * @param {string} token
 * @returns {object|null}
 */
export function verify(token) {
  const [encodedData] = token.split('.')
  const data = JSON.parse(Buffer.from(encodedData, 'base64').toString())
  if (create(data) === token) {
    return data
  }
  return null
}

export default {
  create,
  verify
}
