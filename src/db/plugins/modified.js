export default function plugin(schema, { name = 'modified' } = {}) {
  schema.add({
    [name]: {
      type: Date
    }
  })

  schema.pre('save', function() {
    this[name] = new Date()
  })
}
