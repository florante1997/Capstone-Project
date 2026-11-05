import { Router } from 'express'
import mongoose from 'mongoose'
import Item from '../models/Item.js'
import Order from '../models/Order.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, requireRole('member'), async (req, res, next) => {
  try {
    const { itemId } = req.body
    const quantity = Number(req.body.quantity ?? 1)
    if (!mongoose.isValidObjectId(itemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({ message: 'Choose a valid item and a whole-number quantity between 1 and 100.' })
    }
    const item = await Item.findOne({ _id: itemId, active: true })
    if (!item) return res.status(404).json({ message: 'This item is not available in the catalog.' })
    if (item.stock < quantity) return res.status(409).json({ message: 'There is not enough stock to fulfill that request.' })
    const order = await Order.create({
      member: req.user._id,
      item: item._id,
      itemName: item.name,
      quantity,
    })
    res.status(201).json({ order })
  } catch (error) {
    next(error)
  }
})

router.get('/mine', authenticate, requireRole('member'), async (req, res, next) => {
  try {
    const orders = await Order.find({ member: req.user._id }).sort({ createdAt: -1 }).lean()
    res.json({ orders })
  } catch (error) {
    next(error)
  }
})

router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const orders = await Order.find().populate('member', 'username').sort({ createdAt: -1 }).limit(300).lean()
    res.json({ orders })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected.' })
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid request ID.' })

  const session = await mongoose.startSession()
  try {
    let updatedOrder
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: req.params.id, status: 'pending' }).session(session)
      if (!order) {
        const error = new Error('This request has already been reviewed or does not exist.')
        error.status = 409
        throw error
      }
      if (status === 'approved') {
        const item = await Item.findOneAndUpdate(
          { _id: order.item, active: true, stock: { $gte: order.quantity } },
          { $inc: { stock: -order.quantity } },
          { new: true, session },
        )
        if (!item) {
          const error = new Error('There is no longer enough stock to approve this request.')
          error.status = 409
          throw error
        }
      }
      order.status = status
      await order.save({ session })
      updatedOrder = order
    })
    res.json({ order: updatedOrder })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
})

export default router
