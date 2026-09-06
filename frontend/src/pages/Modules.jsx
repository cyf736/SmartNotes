import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Layers, Tag as TagIcon } from 'lucide-react'
import { moduleAPI, tagAPI } from '../api'

const COLORS = ['#7C3AED', '#059669', '#2563EB', '#DC2626', '#EA580C', '#0891B2', '#4F46E5', '#B45309']

// deterministic color from a tag name
const tagColor = (name) => {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = (hash + name.charCodeAt(i)) % 997
  return COLORS[hash % COLORS.length]
}

function ModuleModal({ open, editing, onClose, onSaved }) {
  const [formData, setFormData] = useState({ name: '', description: '', color: COLORS[0] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setFormData(
        editing
          ? { name: editing.name, description: editing.description || '', color: editing.color || COLORS[0] }
          : { name: '', description: '', color: COLORS[0] }
      )
    }
  }, [open, editing])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await moduleAPI.update(editing.id, formData)
      } else {
        await moduleAPI.create(formData)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editing ? '编辑分类' : '新建分类'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">分类名称</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">分类描述</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" rows="3" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">选择颜色</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              {saving ? '保存中…' : (editing ? '保存' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TagModal({ open, editing, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setName(editing ? editing.name : '')
  }, [open, editing])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      if (editing) {
        // Proper in-place rename (backend preserves note associations and merges
        // if the new name already exists case-insensitively).
        await tagAPI.update(editing.id, trimmed)
      } else {
        await tagAPI.create(trimmed)
      }
      onSaved()
    } catch (err) {
      alert('保存标签失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editing ? '重命名标签' : '创建标签'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">标签名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" required />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              {saving ? '保存中…' : (editing ? '保存' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Modules() {
  const [modules, setModules] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  const [moduleModal, setModuleModal] = useState(false)
  const [editingModule, setEditingModule] = useState(null)

  const [tagModal, setTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = () => {
    moduleAPI.list().then((res) => setModules(res.data.data || []))
    tagAPI.list().then((res) => setTags(res.data.data || []))
      .finally(() => setLoading(false))
  }

  const openCreateModule = () => { setEditingModule(null); setModuleModal(true) }
  const openEditModule = (m) => { setEditingModule(m); setModuleModal(true) }
  const handleDeleteModule = async (id) => {
    if (window.confirm('确定要删除这个分类吗？')) {
      await moduleAPI.delete(id)
      loadAll()
    }
  }

  const openCreateTag = () => { setEditingTag(null); setTagModal(true) }
  const openEditTag = (t) => { setEditingTag(t); setTagModal(true) }
  const handleDeleteTag = async (id) => {
    if (window.confirm('确定要删除这个标签吗？删除后相关笔记会失去该标签。')) {
      await tagAPI.delete(id)
      loadAll()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ============ 分类（模块） ============ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">分类</h1>
          </div>
          <button
            onClick={openCreateModule}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建分类
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-border">
              暂无分类，点击右上角新建
            </div>
          ) : (
            modules.map((module) => (
              <div key={module.id} className="bg-white rounded-xl p-5 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: module.color + '20' }}>
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: module.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{module.name}</h3>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-4 text-sm line-clamp-2">{module.description || '暂无描述'}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEditModule(module)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-muted rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    <Pencil className="w-3 h-3" />编辑
                  </button>
                  <button onClick={() => handleDeleteModule(module.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm">
                    <Trash2 className="w-3 h-3" />删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ============ 标签 ============ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TagIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">标签</h1>
          </div>
          <button
            onClick={openCreateTag}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建标签
          </button>
        </div>

        {tags.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-border">
            暂无标签，点击右上角“创建标签”
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="bg-white rounded-xl px-3 py-2 border border-border flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tagColor(tag.name) }} />
                <span className="font-medium">{tag.name}</span>
                <span className="text-xs text-gray-400 hidden sm:inline">· 可多选挂到笔记</span>
                <button onClick={() => openEditTag(tag)} className="p-1.5 hover:bg-muted rounded-lg text-gray-500" title="重命名">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteTag(tag.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg" title="删除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ModuleModal open={moduleModal} editing={editingModule} onClose={() => setModuleModal(false)} onSaved={() => { setModuleModal(false); setEditingModule(null); loadAll() }} />
      <TagModal open={tagModal} editing={editingTag} onClose={() => setTagModal(false)} onSaved={() => { setTagModal(false); setEditingTag(null); loadAll() }} />
    </div>
  )
}

export default Modules
