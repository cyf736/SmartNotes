import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { moduleAPI } from '../api'

const COLORS = ['#7C3AED', '#059669', '#2563EB', '#DC2626', '#EA580C', '#0891B2', '#7C3AED', '#4F46E5']

function Modules() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: COLORS[0] })

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = () => {
    moduleAPI.list().then((res) => {
      setModules(res.data.data || [])
    }).finally(() => setLoading(false))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingModule) {
      await moduleAPI.update(editingModule.id, formData)
    } else {
      await moduleAPI.create(formData)
    }
    setShowModal(false)
    setEditingModule(null)
    setFormData({ name: '', description: '', color: COLORS[0] })
    loadModules()
  }

  const handleEdit = (module) => {
    setEditingModule(module)
    setFormData({ name: module.name, description: module.description, color: module.color })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个模块吗？')) {
      await moduleAPI.delete(id)
      loadModules()
    }
  }

  const openCreateModal = () => {
    setEditingModule(null)
    setFormData({ name: '', description: '', color: COLORS[0] })
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">学习模块</h1>
        <button
          onClick={openCreateModal}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建模块
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无模块，点击上方按钮创建
          </div>
        ) : (
          modules.map((module) => (
            <div key={module.id} className="bg-white rounded-xl p-6 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: module.color + '20' }}
                  >
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: module.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{module.name}</h3>
                    <span className="text-xs text-gray-500">排序: {module.sort_order}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-4 line-clamp-2">{module.description || '暂无描述'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(module)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-muted rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Edit className="w-3 h-3" />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(module.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{editingModule ? '编辑模块' : '新建模块'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">模块名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">模块描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">选择颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingModule ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Modules