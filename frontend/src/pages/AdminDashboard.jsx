import { useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Plus, Edit2, Trash2, Package, LogOut, TrendingUp, Mail, Copy, UserX, UserCheck, Link, ChefHat, Calendar, X } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('menu')
  const [menuItems, setMenuItems] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    stock: '0',
    weightGrams: '',
    ingredients: '',
    allergens: ''
  })

  const [invites, setInvites] = useState([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [inviteContact, setInviteContact] = useState('')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [csvText, setCsvText] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResults, setCsvResults] = useState(null)

  const [buyers, setBuyers] = useState([])
  const [buyersLoading, setBuyersLoading] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState(null)

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const defaultSchedule = DAY_NAMES.map((_, i) => ({
    dayOfWeek: i,
    openTime: '09:00',
    closeTime: '17:00',
    isActive: i >= 1 && i <= 5,
  }))
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [blockedDates, setBlockedDates] = useState([])
  const [newBlockedDate, setNewBlockedDate] = useState('')
  const [newBlockedReason, setNewBlockedReason] = useState('')

  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const CATEGORIES = ['Baked Goods', 'Cooking Ingredients']

  useEffect(() => {
    if (!token) return
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    fetchData()
  }, [token])

  useEffect(() => {
    if (activeTab === 'invites' && token) fetchInvites()
    if (activeTab === 'buyers' && token) fetchBuyers()
    if (activeTab === 'collection' && token) fetchCollectionSchedule()
  }, [activeTab, token])

  const fetchCollectionSchedule = async () => {
    setScheduleLoading(true)
    try {
      const [schedRes, blockedRes] = await Promise.all([
        axios.get('/api/admin/collection-schedule'),
        axios.get('/api/admin/blocked-dates'),
      ])
      if (schedRes.data.schedule.length > 0) {
        const merged = defaultSchedule.map((def) => {
          const saved = schedRes.data.schedule.find((s) => s.day_of_week === def.dayOfWeek)
          return saved
            ? { dayOfWeek: saved.day_of_week, openTime: saved.open_time.slice(0, 5), closeTime: saved.close_time.slice(0, 5), isActive: saved.is_active }
            : def
        })
        setSchedule(merged)
      }
      setBlockedDates(blockedRes.data.blockedDates)
    } catch {
      // leave defaults
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleSaveSchedule = async () => {
    setScheduleSaving(true)
    try {
      await axios.put('/api/admin/collection-schedule', { schedule })
      alert('Collection hours saved.')
    } catch {
      alert('Failed to save schedule.')
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleAddBlockedDate = async () => {
    if (!newBlockedDate) return
    try {
      const res = await axios.post('/api/admin/blocked-dates', { date: newBlockedDate, reason: newBlockedReason.trim() || undefined })
      setBlockedDates((prev) => [...prev, res.data.blockedDate].sort((a, b) => a.date.localeCompare(b.date)))
      setNewBlockedDate('')
      setNewBlockedReason('')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to block date.')
    }
  }

  const handleRemoveBlockedDate = async (id) => {
    try {
      await axios.delete(`/api/admin/blocked-dates/${id}`)
      setBlockedDates((prev) => prev.filter((d) => d.id !== id))
    } catch {
      alert('Failed to remove blocked date.')
    }
  }

  const updateScheduleRow = (dayOfWeek, field, value) => {
    setSchedule((prev) => prev.map((row) => row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row))
  }

  const fetchData = async () => {
    try {
      const [menuResponse, statsResponse] = await Promise.all([
        axios.get('/api/admin/menu-items'),
        axios.get('/api/admin/dashboard')
      ])
      setMenuItems(menuResponse.data)
      setDashboardStats(statsResponse.data)
    } catch (error) {
      if (error.response?.status === 401) {
        logout()
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchBuyers = async () => {
    setBuyersLoading(true)
    try {
      const res = await axios.get('/api/admin/users')
      setBuyers(res.data.users.filter((u) => u.role === 'buyer'))
    } catch (error) {
      console.error('Failed to load buyers', error)
    } finally {
      setBuyersLoading(false)
    }
  }

  const handleToggleUser = async (user) => {
    setTogglingUserId(user.id)
    try {
      await axios.patch(`/api/admin/users/${user.id}/status`, { isActive: !user.is_active })
      setBuyers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    } catch {
      alert('Failed to update user status')
    } finally {
      setTogglingUserId(null)
    }
  }

  const fetchInvites = async () => {
    setInvitesLoading(true)
    try {
      const res = await axios.get('/api/admin/invites')
      setInvites(res.data.invites)
    } catch (error) {
      console.error('Failed to load invites', error)
    } finally {
      setInvitesLoading(false)
    }
  }

  const isEmail = (val) => val.includes('@')

  const handleCreateInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    setInviteSubmitting(true)
    try {
      const trimmed = inviteContact.trim()
      const payload = isEmail(trimmed) ? { email: trimmed } : { phone: trimmed }
      const res = await axios.post('/api/admin/invites', payload)
      setInviteSuccess(res.data.invite.url)
      setInviteContact('')
      fetchInvites()
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to create invite')
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleCsvImport = async () => {
    setCsvResults(null)
    setCsvImporting(true)
    try {
      const contacts = csvText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.toLowerCase().startsWith('email') && !line.toLowerCase().startsWith('phone'))
        .map((line) => isEmail(line) ? { email: line.toLowerCase() } : { phone: line })

      if (contacts.length === 0) {
        setCsvResults({ error: 'No valid contacts found in the file.' })
        return
      }

      const res = await axios.post('/api/admin/invites/bulk', { contacts })
      setCsvResults(res.data)
      setCsvText('')
      fetchInvites()
    } catch (err) {
      setCsvResults({ error: err.response?.data?.error || 'Import failed' })
    } finally {
      setCsvImporting(false)
    }
  }

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleRevokeInvite = async (id) => {
    if (!confirm('Revoke this invite? The link will stop working immediately.')) return
    try {
      await axios.delete(`/api/admin/invites/${id}`)
      fetchInvites()
    } catch {
      alert('Failed to revoke invite')
    }
  }

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const inviteStatus = (invite) => {
    if (invite.used_at) return 'used'
    if (new Date(invite.expires_at) < new Date()) return 'expired'
    return 'pending'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        imageUrl: formData.imageUrl || null,
        weightGrams: formData.weightGrams ? parseInt(formData.weightGrams) : null,
        ingredients: formData.ingredients || null,
        allergens: formData.allergens || null,
      }
      if (editingItem) {
        await axios.put(`/api/admin/menu-items/${editingItem.id}`, { ...payload, quantityAvailable: parseInt(formData.stock) })
      } else {
        await axios.post('/api/admin/menu-items', { ...payload, initialInventory: parseInt(formData.stock) })
      }
      resetForm()
      fetchData()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save item')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category || '',
      imageUrl: item.imageUrl || '',
      stock: item.inventory?.quantityAvailable?.toString() || '0',
      weightGrams: item.weightGrams?.toString() || '',
      ingredients: item.ingredients || '',
      allergens: item.allergens || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await axios.delete(`/api/admin/menu-items/${itemId}`)
      fetchData()
    } catch {
      alert('Failed to delete item')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: '', imageUrl: '', stock: '0', weightGrams: '', ingredients: '', allergens: '' })
    setEditingItem(null)
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Bakery Admin</h1>
            <div className="flex items-center gap-3">
              <RouterLink
                to="/kitchen"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChefHat className="h-4 w-4" />
                Kitchen
              </RouterLink>
              <button onClick={handleLogout} className="btn-error flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.todaysOrders}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <Package className="h-8 w-8 text-green-600 shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">£{dashboardStats.todaysRevenue}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <Package className="h-8 w-8 text-yellow-600 shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeOrders}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <Package className="h-8 w-8 text-red-600 shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Menu Items</p>
                <p className="text-2xl font-bold text-gray-900">{menuItems.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: 'menu', label: 'Menu Management' },
            { id: 'collection', label: 'Collection Hours' },
            { id: 'invites', label: 'Invite Buyers' },
            { id: 'buyers', label: 'Manage Buyers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Menu Items</h2>
              <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex flex-col">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded mb-3" />
                  )}
                  <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                  {item.category && (
                    <span className="inline-block mb-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {item.category}
                    </span>
                  )}
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-blue-600">£{parseFloat(item.price).toFixed(2)}</span>
                    <span className="text-sm text-gray-500">Stock: {item.inventory?.quantityAvailable || 0}</span>
                  </div>
                  <div className="flex space-x-2 mt-auto">
                    <button onClick={() => handleEdit(item)} className="flex-1 btn-secondary flex items-center justify-center space-x-1">
                      <Edit2 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="flex-1 btn-error flex items-center justify-center space-x-1">
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collection Hours Tab */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Weekly Collection Hours
                </h2>
                <button
                  onClick={handleSaveSchedule}
                  disabled={scheduleSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {scheduleSaving
                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    : null}
                  Save Hours
                </button>
              </div>

              {scheduleLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {schedule.map((row) => (
                    <div key={row.dayOfWeek} className="py-4 flex items-center gap-4 flex-wrap">
                      <div className="w-28">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) => updateScheduleRow(row.dayOfWeek, 'isActive', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className={`text-sm font-medium ${row.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                            {DAY_NAMES[row.dayOfWeek]}
                          </span>
                        </label>
                      </div>
                      <div className={`flex items-center gap-2 transition-opacity ${row.isActive ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <input
                          type="time"
                          value={row.openTime}
                          onChange={(e) => updateScheduleRow(row.dayOfWeek, 'openTime', e.target.value)}
                          className="input-field w-32 text-sm"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="time"
                          value={row.closeTime}
                          onChange={(e) => updateScheduleRow(row.dayOfWeek, 'closeTime', e.target.value)}
                          className="input-field w-32 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked dates */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Blocked Dates</h2>
              <p className="text-sm text-gray-500 mb-4">
                Block specific dates (bank holidays, days off) — they won't appear as available for customers even if within normal hours.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                <input
                  type="date"
                  value={newBlockedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="input-field w-44"
                />
                <input
                  type="text"
                  value={newBlockedReason}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="input-field flex-1 min-w-[160px]"
                />
                <button
                  onClick={handleAddBlockedDate}
                  disabled={!newBlockedDate}
                  className="btn-primary disabled:opacity-50"
                >
                  Block Date
                </button>
              </div>

              {blockedDates.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No blocked dates.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {blockedDates.map((d) => (
                    <div key={d.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {d.reason && <p className="text-sm text-gray-500">{d.reason}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedDate(d.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buyers Tab */}
        {activeTab === 'buyers' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Registered Buyers
            </h2>
            {buyersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : buyers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No buyers registered yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {buyers.map((buyer) => (
                  <div key={buyer.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{buyer.email || buyer.phone}</p>
                      {buyer.email && buyer.phone && (
                        <p className="text-sm text-gray-500">{buyer.phone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        ID: {buyer.buyer_id} · Joined {new Date(buyer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${buyer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {buyer.is_active ? 'Active' : 'Deactivated'}
                      </span>
                      <button
                        onClick={() => handleToggleUser(buyer)}
                        disabled={togglingUserId === buyer.id}
                        title={buyer.is_active ? 'Deactivate buyer' : 'Reactivate buyer'}
                        className={`p-1.5 rounded transition-colors ${buyer.is_active ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                      >
                        {togglingUserId === buyer.id
                          ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                          : buyer.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div className="space-y-6">
            {/* Create invite form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Create Invite
              </h2>
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address or phone number *</label>
                  <input
                    type="text"
                    required
                    value={inviteContact}
                    onChange={(e) => setInviteContact(e.target.value)}
                    placeholder="buyer@example.com or +44 7700 000000"
                    className="input-field"
                    disabled={inviteSubmitting}
                  />
                  <p className="text-xs text-gray-400 mt-1">Either is fine — the buyer will receive their code on whichever you enter.</p>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded px-4 py-3">
                    <p className="text-sm font-medium text-green-800 mb-2">Invite created — copy and share this link with the buyer:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1 break-all">{inviteSuccess}</code>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(inviteSuccess); setCopiedId('new') }}
                        className="shrink-0 p-2 text-green-700 hover:bg-green-100 rounded"
                      >
                        {copiedId === 'new' ? <span className="text-xs font-medium">Copied!</span> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={inviteSubmitting || !inviteContact.trim()}
                  className="btn-primary flex items-center space-x-2"
                >
                  {inviteSubmitting
                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    : <Link className="h-4 w-4" />
                  }
                  <span>Generate Invite Link</span>
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Bulk Import via CSV</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Upload a CSV or paste a list — one email address or phone number per line. Duplicate or already-registered contacts are skipped automatically.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors">
                    <input type="file" accept=".csv,.txt" onChange={handleCsvFileChange} className="sr-only" />
                    <span className="text-sm text-gray-500">Choose file or drop CSV here</span>
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={'buyer1@example.com\nbuyer2@example.com\n+44 7700 000001'}
                    rows={4}
                    className="input-field font-mono text-xs"
                  />
                  {csvResults && (
                    <div className={`text-sm rounded px-3 py-2 ${csvResults.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
                      {csvResults.error ? csvResults.error : (
                        <>
                          <span className="font-medium">{csvResults.created} invite{csvResults.created !== 1 ? 's' : ''} created</span>
                          {csvResults.skipped > 0 && <span className="ml-2 text-blue-600">{csvResults.skipped} skipped</span>}
                        </>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCsvImport}
                    disabled={csvImporting || !csvText.trim()}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    {csvImporting
                      ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                      : <UserCheck className="h-4 w-4" />
                    }
                    <span>Import Contacts</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Invites list */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">All Invites</h2>
              {invitesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : invites.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No invites yet. Create one above.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {invites.map((invite) => {
                    const status = inviteStatus(invite)
                    const inviteUrl = invite.url
                    return (
                      <div key={invite.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{invite.email}</p>
                          {invite.phone && <p className="text-sm text-gray-500">{invite.phone}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Expires {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {status === 'used' && invite.used_by_username && (
                            <p className="text-xs text-gray-500 mt-0.5">Registered as: <span className="font-medium">{invite.used_by_username}</span> ({invite.buyer_id})</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            status === 'used' ? 'bg-green-100 text-green-700' :
                            status === 'expired' ? 'bg-gray-100 text-gray-500' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {status === 'used' ? 'Registered' : status === 'expired' ? 'Expired' : 'Pending'}
                          </span>
                          {status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleCopyLink(inviteUrl, invite.id)}
                                title="Copy invite link"
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                {copiedId === invite.id ? <span className="text-xs font-medium text-blue-600">Copied!</span> : <Copy className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(invite.id)}
                                title="Revoke invite"
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Sourdough Loaf"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description of the item"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (£) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 800"
                  value={formData.weightGrams}
                  onChange={(e) => setFormData({...formData, weightGrams: e.target.value})}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Used to calculate Royal Mail shipping cost</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                <textarea
                  placeholder="e.g. Flour, water, salt, yeast"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
                  className="input-field"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergens</label>
                <input
                  type="text"
                  placeholder="e.g. Gluten, eggs, dairy"
                  value={formData.allergens}
                  onChange={(e) => setFormData({...formData, allergens: e.target.value})}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editingItem ? 'Stock' : 'Initial Stock'} *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  className="input-field"
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingItem ? 'Update' : 'Add'} Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
