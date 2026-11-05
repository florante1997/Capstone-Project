import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
})

function createSession(user) {
  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '12h' })
  return { token, user: { id: user._id, username: user.username, role: user.role } }
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : ''
    const password = req.body.password
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3–30 characters using letters, numbers, underscores, or hyphens.' })
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ username, passwordHash, role: 'member' })
    res.status(201).json(createSession(user))
  } catch (error) {
    next(error)
  }
})

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : ''
    const password = req.body.password
    const user = await User.findOne({ username }).select('+passwordHash')
    const matches = user && typeof password === 'string' && await bcrypt.compare(password, user.passwordHash)
    if (!matches) return res.status(401).json({ message: 'Username or password is incorrect.' })
    res.json(createSession(user))
  } catch (error) {
    next(error)
  }
})

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user._id, username: req.user.username, role: req.user.role } })
})

export default router
