import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, max: 100 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', required: true, index: true },
}, { timestamps: true })

export default mongoose.model('Order', orderSchema)
