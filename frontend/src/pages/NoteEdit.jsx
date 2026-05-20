import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Image, Sparkles } from 'lucide-react'
import { noteAPI, moduleAPI } from '../api'

function NoteEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [modules, setModules] = useState([])
  const [formData, setFormData] = useState({ module_id: '', title: '', content: '' })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    moduleAPI.list().then((res) => setModules(res.data.data || []))
    if (isEdit) {
      noteAPI.get(id).then((res) => {
        const note = res.data.data
        setFormData({
          module_id: note.module_id?.toString() || '',
          title: note.title || '',
          content: note.content || ''
        })
      }).finally(() => setLoading(false))
    }
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...formData, module_id: formData.module_id ? parseInt(formData.module_id) : 1 }
      let noteId = id
      if (isEdit) {
        await noteAPI.update(id, data)
      } else {
        const res = await noteAPI.create(data)
        noteId = res.data.data.id
      }
      // Navigate back to note detail page instead of notes list
      navigate(`/notes/${noteId}`)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await noteAPI.uploadImage(file)
      const imageUrl = res.data.url
      const markdownImage = `\n![](${imageUrl})\n`
      setFormData(prev => ({
        ...prev,
        content: prev.content + markdownImage
      }))
    } catch (err) {
      alert('上传图片失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAiFormat = async () => {
    if (!formData.content.trim()) {
      alert('请先输入笔记内容')
      return
    }

    if (!window.confirm('AI将整理当前笔记内容，是否继续？')) {
      return
    }

    setAiProcessing(true)
    try {
      const res = await noteAPI.upload({
        module_id: formData.module_id || '1',
        title: formData.title || '未命名笔记',
        content: formData.content
      })
      // Update form with AI-processed content
      setFormData(prev => ({
        ...prev,
        content: res.data.data.content
      }))
      alert('AI整理完成！')
    } catch (err) {
      alert('AI整理失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setAiProcessing(false)
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
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? '编辑笔记' : '新建笔记'}</h1>
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">笔记标题</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-lg"
              placeholder="输入笔记标题..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">所属模块</label>
            <select
              value={formData.module_id}
              onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">选择模块（可选）</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">笔记内容（支持 Markdown）</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAiFormat}
                  disabled={aiProcessing || !formData.content.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {aiProcessing ? 'AI整理中...' : 'AI智能整理'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                >
                  <Image className="w-4 h-4" />
                  {uploading ? '上传中...' : '插入图片'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none font-mono text-sm"
              rows="20"
              placeholder="使用 Markdown 格式书写笔记内容，支持插入图片和AI智能整理..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存笔记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NoteEdit