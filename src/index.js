import http from 'http'
import Koa from 'koa'
import helmet from 'koa-helmet'
import compress from 'koa-compress'
import route from 'koa-route'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import mongoose from 'mongoose'
import Status from 'http-status-codes'
import validator from 'validator'

import User from './db/models/User'
import Fridge from './db/models/Fridge'

import token from './token'

mongoose.connect('mongodb://localhost:27017/foodtrack', {
  useCreateIndex: true,
  useNewUrlParser: true
}).then(() => {
  console.log('Database connected')
})

import pkg from '../package.json'

const app = new Koa()
app.use(helmet())
app.use(cors())
app.use(compress())
app.use(bodyParser())
app.use(route.get('/', async (ctx) => {
  ctx.body = {
    version: pkg.version
  }
}))

app.use(route.post('/auth', async (ctx) => {
  const { email, password } = ctx.request.body
  const user = await User.findOne({ email }).select('+password')
  ctx.assert(user, Status.BAD_REQUEST, 'Invalid credentials')
  const isOk = await user.verifyPassword(password)
  ctx.assert(isOk, Status.BAD_REQUEST, 'Invalid credentials')
  ctx.status = Status.CREATED
  ctx.body = {
    token: token.create({
      uid: user._id,
      name: user.name,
      issued: (new Date()).toISOString()
    })
  }
}))

