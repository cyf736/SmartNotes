import { Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Layers, FileText, Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { moduleAPI } from '../api'

function Layout() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modules, setModules] = useState([])

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

  const handleModuleChange = (moduleId) => {
    // Persist selection in localStorage
    if (moduleId) {
      localStorage.setItem('selectedModule', moduleId)
      navigate(`/notes?module_id=${moduleId}`)
    } else {
      localStorage.removeItem('selectedModule')
      navigate('/notes')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">SmartNotes</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`
                }
              >
                <Home className="w-4 h-4" />
                <span>首页</span>
              </NavLink>
              <NavLink
                to="/modules"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`
                }
              >
                <Layers className="w-4 h-4" />
                <span>模块</span>
              </NavLink>
              <NavLink
                to="/notes"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>笔记</span>
              </NavLink>
            </nav>
            {/* Module filter dropdown - persists selection */}
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout