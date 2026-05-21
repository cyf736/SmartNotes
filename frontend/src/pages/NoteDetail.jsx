import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Edit, Trash2, FileText, FileCode } from 'lucide-react'
import { noteAPI } from '../api'

function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOriginalModal, setShowOriginalModal] = useState(false)

  useEffect(() => {
    noteAPI.get(id).then((res) => {
      setNote(res.data.data)
    }).catch(() => {
      navigate('/notes')
    }).finally(() => setLoading(false))
  }, [id, navigate])

  const handleDelete = async () => {
    if (window.confirm('确定要删除这个笔记吗？')) {
      await noteAPI.delete(id)
      navigate('/notes')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!note) return null

  return (
    <div>
      {/* Header - Mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{note.title}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-500">
              {note.module && (
                <span
                  className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-white flex-shrink-0"
                  style={{ backgroundColor: note.module.color }}
                >
                  {note.module.name}
                </span>
              )}
              <span className="hidden sm:inline">创建于 {new Date(note.created_at).toLocaleString()}</span>
              <span className="hidden sm:inline">更新于 {new Date(note.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-auto flex-shrink-0">
          <button
            onClick={() => navigate(`/notes/${id}/edit`)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">编辑</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">删除</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-border p-6 md:p-8">
        {note.content ? (
          <div className="markdown-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无内容</p>
          </div>
        )}
      </div>

      {/* Original Content Button */}
      {note.original_content && note.original_content !== note.content && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowOriginalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <FileCode className="w-4 h-4" />
            查看原始内容
          </button>
        </div>
      )}

      {/* Original Content Modal */}
      {showOriginalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOriginalModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-lg">原始内容</h3>
              <button
                onClick={() => setShowOriginalModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{note.original_content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoteDetail