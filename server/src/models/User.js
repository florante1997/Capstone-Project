import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'member'], default: 'member', required: true },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
