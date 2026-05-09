import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Package, LogOut, TrendingUp, Mail, Copy, UserX, UserCheck, Link } from 'lucide-react'
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
    stock: '0'
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

  const navigate = useNavigate()
  const { token, logout } = useAuth()

  const CATEGORIES = ['Bowls', 'Sides', 'Dips', 'Desserts']

  useEffect(() => {
    if (!token) return
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    fetchData()
  }, [token])

  useEffect(() => {
    if (activeTab === 'invites' && token) {
      fetchInvites()
    }
  }, [activeTab, token])

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
      if (editingItem) {
        await axios.put(`/api/admin/menu-items/${editingItem.id}`, {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          imageUrl: formData.imageUrl || null
        })
      } else {
        await axios.post('/api/admin/menu-items', {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          imageUrl: formData.imageUrl || null,
          initialInventory: parseInt(formData.stock)
        })
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
      stock: item.inventory?.quantityAvailable?.toString() || '0'
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
    setFormData({ name: '', description: '', price: '', category: '', imageUrl: '', stock: '0' })
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
            <button onClick={handleLogout} className="btn-error flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
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
            { id: 'invites', label: 'Invite Buyers' },
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
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
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
                  <div className="flex space-x-2">
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="input-field"
                    min="0"
                  />
                </div>
              )}
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
