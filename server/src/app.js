import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.js'
import itemRoutes from './routes/items.js'
import orderRoutes from './routes/orders.js'
import { errorHandler, notFound } from './middleware/errors.js'

const app = express()
const allowedOrigins = (process.env.API_CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('This website origin is not allowed by the API CORS configuration.'))
  },
}))
app.use(express.json({ limit: '20kb' }))
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT'].includes(req.method)
      && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ message: 'Send a valid JSON object with this request.' })
  }
  next()
})

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'managed separately' }))
app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/orders', orderRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
