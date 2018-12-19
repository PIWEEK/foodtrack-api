import mongoose, { Schema } from 'mongoose'
import created from '../plugins/created'
import modified from '../plugins/modified'

const TupperStore = {
  FRIDGE: 'fridge',
  FREEZER: 'freezer'
}

const TupperStoreDefault = TupperStore.FRIDGE

const TupperStoreEnum = [TupperStore.FRIDGE, TupperStore.FREEZER]

const TupperSchema = new Schema({
  tagId: String,
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  servings: {
    type: Number,
    default: 1,
    min: 0,
    max: 128
  },
  storedAt: {
    type: String,
    default: TupperStoreDefault,
    enum: TupperStoreEnum
  },
  notifyMeAt: {
    type: Date
  },
  cookedAt: {
    type: Date
  }
})

TupperSchema.plugin(created)
TupperSchema.plugin(modified)

TupperSchema.pre('save', function() {
  if (this.isNew && !this.cooked) {
    this.cooked = new Date()
  }
})

const FridgeSchema = new Schema({
  users: [mongoose.ObjectId],
  tuppers: [TupperSchema]
})

FridgeSchema.plugin(created)
FridgeSchema.plugin(modified)

export default mongoose.model('fridge', FridgeSchema)
