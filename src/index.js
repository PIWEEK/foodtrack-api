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

mongoose.connect(process.env.MONGODB || 'mongodb://localhost:27017/foodtrack', {
  useCreateIndex: true,
  useNewUrlParser: true
}).then(() => {
  console.log('Database connected')
})

import pkg from '../package.json'

const app = new Koa()
app.use(helmet())
app.use(cors({
  credentials: true
}))
app.use(compress())
app.use(bodyParser())
app.use(async (ctx, next) => {
  const authToken = ctx.cookies.get('token')
    || (ctx.headers.Authorization
      && ctx.headers.Authorization.replace(/Bearer/,''))
  if (authToken) {
    const authData = token.verify(authToken)
    ctx.assert(authData, Status.UNAUTHORIZED, 'Invalid token')
    ctx.state.user = await User.findById(authData._id)
  }
  await next()
})

/**
 * API root
 */
app.use(route.get('/', async (ctx) => {
  ctx.body = {
    version: pkg.version
  }
}))

/**
 * Autenticación.
 */
app.use(route.post('/auth', async (ctx) => {
  const { email, password } = ctx.request.body
  const user = await User.findOne({ email })
    .select('+password')
  ctx.assert(user, Status.FORBIDDEN, 'Invalid credentials')
  const isOk = await user.verifyPassword(password)
  ctx.assert(isOk, Status.FORBIDDEN, 'Invalid credentials')
  ctx.status = Status.CREATED
  const authToken = token.create({
    _id: user._id,
    name: user.name,
    issued: (new Date()).toISOString()
  })
  ctx.cookies.set('token', authToken)
  ctx.body = {
    token: authToken
  }
}))

/**
 * A partir de aquí tenemos todas las rutas de usuarios.
 */
