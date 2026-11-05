import bcrypt from 'bcryptjs'
import User from './models/User.js'

export async function ensureAdmin() {
  const existingAdmin = await User.exists({ role: 'admin' })
  if (existingAdmin) return

  const username = process.env.ADMIN_USERNAME?.trim()
  const password = process.env.ADMIN_PASSWORD
  if (!username || !/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
    throw new Error('Set ADMIN_USERNAME to a unique 3–30 character username before first start.')
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error('Set ADMIN_PASSWORD to a unique password between 12 and 128 characters before first start.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ username, passwordHash, role: 'admin' })
  console.info(`Created the initial administrator account "${username}".`)
}
