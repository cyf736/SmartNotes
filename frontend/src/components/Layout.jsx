import { Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Layers, FileText, Home, Menu, X, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { moduleAPI } from '../api'

function Layout() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modules, setModules] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Get module from URL or localStorage (persisted selection)
  const currentModule = searchParams.get('module_id') || localStorage.getItem('selectedModule') || ''

  useEffect(() => {
    moduleAPI.list().then((res) => setModules(res.data.data || []))
  }, [])

  // When component mounts, sync localStorage with URL if needed
  useEffect(() => {
    const urlModule = searchParams.get('module_id')
    if (urlModule && urlModule !== localStorage.getItem('selectedModule')) {
      localStorage.setItem('selectedModule', urlModule)
    }
  }, [searchParams])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [navigate])

  const handleModuleChange = (moduleId) => {
    // Persist selection in localStorage
    if (moduleId) {
      localStorage.setItem('selectedModule', moduleId)
      navigate(`/notes?module_id=${moduleId}`)
    } else {
      localStorage.removeItem('selectedModule')
      navigate('/notes')
    }
    setMobileMenuOpen(false)
  }

  // Build the “笔记” nav target by restoring the last remembered browsing
  // position (module + tag + search + page), so leaving a detail view and
  // clicking “笔记” again returns to where you were rather than page 1.
  const notesHref = () => {
    let pos = null
    try { pos = JSON.parse(localStorage.getItem('notesBrowsePos') || 'null') } catch (e) { pos = null }
    const qp = new URLSearchParams()
    if (pos && pos.module_id) qp.set('module_id', pos.module_id)
    if (pos && pos.tag_id) qp.set('tag_id', pos.tag_id)
    if (pos && pos.search) qp.set('search', pos.search)
    if (pos && pos.page && pos.page > 1) qp.set('page', pos.page)
    const qs = qp.toString()
    return '/notes' + (qs ? '?' + qs : '')
  }

  const handleNotesNav = (e) => {
    e.preventDefault()
    const target = notesHref()
    // Avoid a redundant reload when already on the exact same list view.
    if (window.location.pathname + window.location.search !== target) {
      navigate(target)
    }
    setMobileMenuOpen(false)
  }

  const navItems = [
    { to: "/", icon: Home, label: "首页" },
    { to: "/modules", icon: Layers, label: "分类" },
    { to: "/notes", icon: FileText, label: "笔记", restorePos: true },
    { to: "/settings", icon: SettingsIcon, label: "设置" },
  ]

  // Shared renderer used by both desktop & mobile nav lists. `mobile` switches to
  // the larger tap-friendly layout and closes the drawer on navigation.
  const renderNavItem = ({ to, icon: Icon, label, restorePos, mobile }) => {
    const handleClick = restorePos ? handleNotesNav : (e) => { if (mobile) setMobileMenuOpen(false) }
    return (
      <NavLink
        key={to}
        to={restorePos ? notesHref() : to}
        onClick={handleClick}
        className={({ isActive }) =>
          `flex items-center transition-colors ${
            mobile
              ? `gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'} text-base`
              : `gap-2 px-4 py-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
          }`
        }
      >
        <Icon className={mobile ? 'w-5 h-5' : 'w-4 h-4'} />
        <span className={mobile ? 'text-base' : ''}>{label}</span>
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile responsive */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary truncate">SmartNotes</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => renderNavItem(item))}
            </nav>
            {/* Module filter dropdown */}
            <select
              value={currentModule}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">全部分类</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="菜单"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white">
            <nav className="flex flex-col p-4 gap-2">
              {navItems.map((item) => renderNavItem({ ...item, mobile: true }))}
              {/* Mobile Module filter */}
              <div className="mt-2 pt-2 border-t border-border">
                <label className="block text-sm text-gray-500 mb-2 px-4">选择分类</label>
                <select
                  value={currentModule}
                  onChange={(e) => handleModuleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">全部分类</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout