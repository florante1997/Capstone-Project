import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'

test('health endpoint responds without requiring a database connection', async (context) => {
  const server = app.listen(0)
  context.after(() => server.close())
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const response = await fetch(`http://127.0.0.1:${port}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok', database: 'managed separately' })
})

test('unknown API routes return a clear not-found response', async (context) => {
  const server = app.listen(0)
  context.after(() => server.close())
  await new Promise((resolve) => server.once('listening', resolve))
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/not-a-route`)
  assert.equal(response.status, 404)
  assert.match((await response.json()).message, /not found/i)
})

test('catalog mutations and item requests require an authenticated account', async (context) => {
  const server = app.listen(0)
  context.after(() => server.close())
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  const itemResponse = await fetch(`${baseUrl}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test item', category: 'Test', stock: 1 }),
  })
  const orderResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: '000000000000000000000000', quantity: 1 }),
  })

  assert.equal(itemResponse.status, 401)
  assert.equal(orderResponse.status, 401)
})

test('malformed mutation bodies are rejected with a client error', async (context) => {
  const server = app.listen(0)
  context.after(() => server.close())
  await new Promise((resolve) => server.once('listening', resolve))
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null',
  })
  assert.equal(response.status, 400)
  assert.match((await response.json()).message, /valid json/i)
})