app.use(route.post('/users', async (ctx) => {
  const { name, email, password, fridgeId } = ctx.request.body
  ctx.assert(validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(validator.isEmail(email), Status.BAD_REQUEST, 'Invalid e-mail')
  ctx.assert(validator.isLength(password, { min: 8 }), Status.BAD_REQUEST, 'Invalid password')

  const newUser = new User({
    name,
    email: validator.normalizeEmail(email),
    password
  })

  const savedUser = await newUser.save()
  if (!fridgeId) {
    const newFridge = new Fridge()
    await newFridge.save()
  } else {
    ctx.assert(validator.isMongoId(fridgeId), Status.BAD_REQUEST, 'Invalid fridge id')
    const fridge = await Fridge.findById(fridgeId)
    fridge.users.push(savedUser._id)
    await fridge.save()
  }

  ctx.status = Status.CREATED
  ctx.body = {
    _id: savedUser._id,
    name: savedUser.name,
    email: savedUser.email,
    rawState: savedUser.rawState,
    __v: savedUser.__v
  }
}))

app.use(route.get('/users/:id', async (ctx, id) => {
  const user = await User.findById(id)
  ctx.assert(user, Status.NOT_FOUND, 'User not found')
  ctx.body = user
}))

app.use(route.put('/users/:id', async (ctx, id) => {
  const user = await User.findById(id)
  ctx.assert(user, Status.NOT_FOUND, 'User not found')
  const { name, email, password } = ctx.request.body
  if (name) {
    ctx.assert(validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
    user.name = name
  }
  if (email) {
    ctx.assert(validator.isEmail(email), Status.BAD_REQUEST, 'Invalid e-mail')
    user.email = email
  }
  if (password) {
    ctx.assert(validator.isLength(password, { min: 8 }), Status.BAD_REQUEST, 'Invalid password')
    user.password = password
  }
  await user.save()
  ctx.status = Status.ACCEPTED
  ctx.body = user
}))

app.use(route.delete('/users/:id', async (ctx, id) => {
  ctx.status = Status.NO_CONTENT
}))

app.use(route.get('/fridges', async (ctx) => {

}))

app.use(route.get('/fridges/:fid', async (ctx, fid) => {
  const fridge = await Fridge.findById(id)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.body = fridge
}))

app.use(route.post('/fridges/:fid/tuppers', async (ctx, fid) => {
  const { tagId, name, content, rations, stored, duration, cooked } = ctx.request.body
  ctx.assert(validator.isLength(tagId, { min: 8 }), Status.BAD_REQUEST, 'Invalid tag id')
  ctx.assert(validator.isLength(name, { min: 8 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(validator.isLength(content, { min: 8 }), Status.BAD_REQUEST, 'Invalid content')
  ctx.assert(validator.isNumeric(rations, { min: 0, max: 128 }), Status.BAD_REQUEST, 'Invalid rations')
  ctx.assert(validator.isIn(stored, ['fridge', 'freezer']), Status.BAD_REQUEST, 'Invalid stored value, it must be fridge or freezer')
  ctx.assert(validator.isNumeric(duration, { min: 0, max: 365 }), Status.BAD_REQUEST, 'Invalid duration')
  ctx.assert(validator.toDate(cooked), Status.BAD_REQUEST, 'Invalid cooked value')
  const fridge = await Fridge.findById(id)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  fridge.tuppers.push({
    tagId,
    name,
    content,
    rations: parseInt(rations, 10),
    stored,
    duration: parseInt(duration, 10),
    cooked: validator.toDate(cooked)
  })
  const savedFridge = fridge.save()
  ctx.status = Status.CREATED
  ctx.body = savedFridge
}))

app.use(route.get('/fridges/:fid/tuppers/:tid', async (ctx, fid, tid) => {
  const { useTagId } = ctx.request.query
  const fridge = await Fridge.findById(fid)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  const tupper = fridge.tuppers.find(useTagId
    ? (tupper) => tupper.tagId === tid
    : (tupper) => tupper._id = tid
  )
  ctx.assert(tupper, Status.NOT_FOUND, 'Tupper not found')
  ctx.body = tupper
}))

app.use(route.put('/fridges/:fid/tuppers/:tid', async (ctx, fid, tid) => {
  const { useTagId } = ctx.request.query
  const fridge = await Fridge.findById(fid)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  const tupper = fridge.tuppers.find(useTagId ?
    (tupper) => tupper.tagId === tid :
    (tupper) => tupper._id = tid
  )
  ctx.assert(tupper, Status.NOT_FOUND, 'Tupper not found')
  const { tagId, name, content, rations, stored, duration, cooked } = ctx.request.body
  ctx.assert(validator.isLength(tagId, { min: 8 }), Status.BAD_REQUEST, 'Invalid tag id')
  ctx.assert(validator.isLength(name, { min: 8 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(validator.isLength(content, { min: 8 }), Status.BAD_REQUEST, 'Invalid content')
  ctx.assert(validator.isNumeric(rations, { min: 0, max: 128 }), Status.BAD_REQUEST, 'Invalid rations')
  ctx.assert(validator.isIn(stored, ['fridge', 'freezer']), Status.BAD_REQUEST, 'Invalid stored value, it must be fridge or freezer')
  ctx.assert(validator.isNumeric(duration, { min: 0, max: 365 }), Status.BAD_REQUEST, 'Invalid duration')
  ctx.assert(validator.toDate(cooked), Status.BAD_REQUEST, 'Invalid cooked value')
  if (tagId) {
    tupper.tagId = tagId
  }

  if (name) {
    tupper.name = name
  }

  if (content) {
    tupper.content = content
  }

  if (rations) {
    tupper.rations = parseInt(rations, 10)
  }

  if (stored) {
    tupper.stored = stored
  }

  if (duration) {
    tupper.duration = parseInt(duration, 365)
  }

  if (cooked) {
    tupper.cooked = validator.toDate(cooked)
  }

  const savedFridge = await fridge.save()
  ctx.status = Status.ACCEPTED
  ctx.body = tupper
}))

app.use(route.delete('/fridges/:fid/tuppers/:tid', async (ctx, fid, tid) => {
  const { useTagId } = ctx.request.query
  const fridge = await Fridge.findById(fid)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.status = Status.NO_CONTENT
  const tupper = fridge.tuppers.find(useTagId ?
    (tupper) => tupper.tagId === tid :
    (tupper) => tupper._id = tid
  )
  ctx.assert(tupper, Status.NOT_FOUND, 'Tupper not found')
  ctx.body = tupper
}))

const httpServer = http.createServer(app.callback())
httpServer.listen(3000)
