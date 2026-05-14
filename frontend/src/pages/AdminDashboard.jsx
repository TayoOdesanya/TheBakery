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
  const [togglingAction, setTogglingAction] = useState(null)

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

  const handleSetUserStatus = async (user, newStatus, action) => {
    setTogglingUserId(user.id)
    setTogglingAction(action)
    try {
      await axios.patch(`/api/admin/users/${user.id}/status`, { accountStatus: newStatus })
      setBuyers((prev) => prev.map((u) => u.id === user.id ? { ...u, account_status: newStatus } : u))
    } catch {
      alert('Failed to update user status')
    } finally {
      setTogglingUserId(null)
      setTogglingAction(null)
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
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f2]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ff9f32]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="flex items-center space-x-2 md:space-x-3">
              <img src="/rad-logo.png" alt="R's Confectionery" className="h-10 w-auto md:h-14" />
              <div className="hidden md:block">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff9f32]">R's</p>
                <p className="text-2xl font-black uppercase text-[#252525]">Confectionery</p>
              </div>
            </a>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="hidden sm:block text-xs font-bold uppercase tracking-wider text-gray-400">Admin Panel</span>
              <RouterLink
                to="/kitchen"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#333333] border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <ChefHat className="h-4 w-4" />
                <span className="hidden sm:inline">Kitchen</span>
              </RouterLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-[#252525] hover:bg-[#ff9f32] transition-colors rounded"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {[
              { label: "Today's Orders", value: dashboardStats.todaysOrders, icon: TrendingUp },
              { label: 'Revenue', value: `£${dashboardStats.todaysRevenue}`, icon: Package },
              { label: 'Active Orders', value: dashboardStats.activeOrders, icon: Package },
              { label: 'Menu Items', value: menuItems.length, icon: Package },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white p-4 md:p-6 rounded-lg shadow-sm flex items-center gap-3">
                <Icon className="h-7 w-7 md:h-8 md:w-8 text-[#ff9f32] shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 md:text-sm">{label}</p>
                  <p className="text-xl font-bold text-[#252525] md:text-2xl">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { id: 'menu', label: 'Menu' },
            { id: 'collection', label: 'Collection Hours' },
            { id: 'invites', label: 'Invite Buyers' },
            { id: 'buyers', label: 'Buyers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 md:px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#ff9f32] text-[#ff9f32]'
                  : 'border-transparent text-gray-500 hover:text-[#252525]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-[#252525] md:text-xl">Menu Items</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-[#ff9f32] px-4 py-2 text-sm font-bold text-white hover:bg-[#252525] transition-colors rounded"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-24 object-cover md:h-32" />
                  )}
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-sm text-[#252525] mb-1 md:text-lg">{item.name}</h3>
                    {item.category && (
                      <span className="inline-block mb-2 px-2 py-0.5 text-xs font-medium bg-amber-50 text-[#ff9f32] rounded">
                        {item.category}
                      </span>
                    )}
                    <p className="text-gray-500 text-xs mb-2 hidden md:block line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-[#ff9f32] md:text-lg">£{parseFloat(item.price).toFixed(2)}</span>
                      <span className="text-xs text-gray-400">Stock: {item.inventory?.quantityAvailable || 0}</span>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 flex items-center justify-center gap-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 flex items-center justify-center gap-1 border border-red-100 rounded px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collection Hours Tab */}
        {activeTab === 'collection' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#252525] flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#ff9f32]" />
                  Weekly Collection Hours
                </h2>
                <button
                  onClick={handleSaveSchedule}
                  disabled={scheduleSaving}
                  className="flex items-center gap-2 bg-[#ff9f32] px-4 py-2 text-sm font-bold text-white hover:bg-[#252525] transition-colors rounded disabled:opacity-60"
                >
                  {scheduleSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                  Save Hours
                </button>
              </div>

              {scheduleLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9f32]" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {schedule.map((row) => (
                    <div key={row.dayOfWeek} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <label className="flex items-center gap-2.5 cursor-pointer w-28 shrink-0">
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(e) => updateScheduleRow(row.dayOfWeek, 'isActive', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#ff9f32]"
                        />
                        <span className={`text-sm font-semibold ${row.isActive ? 'text-[#252525]' : 'text-gray-400'}`}>
                          {DAY_NAMES[row.dayOfWeek]}
                        </span>
                      </label>
                      <div className={`flex items-center gap-2 transition-opacity ${row.isActive ? 'opacity-100' : 'opacity-25 pointer-events-none'}`}>
                        <input
                          type="time"
                          value={row.openTime}
                          onChange={(e) => updateScheduleRow(row.dayOfWeek, 'openTime', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff9f32] focus:border-[#ff9f32]"
                        />
                        <span className="text-gray-400 text-sm">–</span>
                        <input
                          type="time"
                          value={row.closeTime}
                          onChange={(e) => updateScheduleRow(row.dayOfWeek, 'closeTime', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff9f32] focus:border-[#ff9f32]"
                        />
                      </div>
                      {!row.isActive && <span className="text-xs text-gray-400 ml-auto">Closed</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked dates */}
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <h2 className="text-lg font-bold text-[#252525] mb-1">Blocked Dates</h2>
              <p className="text-sm text-gray-500 mb-4">
                Block specific dates — they won't be available for collection even within normal hours.
              </p>
              <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
                <input
                  type="date"
                  value={newBlockedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff9f32] w-40"
                />
                <input
                  type="text"
                  value={newBlockedReason}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff9f32] flex-1 min-w-[140px]"
                />
                <button
                  onClick={handleAddBlockedDate}
                  disabled={!newBlockedDate}
                  className="bg-[#ff9f32] px-4 py-2 text-sm font-bold text-white hover:bg-[#252525] transition-colors rounded disabled:opacity-50"
                >
                  Block Date
                </button>
              </div>
              {blockedDates.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No blocked dates.</p>
              ) : (
                <div className="space-y-0.5">
                  {blockedDates.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-4 py-2.5 px-2 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-[#252525]">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {d.reason && <p className="text-xs text-gray-400">{d.reason}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedDate(d.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
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
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h2 className="text-lg font-bold text-[#252525] mb-4 flex items-center gap-2 md:text-xl">
              <UserCheck className="h-5 w-5 text-[#ff9f32]" />
              Registered Buyers
            </h2>
            {buyersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9f32]" />
              </div>
            ) : buyers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No buyers registered yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {buyers.map((buyer) => (
                  <div key={buyer.id} className="py-3 md:py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#252525] truncate md:text-base">{buyer.email || buyer.phone}</p>
                      {buyer.email && buyer.phone && (
                        <p className="text-xs text-gray-500">{buyer.phone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                        ID: {buyer.buyer_id} · Joined {new Date(buyer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        buyer.account_status === 'active' ? 'bg-green-100 text-green-700'
                        : buyer.account_status === 'paused' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                      }`}>
                        {buyer.account_status === 'active' ? 'Active' : buyer.account_status === 'paused' ? 'Paused' : 'Deactivated'}
                      </span>
                      {buyer.account_status !== 'deactivated' && (
                        <button
                          onClick={() => handleSetUserStatus(buyer, buyer.account_status === 'paused' ? 'active' : 'paused', 'pause')}
                          disabled={togglingUserId === buyer.id}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors min-w-[72px] text-center ${
                            buyer.account_status === 'paused'
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {togglingUserId === buyer.id && togglingAction === 'pause'
                            ? <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                            : buyer.account_status === 'paused' ? 'Resume' : 'Pause'
                          }
                        </button>
                      )}
                      <button
                        onClick={() => handleSetUserStatus(buyer, buyer.account_status === 'deactivated' ? 'active' : 'deactivated', 'deactivate')}
                        disabled={togglingUserId === buyer.id}
                        title={buyer.account_status === 'deactivated' ? 'Reactivate buyer' : 'Deactivate buyer'}
                        className={`p-1.5 rounded transition-colors ${
                          buyer.account_status === 'deactivated'
                            ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {togglingUserId === buyer.id && togglingAction === 'deactivate'
                          ? <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                          : buyer.account_status === 'deactivated' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />
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
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <h2 className="text-lg font-bold text-[#252525] mb-4 flex items-center gap-2 md:text-xl">
                <Mail className="h-5 w-5 text-[#ff9f32]" />
                Create Invite
              </h2>
              <div className="md:grid md:grid-cols-2 md:gap-8 md:divide-x md:divide-gray-100">
                {/* Single invite */}
                <div>
                  <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email or phone number</label>
                      <input
                        type="text"
                        required
                        value={inviteContact}
                        onChange={(e) => setInviteContact(e.target.value)}
                        placeholder="buyer@example.com or +44 7700 000000"
                        className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                        disabled={inviteSubmitting}
                      />
                      <p className="text-xs text-gray-400 mt-1">The buyer will receive their code on whichever you enter.</p>
                    </div>
                    {inviteError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{inviteError}</p>
                    )}
                    {inviteSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded px-4 py-3">
                        <p className="text-sm font-medium text-green-800 mb-2">Invite created — share this link:</p>
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
                      className="flex items-center gap-2 bg-[#ff9f32] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#252525] transition-colors rounded disabled:opacity-50"
                    >
                      {inviteSubmitting
                        ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        : <Link className="h-4 w-4" />
                      }
                      <span>Generate Invite Link</span>
                    </button>
                  </form>
                </div>

                {/* Bulk import */}
                <div className="mt-6 pt-6 border-t border-gray-100 md:mt-0 md:pt-0 md:border-0 md:pl-8">
                  <h3 className="text-sm font-bold text-[#252525] mb-1">Bulk Import via CSV</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    One email or phone per line. Duplicates and already-registered contacts are skipped.
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-[#ff9f32] transition-colors">
                      <input type="file" accept=".csv,.txt" onChange={handleCsvFileChange} className="sr-only" />
                      <span className="text-sm text-gray-500">Choose file or drop CSV here</span>
                    </label>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder={'buyer1@example.com\nbuyer2@example.com\n+44 7700 000001'}
                      rows={4}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#ff9f32]"
                    />
                    {csvResults && (
                      <div className={`text-sm rounded px-3 py-2 ${csvResults.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                        {csvResults.error ? csvResults.error : (
                          <>
                            <span className="font-medium">{csvResults.created} invite{csvResults.created !== 1 ? 's' : ''} created</span>
                            {csvResults.skipped > 0 && <span className="ml-2">{csvResults.skipped} skipped</span>}
                          </>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleCsvImport}
                      disabled={csvImporting || !csvText.trim()}
                      className="flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded disabled:opacity-50"
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
            </div>

            {/* Invites list */}
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <h2 className="text-lg font-bold text-[#252525] mb-4 md:text-xl">All Invites</h2>
              {invitesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9f32]" />
                </div>
              ) : invites.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No invites yet. Create one above.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {invites.map((invite) => {
                    const status = inviteStatus(invite)
                    const inviteUrl = invite.url
                    return (
                      <div key={invite.id} className="py-3 md:py-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[#252525] truncate">{invite.email}</p>
                          {invite.phone && <p className="text-xs text-gray-500">{invite.phone}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Expires {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {status === 'used' && invite.used_by_username && (
                            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Registered as: <span className="font-medium">{invite.used_by_username}</span> ({invite.buyer_id})</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            status === 'used' ? 'bg-green-100 text-green-700' :
                            status === 'expired' ? 'bg-gray-100 text-gray-500' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {status === 'used' ? 'Registered' : status === 'expired' ? 'Expired' : 'Pending'}
                          </span>
                          {status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleCopyLink(inviteUrl, invite.id)}
                                title="Copy invite link"
                                className="p-1.5 text-gray-500 hover:text-[#ff9f32] hover:bg-amber-50 rounded"
                              >
                                {copiedId === invite.id ? <span className="text-xs font-medium text-[#ff9f32]">Copied!</span> : <Copy className="h-4 w-4" />}
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
        <div className="fixed inset-0 bg-black/40 overflow-y-auto z-50 flex items-start justify-center p-4 md:p-6">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#252525]">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button onClick={resetForm} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[80vh]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Chocolate Truffle"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    placeholder="Brief description of the item"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                    rows="3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (£) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{editingItem ? 'Stock' : 'Initial Stock'} *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
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
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 250"
                    value={formData.weightGrams}
                    onChange={(e) => setFormData({...formData, weightGrams: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used to calculate Royal Mail shipping cost</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                  <textarea
                    placeholder="e.g. Dark chocolate, cream, butter"
                    value={formData.ingredients}
                    onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergens</label>
                  <input
                    type="text"
                    placeholder="e.g. Dairy, soy, tree nuts"
                    value={formData.allergens}
                    onChange={(e) => setFormData({...formData, allergens: e.target.value})}
                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#ff9f32] hover:bg-[#252525] transition-colors rounded">
                    {editingItem ? 'Update' : 'Add'} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
