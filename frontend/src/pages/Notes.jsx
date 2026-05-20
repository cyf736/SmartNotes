import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, FileText, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react'
import { noteAPI, moduleAPI } from '../api'

function Notes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 })
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [selectedModule, setSelectedModule] = useState(searchParams.get('module_id') || '')

  useEffect(() => {
    moduleAPI.list().then((res) => setModules(res.data.data || []))
  }, [])

  // Sync selectedModule with URL params or localStorage (persisted)
  useEffect(() => {
    const moduleFromUrl = searchParams.get('module_id')
    const moduleFromStorage = localStorage.getItem('selectedModule')
    const moduleToUse = moduleFromUrl || moduleFromStorage || ''
    if (moduleToUse !== selectedModule) {
      setSelectedModule(moduleToUse)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    loadNotes()
  }, [selectedModule, pagination.page])

  const loadNotes = useCallback(() => {
    setLoading(true)
    const currentModule = searchParams.get('module_id') || selectedModule
    const params = { page: pagination.page, pageSize: pagination.pageSize, search: search || undefined }
    if (currentModule) params.module_id = currentModule
    noteAPI.list(params).then((res) => {
      const data = res.data
      setNotes(data.data || [])
      setPagination({ page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages })
    }).finally(() => setLoading(false))
  }, [search, pagination.page, pagination.pageSize, selectedModule, searchParams])

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination({ ...pagination, page: 1 })
    loadNotes()
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个笔记吗？')) {
      await noteAPI.delete(id)
      loadNotes()
    }
  }

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">笔记列表</h1>
        <button
          onClick={() => navigate('/notes/new')}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建笔记
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-border mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记标题或内容..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            搜索
          </button>
        </form>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">暂无笔记</p>
          <button
            onClick={() => navigate('/notes/new')}
            className="text-primary hover:underline"
          >
            创建第一个笔记
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => navigate(`/notes/${note.id}`)}
              className="bg-white rounded-xl p-4 border border-border hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{note.title}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-2">{note.content?.replace(/[#*`]/g, '').substring(0, 100)}...</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {note.module && (
                      <span className="px-2 py-1 rounded" style={{ backgroundColor: note.module.color + '20', color: note.module.color }}>
                        {note.module.name}
                      </span>
                    )}
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/notes/${note.id}/edit`) }}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(note.id, e)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => changePage(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2">
            第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
          </span>
          <button
            onClick={() => changePage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default Notes