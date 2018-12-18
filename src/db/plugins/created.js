export default function plugin(schema, { name = 'created' } = {}) {
  schema.add({
    [name]: {
      type: Date
    }
  })

  schema.pre('save', function() {
    if (this.isNew) {
      this[name] = new Date()
    }
  })
}
