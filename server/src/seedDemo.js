import 'dotenv/config'
import mongoose from 'mongoose'
import Item from './models/Item.js'

const examples = [
  { name: 'Portable projector', category: 'Electronics', description: 'Compact projector for study groups and presentations.', stock: 2 },
  { name: 'USB-C adapter kit', category: 'Electronics', description: 'Common display and USB adapters in a labeled travel case.', stock: 5 },
  { name: 'Study room whiteboard', category: 'Study supplies', description: 'Reusable tabletop whiteboard with two markers.', stock: 4 },
  { name: 'Scientific calculator', category: 'Study supplies', description: 'Multi-function calculator for class and exam preparation.', stock: 3 },
  { name: 'Folding event table', category: 'Events', description: 'Lightweight table for student meetings and small events.', stock: 2 },
  { name: 'First-aid kit', category: 'Wellbeing', description: 'Basic sealed first-aid kit for shared spaces.', stock: 3 },
]

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required to add demo catalog items.')

try {
  await mongoose.connect(process.env.MONGODB_URI)
  const existingCount = await Item.countDocuments()
  if (existingCount > 0) {
    console.info(`Catalog already contains ${existingCount} item(s); no demo items were added.`)
  } else {
    await Item.insertMany(examples)
    console.info(`Added ${examples.length} sample items to the catalog.`)
  }
} finally {
  await mongoose.disconnect()
}
