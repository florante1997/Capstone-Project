import { Router } from 'express'
import Item from '../models/Item.js'
import Order from '../models/Order.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
const allowedFields = ['name', 'category', 'description', 'stock']

function itemInput(body) {
  const values = {}
  for (const field of allowedFields) {
    if (Object.hasOwn(body, field)) values[field] = body[field]
  }
  if (typeof values.name === 'string') values.name = values.name.trim()
  if (typeof values.category === 'string') values.category = values.category.trim()
  if (typeof values.description === 'string') values.description = values.description.trim()
  if (Object.hasOwn(values, 'stock')) {
    values.stock = Number(values.stock)
    if (!Number.isInteger(values.stock) || values.stock < 0 || values.stock > 10000) {
      const error = new Error('Quantity must be a whole number between 0 and 10000.')
      error.status = 400
      throw error
    }
  }
  return values
}

router.get('/', async (req, res, next) => {
  try {
    const filter = { active: true }
    if (typeof req.query.category === 'string' && req.query.category.trim()) filter.category = req.query.category.trim()
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ]
    }
    const items = await Item.find(filter).sort({ name: 1 }).limit(200).lean()
    res.json({ items })
  } catch (error) {
    next(error)
  }
})

router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const item = await Item.create(itemInput(req.body))
    res.status(201).json({ item })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, itemInput(req.body), { new: true, runValidators: true })
    if (!item) return res.status(404).json({ message: 'Item not found.' })
    res.json({ item })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const pendingRequest = await Order.exists({ item: req.params.id, status: 'pending' })
    if (pendingRequest) {
      return res.status(409).json({ message: 'This item has a pending member request. Review it before deleting the item.' })
    }
    const item = await Item.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ message: 'Item not found.' })
    res.json({ message: 'Item deleted.' })
  } catch (error) {
    next(error)
  }
})

export default router
