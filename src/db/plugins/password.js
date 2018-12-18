import password from '../../password'

const MIN_PASSWORD_LENGTH = 8

export default function plugin(schema, { name = 'password', method = 'verifyPassword' } = {}) {
  schema.add({
    [name]: {
      type: String,
      required: true,
      minlength: MIN_PASSWORD_LENGTH,
      select: false
    }
  })

  schema.method(method, function(secret) {
    console.log(this, this[name])
    return password.verify(secret, this[name])
  })

  schema.pre('save', async function() {
    if (this.isModified(name)) {
      this[name] = await password.hash(this[name])
    }
  })
}
