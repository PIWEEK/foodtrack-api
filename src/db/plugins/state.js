export default function plugin(schema, { name = 'state', internalName = 'rawState', default: defaultValue, enum: values, transitions } = {}) {
  schema.add({
    [internalName]: {
      type: String,
      default: defaultValue,
      enum: values
    }
  })

  schema.virtual(name).set(function(newState) {
    const currentState = this[internalName]
    if (!(currentState in transitions)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`)
    }
    const availableTransitions = transitions[currentState]
    if (!availableTransitions.includes(value)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`)
    }
    this[internalName] = newState
  })

  schema.virtual(name).get(function() {
    return this[internalName]
  })
}
