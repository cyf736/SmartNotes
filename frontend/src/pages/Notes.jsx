import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, FileText, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react'
import { noteAPI, moduleAPI, tagAPI } from '../api'

const listTagColor = (name) => {
  const cs = ['#7C3AED', '#059669', '#2563EB', '#DC2626', '#EA580C', '#0891B2', '#4F46E5', '#B45309']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % 997
  return cs[h % cs.length]
}

// BROWSE_POS_KEY stores the current Notes list browsing position (module +
// search + page) so the top-nav “笔记” entry can return to the page you were
// on instead of always restarting at page 1.
const BROWSE_POS_KEY = 'notesBrowsePos'

const saveBrowsePos = (pos) => {
  if (!pos) return
  try { localStorage.setItem(BROWSE_POS_KEY, JSON.stringify(pos)) } catch (e) { /* ignore */ }
}
const loadBrowsePos = () => {
  try {
    const raw = localStorage.getItem(BROWSE_POS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

// Build a windowed list of page numbers, e.g. [1,'…',4,5,6,'…',20].
function buildPages(current, total) {
  const pages = []
  const windowSize = 2 // pages shown on each side of the current page
  const push = (p) => { if (!pages.includes(p)) pages.push(p) }
  push(1)
  for (let i = Math.max(2, current - windowSize); i <= Math.min(total - 1, current + windowSize); i++) push(i)
  if (total > 1) push(total)
  pages.sort((a, b) => a - b)
  let prev = 0
  const out = []
  for (const p of pages) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

function Notes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState([])
  const [modules, setModules] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [selectedModule, setSelectedModule] = useState(searchParams.get('module_id') || '')
  // Tag filter: restore from URL (top-nav “笔记” remember) or from localStorage so
  // the chosen tag persists across visits.
  const tagFromUrl = searchParams.get('tag_id')
  const [selectedTag, setSelectedTag] = useState(() =>
    tagFromUrl || localStorage.getItem('selectedTag') || ''
  )
  // Initial page may come from the URL (used when returning from a note detail
  // via the top-nav “笔记” entry). Falls back to 1.
  const pageFromUrlRaw = parseInt(searchParams.get('page'), 10)
  const pageFromUrl = !isNaN(pageFromUrlRaw) && pageFromUrlRaw >= 1 ? pageFromUrlRaw : 1
  const [pagination, setPagination] = useState({ page: pageFromUrl, pageSize: 10, total: 0, totalPages: 0 })

  useEffect(() => {
    moduleAPI.list().then((res) => setModules(res.data.data || []))
    tagAPI.list().then((res) => setTags(res.data.data || []))
  }, [])

  // Persist the chosen tag so it survives refresh & next visit.
  useEffect(() => {
    if (selectedTag) localStorage.setItem('selectedTag', selectedTag)
    else localStorage.removeItem('selectedTag')
  }, [selectedTag])

  // Sync filters (module + tag) with URL params (used when returning via the
  // top-nav “笔记”, which restores the remembered browsing position).
  useEffect(() => {
    const moduleFromUrl = searchParams.get('module_id')
    const moduleFromStorage = localStorage.getItem('selectedModule')
    const moduleToUse = moduleFromUrl || moduleFromStorage || ''
    if (moduleToUse !== selectedModule) {
      setSelectedModule(moduleToUse)
    }
    const tagFromUrl2 = searchParams.get('tag_id')
    if (tagFromUrl2 !== null && tagFromUrl2 !== selectedTag) {
      setSelectedTag(tagFromUrl2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModule, selectedTag, pagination.page])

  const loadNotes = useCallback(() => {
    setLoading(true)
    const currentModule = searchParams.get('module_id') || selectedModule
    const currentTag = searchParams.get('tag_id') || selectedTag || ''
    const params = { page: pagination.page, pageSize: pagination.pageSize, search: search || undefined }
    if (currentModule) params.module_id = currentModule
    if (currentTag) params.tag_id = currentTag
    noteAPI.list(params).then((res) => {
      const data = res.data
      setNotes(data.data || [])
      setPagination({ page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages })
      // Remember where the user is browsing so the top-nav “笔记” can return here.
      saveBrowsePos({
        module_id: currentModule || '',
        tag_id: currentTag || '',
        search: search || '',
        page: data.page || 1,
        totalPages: data.totalPages || 1,
      })
    }).finally(() => setLoading(false))
  }, [search, pagination.page, pagination.pageSize, selectedModule, selectedTag, searchParams])

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination({ ...pagination, page: 1 })
    loadNotes()
  }

  const handleTagChange = (tagId) => {
    setSelectedTag(tagId)
    setPagination({ ...pagination, page: 1 })
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
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记标题或内容..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          {/* Tag filter select */}
          <select
            value={selectedTag}
            onChange={(e) => handleTagChange(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            title="按标签筛选"
          >
            <option value="">全部标签</option>
            {tags.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
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
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {note.module && (
                      <span className="px-2 py-1 rounded" style={{ backgroundColor: note.module.color + '20', color: note.module.color }}>
                        {note.module.name}
                      </span>
                    )}
                    {(note.tags || []).map((t) => (
                      <span key={t.id || t.name} className="px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: listTagColor(t.name) }}>
                        #{t.name}
                      </span>
                    ))}
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
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="min-w-[38px] h-[38px] px-2 rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="上一页"
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {buildPages(pagination.page, pagination.totalPages).map((p, idx) =>
              p === '…' ? (
                <span key={`e${idx}`} className="px-2 text-gray-400 select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className={`min-w-[38px] h-[38px] px-2 rounded-lg text-sm font-medium transition-colors ${
                    p === pagination.page
                      ? 'bg-primary text-white shadow'
                      : 'border border-border bg-white hover:bg-muted'
                  }`}
                  aria-current={p === pagination.page ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => changePage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="min-w-[38px] h-[38px] px-2 rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="下一页"
              title="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-gray-500">第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条</span>
        </div>
      )}
    </div>
  )
}

export default Notes