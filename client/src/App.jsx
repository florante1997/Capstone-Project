import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.')
  return data
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('capstone-session')) || null
    } catch {
      return null
    }
  })
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ username: '', password: '' })
  const [itemForm, setItemForm] = useState({ name: '', category: '', description: '', stock: 1 })
  const [quantities, setQuantities] = useState({})
  const [editingId, setEditingId] = useState('')
  const user = session?.user
  const isAdmin = user?.role === 'admin'
  const isMember = user?.role === 'member'

  const loadCatalog = useCallback(async () => {
    const data = await request('/items')
    setItems(data.items)
  }, [])

  const loadOrders = useCallback(async () => {
    if (!session) {
      setOrders([])
      return
    }
    try {
      const data = await request(isAdmin ? '/orders' : '/orders/mine', { token: session.token })
      setOrders(data.orders)
    } catch (error) {
      setNotice(error.message)
    }
  }, [isAdmin, session])

  useEffect(() => {
    let active = true
    request('/items')
      .then((data) => { if (active) setItems(data.items) })
      .catch((error) => { if (active) setNotice(error.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (session) {
      localStorage.setItem('capstone-session', JSON.stringify(session))
      request(isAdmin ? '/orders' : '/orders/mine', { token: session.token })
        .then((data) => setOrders(data.orders))
        .catch((error) => setNotice(error.message))
    } else {
      localStorage.removeItem('capstone-session')
    }
  }, [isAdmin, session])

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
    [items],
  )

  const visibleItems = useMemo(() => items.filter((item) => {
    const text = `${item.name} ${item.category} ${item.description}`.toLowerCase()
    return item.active && text.includes(query.trim().toLowerCase()) && (!category || item.category === category)
  }), [category, items, query])

  function showError(error) {
    setNotice(error.message)
  }

  async function submitAuth(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const data = await request(endpoint, { method: 'POST', body: JSON.stringify(authForm) })
      setSession(data)
      setAuthForm({ username: '', password: '' })
      setNotice(authMode === 'login' ? 'Welcome back.' : 'Account created. You can now request items.')
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    setSession(null)
    setOrders([])
    setNotice('You have signed out.')
  }

  async function placeOrder(item, quantity) {
    if (!isMember) return
    setBusy(true)
    setNotice('')
    try {
      await request('/orders', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ itemId: item._id, quantity }),
      })
      setNotice(`Request sent for ${item.name}. An administrator will review it.`)
      await loadOrders()
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(item) {
    setEditingId(item._id)
    setItemForm({
      name: item.name,
      category: item.category,
      description: item.description,
      stock: item.stock,
    })
  }

  function resetItemForm() {
    setEditingId('')
    setItemForm({ name: '', category: '', description: '', stock: 1 })
  }

  async function saveItem(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      await request(editingId ? `/items/${editingId}` : '/items', {
        method: editingId ? 'PATCH' : 'POST',
        token: session.token,
        body: JSON.stringify({ ...itemForm, stock: Number(itemForm.stock) }),
      })
      resetItemForm()
      await loadCatalog()
      setNotice(editingId ? 'Item updated.' : 'Item added to the catalog.')
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete "${item.name}" from the catalog?`)) return
    setBusy(true)
    try {
      await request(`/items/${item._id}`, { method: 'DELETE', token: session.token })
      await loadCatalog()
      setNotice('Item deleted.')
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function updateOrder(orderId, status) {
    setBusy(true)
    try {
      await request(`/orders/${orderId}/status`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ status }),
      })
      await Promise.all([loadOrders(), loadCatalog()])
      setNotice(`Request ${status}.`)
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Campus Shelf home">
          <span className="brand-mark">CS</span>
          <span>Campus Shelf<small>Community item catalog</small></span>
        </a>
        <div className="account-area">
          {user ? (
            <>
              <span className="role-pill">{user.role}</span>
              <span className="username">Hi, {user.username}</span>
              <button className="button button-outline button-small" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button className="button button-primary button-small" onClick={() => document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' })}>
              Member sign in
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">A simple way to find what you need</p>
          <h1>Find it. Request it.<br /><span>Share it with your community.</span></h1>
          <p className="hero-copy">Browse the catalog as a guest, or sign in as a member to request available items.</p>
          <div className="hero-note"><span aria-hidden="true">ⓘ</span> Guests can browse and search. Members can send requests. Admin requests require approval.</div>
          <div className="hero-stats">
            <div><strong>{items.length}</strong><span>catalog items</span></div>
            <div><strong>{categories.length}</strong><span>categories</span></div>
            <div><strong>{user ? user.role : 'Guest'}</strong><span>current access</span></div>
          </div>
        </section>

        {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}

        <section className="catalog-section" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Explore the collection</p>
              <h2 id="catalog-title">Item catalog</h2>
              <p className="section-hint">Search by item, category, or description. Use the category filter to narrow your results.</p>
            </div>
            <span className="result-count">{visibleItems.length} {visibleItems.length === 1 ? 'result' : 'results'}</span>
          </div>
          <div className="search-controls">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the catalog" aria-label="Search catalog" />
            </label>
            <label className="filter-control">
              <span className="sr-only">Filter by category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          {visibleItems.length ? (
            <div className="item-grid">
              {visibleItems.map((item) => (
                <article className="item-card" key={item._id}>
                  <div className="card-topline"><span className="category-tag">{item.category}</span><span className={`stock-tag ${item.stock < 1 ? 'out-of-stock' : ''}`}>{item.stock > 0 ? `${item.stock} available` : 'Unavailable'}</span></div>
                  <h3>{item.name}</h3>
                  <p>{item.description || 'No description provided.'}</p>
                  <div className="card-actions">
                    {isAdmin ? (
                      <>
                        <button className="text-button" onClick={() => startEdit(item)}>Edit</button>
                        <button className="text-button danger-text" onClick={() => deleteItem(item)} disabled={busy}>Delete</button>
                      </>
                    ) : isMember ? (
                      <>
                        <label className="quantity-control">Qty
                          <input aria-label={`Quantity for ${item.name}`} type="number" min="1" max={item.stock} value={quantities[item._id] || 1} onChange={(event) => setQuantities({ ...quantities, [item._id]: Math.min(item.stock, Math.max(1, Number(event.target.value) || 1)) })} />
                        </label>
                        <button className="button button-primary" onClick={() => placeOrder(item, quantities[item._id] || 1)} disabled={busy || item.stock < 1}>Request item</button>
                      </>
                    ) : (
                      <button className="button button-outline" onClick={() => document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' })}>Sign in to request</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><span aria-hidden="true">⌕</span><h3>No matching items</h3><p>Try a different search or category. The catalog may also be waiting for an administrator to add items.</p></div>
          )}
        </section>

        {isAdmin && (
          <section className="management-section">
            <div className="section-heading">
              <div><p className="eyebrow">Administrator tools</p><h2>{editingId ? 'Update catalog item' : 'Add a catalog item'}</h2><p className="section-hint">Only the administrator can change the catalog or approve member requests.</p></div>
            </div>
            <form className="item-form" onSubmit={saveItem}>
              <label>Item name<input required minLength="2" maxLength="100" value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} placeholder="e.g. Portable projector" /></label>
              <label>Category<input required maxLength="50" value={itemForm.category} onChange={(event) => setItemForm({ ...itemForm, category: event.target.value })} placeholder="e.g. Electronics" /></label>
              <label className="wide-field">Description<textarea maxLength="500" rows="3" value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} placeholder="Add a short, helpful description" /></label>
              <label>Available quantity<input required type="number" min="0" max="10000" value={itemForm.stock} onChange={(event) => setItemForm({ ...itemForm, stock: event.target.value })} /></label>
              <div className="form-actions"><button className="button button-primary" disabled={busy}>{editingId ? 'Save changes' : 'Add item'}</button>{editingId && <button className="button button-outline" type="button" onClick={resetItemForm}>Cancel</button>}</div>
            </form>
          </section>
        )}

        {user && (
          <section className="orders-section">
            <div className="section-heading"><div><p className="eyebrow">{isAdmin ? 'Review and decide' : 'Your activity'}</p><h2>{isAdmin ? 'Member requests' : 'My requests'}</h2><p className="section-hint">{isAdmin ? 'Approve or decline pending requests. Approved requests reduce available stock.' : 'Track each request here. An administrator must approve it before it is fulfilled.'}</p></div><span className="result-count">{orders.length} total</span></div>
            {orders.length ? (
              <div className="orders-list">
                {orders.map((order) => (
                  <article className="order-row" key={order._id}>
                    <div className="order-info"><strong>{order.itemName}</strong><span>{isAdmin ? `Requested by ${order.member?.username || 'member'} · ` : ''}Quantity: {order.quantity}</span><small>{new Date(order.createdAt).toLocaleDateString()}</small></div>
                    <span className={`status-tag status-${order.status}`}>{order.status}</span>
                    {isAdmin && order.status === 'pending' && <div className="order-actions"><button className="button button-primary button-small" disabled={busy} onClick={() => updateOrder(order._id, 'approved')}>Approve</button><button className="button button-outline button-small" disabled={busy} onClick={() => updateOrder(order._id, 'rejected')}>Decline</button></div>}
                  </article>
                ))}
              </div>
            ) : <div className="empty-inline">No requests yet.</div>}
          </section>
        )}

        {!user && (
          <section id="access" className="access-section">
            <div className="access-copy"><p className="eyebrow">Member access</p><h2>{authMode === 'login' ? 'Welcome back' : 'Create a member account'}</h2><p>{authMode === 'login' ? 'Sign in to submit and track item requests.' : 'New accounts are members. Admin access cannot be selected here.'}</p><div className="access-hint">Guests do not need an account to explore the catalog.</div></div>
            <form className="auth-form" onSubmit={submitAuth}>
              <label>Username<input autoComplete="username" required minLength="3" maxLength="30" value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} placeholder="Your username" /></label>
              <label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required minLength={8} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder={authMode === 'login' ? 'Your password' : 'At least 8 characters'} /></label>
              <button className="button button-primary full-width" disabled={busy}>{authMode === 'login' ? 'Sign in' : 'Create member account'}</button>
              <button className="link-button" type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setNotice('') }}>{authMode === 'login' ? 'New here? Create a member account' : 'Already registered? Sign in'}</button>
            </form>
          </section>
        )}
      </main>
      <footer><span>Campus Shelf</span><span>Browse openly · Request responsibly · Share fairly</span></footer>
    </div>
  )
}

export default App
