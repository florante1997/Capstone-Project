import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  stock: { type: Number, required: true, min: 0, max: 10000, default: 0 },
  active: { type: Boolean, default: true, required: true },
}, { timestamps: true })

itemSchema.index({ active: 1, category: 1, name: 1 })

export default mongoose.model('Item', itemSchema)
