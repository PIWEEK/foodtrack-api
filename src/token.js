import crypto from 'crypto'

const KEY = '$3cR3t0Ib3R1c0'

export function create(data) {
  const encodedData = Buffer.from(JSON.stringify(data)).toString('base64')
  const hmac = crypto.createHmac('sha256', KEY)
  const signature = hmac.update(encodedData).digest('base64')
  return `${encodedData}.${signature}`
}

export function verify(token) {
  const [encodedData] = token.split('.')
  const data = JSON.parse(Buffer.from(encodedData, 'base64').toString())
  return create(data) === token
}

export default {
  create,
  verify
}
