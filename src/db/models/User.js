import mongoose, { Schema } from 'mongoose'
import isEmail from 'validator/lib/isEmail'
import created from '../plugins/created'
import modified from '../plugins/modified'
import state from '../plugins/state'
import password from '../plugins/password'

const UserState = {
  NOT_ENABLED: 'not-enabled',
  ENABLED: 'enabled',
  DISABLED: 'disabled'
}

const UserStateDefault = UserState.NOT_ENABLED

const UserStateEnum = [
  UserState.NOT_ENABLED,
  UserState.ENABLED,
  UserState.DISABLED
]

const UserStateTransitions = {
  [UserState.NOT_ENABLED]: [UserState.ENABLED],
  [UserState.ENABLED]: [UserState.DISABLED]
}

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    index: true
  },
  email: {
    type: String,
    validate: isEmail,
    unique: true,
    select: false
  }
})

UserSchema.plugin(created)
UserSchema.plugin(modified)
UserSchema.plugin(state, {
  default: UserStateDefault,
  enum: UserStateEnum,
  transitions: UserStateTransitions
})
UserSchema.plugin(password)

export default mongoose.model('user', UserSchema)
