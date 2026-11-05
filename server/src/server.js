import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'
import { ensureAdmin } from './seedAdmin.js'

const port = Number(process.env.PORT || 3001)

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Add it to server/.env or the deployment environment.')
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is required and must contain at least 32 characters.')
}

try {
  await mongoose.connect(process.env.MONGODB_URI)
  await ensureAdmin()
  app.listen(port, () => console.info(`Campus Shelf API listening on port ${port}.`))
} catch (error) {
  console.error('The API could not start:', error.message)
  process.exitCode = 1
}