app.use(route.post('/users', async (ctx) => {
  const { name, email, password, fridgeId } = ctx.request.body
  ctx.assert(name && validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(email && validator.isEmail(email), Status.BAD_REQUEST, 'Invalid e-mail')
  ctx.assert(password && validator.isLength(password, { min: 8 }), Status.BAD_REQUEST, 'Invalid password')

  const newUser = new User({
    name,
    email: validator.normalizeEmail(email),
    password
  })

  const savedUser = await newUser.save()
  if (!fridgeId) {
    const newFridge = new Fridge({
      users: [savedUser._id]
    })
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

app.use(route.get('/users/:id', async (ctx, uid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const user = await User.findById(uid)
  ctx.assert(user, Status.NOT_FOUND, 'User not found')
  ctx.body = user
}))

app.use(route.put('/users/:id', async (ctx, uid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  ctx.assert(ctx.state.user._id === uid, Status.UNAUTHORIZED)
  const user = await User.findById(uid)
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

app.use(route.delete('/users/:id', async (ctx, uid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  ctx.assert(ctx.state.user._id === uid, Status.UNAUTHORIZED)
  const token = ctx.cookies.get('token')
  const data = token.verify(token)
  ctx.assert(data, Status.UNAUTHORIZED, 'Invalid token')
  // De momento sólo un usuario puede borrarse a sí mismo.
  ctx.assert(data._id === uid, Status.UNAUTHORIZED, 'Invalid user')
  await User.findByIdAndRemove(uid)
  ctx.status = Status.NO_CONTENT
}))

/**
 * A partir de aquí están todas las rutas de tuppers.
 */
app.use(route.post('/tuppers', async (ctx) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const { tagId, tupperId, name, content, servings, storedAt, notifyMeAt, cookedAt } = ctx.request.body
  ctx.assert(tagId && validator.isLength(tagId, { min: 8 }), Status.BAD_REQUEST, 'Invalid tag id')
  ctx.assert(tupperId && validator.isLength(tupperId, { min: 1 }), Status.BAD_REQUEST, 'Invalid tupper id')
  ctx.assert(name && validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(content && validator.isLength(content, { min: 1 }), Status.BAD_REQUEST, 'Invalid content')
  if (typeof servings === 'string') {
    ctx.assert(servings && validator.isNumeric(servings, { min: 0, max: 128 }), Status.BAD_REQUEST, 'Invalid servings')
  }
  ctx.assert(storedAt && validator.isIn(storedAt, ['fridge', 'freezer']), Status.BAD_REQUEST, 'Invalid storedAt value, it must be fridge or freezer')
  ctx.assert(notifyMeAt && validator.toDate(notifyMeAt), Status.BAD_REQUEST, 'Invalid notifyMeAt value')
  ctx.assert(cookedAt && validator.toDate(cookedAt), Status.BAD_REQUEST, 'Invalid cookedAt value')
  const fridge = await Fridge.findOne({
    users: [ctx.state.user._id]
  })
  ctx.assert(fridge, Status.NOT_FOUND, 'User does not have a fridge')
  const newTupper = fridge.tuppers.create({
    tupperId,
    tagId,
    name,
    content,
    servings: parseInt(servings, 10),
    storedAt,
    notifyMeAt: validator.toDate(notifyMeAt),
    cookedAt: validator.toDate(cookedAt)
  })
  fridge.tuppers.push(newTupper)
  await fridge.save()
  ctx.status = Status.CREATED
  ctx.body = newTupper
}))

app.use(route.get('/tuppers', async (ctx) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const fridge = await Fridge.findOne({
    users: [ctx.state.user._id]
  })
  ctx.assert(fridge, Status.NOT_FOUND, 'User does not have a fridge')
  ctx.body = fridge.tuppers
}))

app.use(route.get('/tuppers/:tid', async (ctx, tid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const fridge = await Fridge.findOne({
    users: [ctx.state.user._id]
  })
  ctx.assert(fridge, Status.NOT_FOUND, 'User does not have a fridge')
  console.log(fridge)
  const tupper = fridge.tuppers.id(tid)
  console.log(tupper)
  ctx.assert(tupper, Status.NOT_FOUND, 'User does not have that tupper')
  await fridge.save()
  ctx.body = tupper
}))

app.use(route.put('/tuppers/:tid', async (ctx, tid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const fridge = await Fridge.findOne({
    users: [ctx.state.user._id]
  })
  ctx.assert(fridge, Status.NOT_FOUND, 'User does not have a fridge')
  const tupper = fridge.tuppers.id(tid)
  ctx.assert(tupper, Status.NOT_FOUND, 'User does not have that tupper')
  const {
    tagId,
    tupperId,
    name,
    content,
    servings,
    storedAt,
    notifyMeAt,
    cookedAt
  } = ctx.request.body
  if (tagId) {
    ctx.assert(validator.isLength(tagId, { min: 8 }), Status.BAD_REQUEST, 'Invalid tag id')
    tupper.tagId = tagId
  }
  if (tupperId) {
    ctx.assert(tupperId && validator.isLength(tupperId, { min: 1 }), Status.BAD_REQUEST, 'Invalid tupper id')
    tupper.tupperId = tupperId
  }
  if (name) {
    ctx.assert(name && validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
    tupper.name = name
  }
  if (content) {
    ctx.assert(content && validator.isLength(content, { min: 1 }), Status.BAD_REQUEST, 'Invalid content')
    tupper.content = content
  }
  if (storedAt) {
    ctx.assert(storedAt && validator.isIn(storedAt, ['fridge', 'freezer']), Status.BAD_REQUEST, 'Invalid storedAt value, it must be fridge or freezer')
    tupper.storedAt = storedAt
  }
  if (notifyMeAt) {
    ctx.assert(notifyMeAt && validator.toDate(notifyMeAt), Status.BAD_REQUEST, 'Invalid notifyMeAt value')
    tupper.notifyMeAt = validator.toDate(notifyMeAt)
  }
  if (cookedAt) {
    ctx.assert(cookedAt && validator.toDate(cookedAt), Status.BAD_REQUEST, 'Invalid cookedAt value')
    tupper.cookedAt = validator.toDate(cookedAt)
  }
  if (servings !== undefined) {
    if (typeof servings === 'string') {
      ctx.assert(servings && validator.isNumeric(servings, {
        min: 0,
        max: 128
      }), Status.BAD_REQUEST, 'Invalid servings')
    }
    // Si el valor de servings es negativo, entonces lo que hacemos
    // es restar tantos como hayamos indicado.
    if (servings < 0) {
      tupper.servings = Math.max(0, tupper.servings + servings)
    } else {
      tupper.servings = servings
    }

    // TODO: Podemos crear un histórico si en este caso convertimos
    // el tupper a un histórico de tuppers.
    // Borramos el tupper si el número de servings es 0.
    if (tupper.servings === 0) {
      tupper.remove()
    }
  }
  await fridge.save()
  if (tupper.servings) {
    ctx.status = Status.ACCEPTED
    ctx.body = tupper
  } else {
    ctx.status = Status.NO_CONTENT
  }
}))

app.use(route.delete('/tuppers/:tid', async (ctx, tid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const fridge = await Fridge.findOne({
    users: [ctx.state.user._id]
  })
  ctx.assert(fridge, Status.NOT_FOUND, 'User does not have a fridge')
  const tupper = fridge.tuppers.id(tid)
  tupper.remove()
  await fridge.save()
  ctx.status = Status.NO_CONTENT
}))

/**
 * A partir de aquí están todas las rutas para trabajar con frigos
 * y tuppers.
 */
app.use(route.get('/fridges', async (ctx) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const fridges = await Fridge.find({
    users: [ctx.state.user._id]
  })
  ctx.body = fridges
}))

app.use(route.get('/fridges/:fid', async (ctx, fid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const fridge = await Fridge.findById(id)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.body = fridge
}))

app.use(route.post('/fridges/:fid/tuppers', async (ctx, fid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const { tagId, tupperId, name, content, servings, storedAt, notifyMeAt, cookedAt } = ctx.request.body
  ctx.assert(validator.isLength(tagId, { min: 8 }), Status.BAD_REQUEST, 'Invalid tag id')
  ctx.assert(validator.isLength(tupperId, { min: 0 }), Status.BAD_REQUEST, 'Invalid tupper id')
  ctx.assert(validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(validator.isLength(content, { min: 1 }), Status.BAD_REQUEST, 'Invalid content')
  ctx.assert(validator.isNumeric(servings, { min: 0, max: 128 }), Status.BAD_REQUEST, 'Invalid servings')
  ctx.assert(validator.isIn(storedAt, ['fridge', 'freezer']), Status.BAD_REQUEST, 'Invalid storedAt value, it must be fridge or freezer')
  ctx.assert(validator.toDate(notifyMeAt), Status.BAD_REQUEST, 'Invalid notifyMeAt value')
  ctx.assert(validator.toDate(cookedAt), Status.BAD_REQUEST, 'Invalid cookedAt value')
  const fridge = await Fridge.findById(id)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.assert(fridge.users.includes(ctx.state.user._id), Status.UNAUTHORIZED)
  fridge.tuppers.push({
    tagId,
    name,
    content,
    servings: parseInt(servings, 10),
    storedAt,
    notifyMeAt: validator.toDate(notifyMeAt),
    cookedAt: validator.toDate(cookedAt)
  })
  const savedFridge = fridge.save()
  ctx.status = Status.CREATED
  ctx.body = savedFridge
}))

app.use(route.get('/fridges/:fid/tuppers/:tid', async (ctx, fid, tid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const { useTagId } = ctx.request.query
  const fridge = await Fridge.findById(fid)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.assert(fridge.users.includes(ctx.state.user._id), Status.UNAUTHORIZED)
  const tupper = fridge.tuppers.find(useTagId
    ? (tupper) => tupper.tagId === tid
    : (tupper) => tupper._id = tid
  )
  ctx.assert(tupper, Status.NOT_FOUND, 'Tupper not found')
  ctx.body = tupper
}))

app.use(route.put('/fridges/:fid/tuppers/:tid', async (ctx, fid, tid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const { useTagId } = ctx.request.query
  const fridge = await Fridge.findById(fid)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.assert(fridge.users.includes(ctx.state.user._id), Status.UNAUTHORIZED)
  const tupper = fridge.tuppers.find(useTagId ?
    (tupper) => tupper.tagId === tid :
    (tupper) => tupper._id = tid
  )
  ctx.assert(tupper, Status.NOT_FOUND, 'Tupper not found')
  const { tagId, name, content, servings, storedAt, notifyMeAt, cookedAt } = ctx.request.body
  ctx.assert(validator.isLength(tagId, { min: 8 }), Status.BAD_REQUEST, 'Invalid tag id')
  ctx.assert(validator.isLength(name, { min: 1 }), Status.BAD_REQUEST, 'Invalid name')
  ctx.assert(validator.isLength(content, { min: 1 }), Status.BAD_REQUEST, 'Invalid content')
  ctx.assert(validator.isNumeric(servings, { min: 0, max: 128 }), Status.BAD_REQUEST, 'Invalid servings')
  ctx.assert(validator.isIn(storedAt, ['fridge', 'freezer']), Status.BAD_REQUEST, 'Invalid storedAt value, it must be fridge or freezer')
  ctx.assert(validator.toDate(notifyMeAt), Status.BAD_REQUEST, 'Invalid cookedAt value')
  ctx.assert(validator.toDate(cookedAt), Status.BAD_REQUEST, 'Invalid cookedAt value')
  if (tagId) {
    tupper.tagId = tagId
  }

  if (name) {
    tupper.name = name
  }

  if (content) {
    tupper.content = content
  }

  if (servings) {
    tupper.servings = parseInt(servings, 10)
  }

  if (storedAt) {
    tupper.storedAt = storedAt
  }

  if (notifyMeAt) {
    tupper.notifyMeAt = validator.toDate(notifyMeAt)
  }

  if (cookedAt) {
    tupper.cookedAt = validator.toDate(cookedAt)
  }

  const savedFridge = await fridge.save()
  ctx.status = Status.ACCEPTED
  ctx.body = tupper
}))

app.use(route.delete('/fridges/:fid/tuppers/:tid', async (ctx, fid, tid) => {
  ctx.assert(ctx.state.user, Status.UNAUTHORIZED, 'Invalid auth token')
  const { useTagId } = ctx.request.query
  const fridge = await Fridge.findById(fid)
  ctx.assert(fridge, Status.NOT_FOUND, 'Fridge not found')
  ctx.assert(fridge.users.includes(ctx.state.user._id), Status.UNAUTHORIZED)
  ctx.status = Status.NO_CONTENT
  const tupper = fridge.tuppers.find(useTagId ?
    (tupper) => tupper.tagId === tid :
    (tupper) => tupper._id = tid
  )
  ctx.assert(tupper, Status.NOT_FOUND, 'Tupper not found')
  ctx.body = tupper
}))

if (process.env.FOODTRACK_API === 'NOW') {
  module.exports = app.callback()
} else {
  const httpServer = http.createServer(app.callback())
  httpServer.listen(3000, '0.0.0.0')
}
