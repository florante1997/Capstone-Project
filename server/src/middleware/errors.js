export function notFound(req, res) {
  res.status(404).json({ message: 'The requested API route was not found.' })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON.' })
  }
  if (error.code === 11000) return res.status(409).json({ message: 'That username is already in use.' })
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Please check the submitted values and try again.' })
  }
  if (error.status && error.status < 500) return res.status(error.status).json({ message: error.message })
  console.error('Request failed:', error.message)
  res.status(500).json({ message: 'Something went wrong. Please try again later.' })
}
