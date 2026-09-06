import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Image, Sparkles, X, ChevronDown, Tag as TagIcon } from 'lucide-react'
import { noteAPI, moduleAPI, tagAPI } from '../api'

const TAG_COLORS = ['#7C3AED', '#059669', '#2563EB', '#DC2626', '#EA580C', '#0891B2', '#4F46E5', '#B45309']
const tagColor = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % 997
  return TAG_COLORS[hash % TAG_COLORS.length]
}

function NoteEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [modules, setModules] = useState([])
  // existing tags available to pick from (dropdown)
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [tagsOpen, setTagsOpen] = useState(false)
  const [tagCreateLoading, setTagCreateLoading] = useState(false)
  const tagInputRef = useRef(null)
  const tagBoxRef = useRef(null)
  const [formData, setFormData] = useState({ module_id: '', title: '', content: '', tags: [] })
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    moduleAPI.list().then((res) => setModules(res.data.data || []))
    tagAPI.list().then((res) => setAllTags(res.data.data || []))
    if (isEdit) {
      noteAPI.get(id).then((res) => {
        const note = res.data.data
        setFormData({
          module_id: note.module_id?.toString() || '',
          title: note.title || '',
          content: note.content || '',
          tags: note.tags || []
        })
      }).finally(() => setLoading(false))
    }
  }, [id, isEdit])

  // Close tag dropdown when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (tagBoxRef.current && !tagBoxRef.current.contains(e.target)) {
        setTagsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // --- tag helpers ---
  const selectedNames = new Set(formData.tags.map((t) => t.name))
  const normalizedQuery = tagQuery.trim()
  const filteredTags = allTags
    .filter((t) => !selectedNames.has(t.name))
    .filter((t) => !normalizedQuery || t.name.toLowerCase().includes(normalizedQuery.toLowerCase()))
    .slice(0, 20)
  const canCreate = !!normalizedQuery &&
    !selectedNames.has(normalizedQuery) &&
    !allTags.some((t) => t.name.toLowerCase() === normalizedQuery.toLowerCase())

  const addTag = (tag) => {
    if (!tag || !tag.name) return
    if (selectedNames.has(tag.name)) return
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, { id: tag.id, name: tag.name }] }))
    setTagQuery('')
  }
  const removeTag = (name) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.name !== name) }))
  }
  const handleTagKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // If dropdown shows an exact/available existing match, pick it; otherwise create new
      const match = filteredTags.find((t) => !normalizedQuery || t.name.toLowerCase() === normalizedQuery.toLowerCase())
      if (match) {
        addTag(match)
      } else if (canCreate) {
        createNewTag(normalizedQuery)
      }
    } else if (e.key === 'Backspace' && !normalizedQuery && formData.tags.length) {
      removeTag(formData.tags[formData.tags.length - 1].name)
    }
  }
  const createNewTag = async (name) => {
    const trimmed = name.trim()
    if (!trimmed || selectedNames.has(trimmed)) return
    setTagCreateLoading(true)
    try {
      // Create (server returns existing if already present) then add locally
      const res = await tagAPI.create(trimmed)
      const created = res.data.data
      addTag(created)
      setAllTags((prev) => {
        if (prev.some((t) => t.id === created.id)) return prev
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      })
      setTagQuery('')
      setTagsOpen(false)
    } catch (err) {
      alert('创建标签失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setTagCreateLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...formData,
        module_id: formData.module_id ? parseInt(formData.module_id) : 1,
        // send tags as plain names; backend resolves/creates them
        tags: (formData.tags || []).map((t) => t.name)
      }
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
    await uploadImage(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Insert image markdown at the current textarea caret (defaults to end if none).
  const insertContentAtCaret = (insertText) => {
    const ta = textareaRef.current
    // Take the caret offset from the live DOM; use it only as an index.
    const caret = ta ? (ta.selectionStart ?? ta.value.length) : formData.content.length
    // Compose from the latest state so rapid back-to-back inserts don't clobber.
    setFormData((prev) => {
      const before = prev.content.slice(0, caret)
      const after = prev.content.slice(caret)
      return { ...prev, content: before + insertText + after }
    })
    // After React re-renders, move the caret right after the inserted text.
    requestAnimationFrame(() => {
      const nt = textareaRef.current
      if (nt) {
        const pos = caret + insertText.length
        nt.focus()
        nt.setSelectionRange(pos, pos)
      }
    })
  }

  const uploadImage = async (file) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    setUploadingImage(true)
    try {
      const res = await noteAPI.uploadImage(file)
      const imageUrl = res.data.url
      insertContentAtCaret(`\n![](${imageUrl})\n`)
    } catch (err) {
      alert('上传图片失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setUploadingImage(false)
    }
  }

  // Paste image handler - detect Ctrl+V with image.
  // Only fires when the note editor textarea is focused, so pasting an image
  // elsewhere can never inject into / create a note by accident.
  useEffect(() => {
    const handlePaste = async (e) => {
      console.log('[SmartNotes] Paste event detected, types:', e.clipboardData?.types)
      const items = e.clipboardData?.items
      if (!items) {
        console.log('[SmartNotes] No clipboard items')
        return
      }

      const textarea = textareaRef.current
      const editorFocused = !!textarea && document.activeElement === textarea
      const hasImage = Array.from(items).some((item) => item.type.startsWith('image/'))

      // Ignore image pasted anywhere outside the editor textarea.
      if (!editorFocused) return

      // Only intercept image content; let plain text paste behave normally
      // (keeps the caret where the browser would put it).
      if (!hasImage) return

      e.preventDefault()
      console.log('[SmartNotes] Image paste detected, uploading...')
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            await uploadImage(file)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  // Drag and drop image handler - attach to the form field wrapper
  useEffect(() => {
    const wrapper = document.querySelector('[data-editor-wrapper]')
    const textarea = document.querySelector('textarea')
    if (!wrapper && !textarea) return

    const target = wrapper || textarea

    const handleDragOver = (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log('[SmartNotes] Drag over detected')
      target.classList.add('ring-2', 'ring-primary', 'border-primary')
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      e.stopPropagation()
      target.classList.remove('ring-2', 'ring-primary', 'border-primary')
    }

    const handleDrop = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log('[SmartNotes] Drop detected')
      target.classList.remove('ring-2', 'ring-primary', 'border-primary')

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) {
        console.log('[SmartNotes] No files in drop')
        return
      }

      for (const file of files) {
        console.log('[SmartNotes] Dropped file:', file.type, file.name)
        if (file.type.startsWith('image/')) {
          await uploadImage(file)
        }
      }
    }

    target.addEventListener('dragover', handleDragOver)
    target.addEventListener('dragleave', handleDragLeave)
    target.addEventListener('drop', handleDrop)

    return () => {
      target.removeEventListener('dragover', handleDragOver)
      target.removeEventListener('dragleave', handleDragLeave)
      target.removeEventListener('drop', handleDrop)
    }
  }, [])

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
      // Update form with AI-processed content (still an unsaved draft here;
      // pressing 保存 will persist it into the current note without creating a
      // duplicate, because the AI endpoint no longer inserts a note row).
      setFormData(prev => ({
        ...prev,
        content: res.data.data.content,
        title: prev.title || res.data.data.title || '未命名笔记'
      }))
      alert('AI整理完成！点击“保存笔记”写入当前笔记即可。')
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 所属分类（模块） */}
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-2">所属分类</label>
              <select
                value={formData.module_id}
                onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                className="w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
              >
                <option value="">选择分类（可选）</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* 标签（多选，可下拉选择或手动添加新标签） */}
            <div className="min-w-0" ref={tagBoxRef}>
              <label className="block text-sm font-medium mb-2">标签（可多选）</label>
              <div
                className="relative border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent bg-white"
              >
                <div
                  className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 cursor-text min-h-[46px]"
                  onClick={() => { setTagsOpen(true); tagInputRef.current?.focus() }}
                >
                  {formData.tags.map((t) => (
                    <span
                      key={t.name}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: tagColor(t.name) }}
                    >
                      {t.name}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTag(t.name) }}
                        className="hover:bg-white/20 rounded-full p-0.5"
                        aria-label={`移除 ${t.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagQuery}
                    onChange={(e) => { setTagQuery(e.target.value); setTagsOpen(true) }}
                    onFocus={() => setTagsOpen(true)}
                    onKeyDown={handleTagKey}
                    className="flex-1 min-w-[110px] outline-none text-sm py-1"
                    placeholder={formData.tags.length ? '＋ 添加标签' : '选择或输入后回车添加…'}
                  />
                </div>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                {/* dropdown */}
                {tagsOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {tagCreateLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-400">创建中…</div>
                    ) : (
                      <>
                        {canCreate && (
                          <button
                            type="button"
                            onClick={() => createNewTag(normalizedQuery)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                          >
                            <TagIcon className="w-4 h-4 text-primary" />
                            <span>创建标签 <b>“{normalizedQuery}”</b></span>
                          </button>
                        )}
                        {filteredTags.length === 0 && !canCreate ? (
                          <div className="px-3 py-2 text-sm text-gray-400">暂无其他标签</div>
                        ) : (
                          filteredTags.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => { addTag(t); tagInputRef.current?.focus() }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tagColor(t.name) }} />
                              <span className="truncate">{t.name}</span>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                  disabled={uploadingImage}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                >
                  <Image className="w-4 h-4" />
                  {uploadingImage ? '上传中...' : '插入图片'}
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
            <div data-editor-wrapper className="relative">
              <textarea
              ref={textareaRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none font-mono text-sm transition-all"
              rows="20"
              placeholder="使用 Markdown 格式书写笔记内容，支持：
• Ctrl+V 粘贴图片上传
• 拖拽图片到此处上传
• 点击插入图片按钮选择文件..."
            />
            {uploadingImage && (
              <div className="mt-2 text-sm text-primary flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                图片上传中...
              </div>
            )}
            </div>
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