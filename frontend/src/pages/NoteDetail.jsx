import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import mermaid from 'mermaid'

// Mermaid 全局初始化: 浅色主题 + 统一配色, 与页面风格一致
let mermaidInitialized = false
const initMermaid = () => {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    themeVariables: {
      primaryColor: '#ffffff',
      primaryTextColor: '#334155',
      primaryBorderColor: '#7C3AED',
      lineColor: '#7C3AED',
      secondaryColor: '#F7F3FD',
      tertiaryColor: '#ffffff',
      fontFamily: 'Inter, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif',
    },
    flowchart: { htmlLabels: true, curve: 'basis' },
  })
  mermaidInitialized = true
}

// 单个 Mermaid 图组件: 渲染 svg, 失败则回退为原始文本
function MermaidBlock({ code }) {
  const [svg, setSvg] = useState(null)
  const [err, setErr] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    initMermaid()
    let cancelled = false
    const id = 'mmd-' + Math.random().toString(36).slice(2, 10)
    mermaid.render(id, code)
      .then(({ svg }) => { if (!cancelled) setSvg(svg) })
      .catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true }
  }, [code])
  if (err) {
    return (
      <div className="my-4 overflow-x-auto">
        <pre className="text-gray-600 text-sm bg-gray-50 border border-gray-200 rounded-lg p-4">
          <code>{code}</code>
        </pre>
      </div>
    )
  }
  return (
    <div className="my-6 overflow-x-auto" ref={ref}>
      <div
        className="flex justify-center bg-white rounded-xl border border-gray-100 p-6"
        dangerouslySetInnerHTML={{ __html: svg || '' }}
      />
    </div>
  )
}
import { ArrowLeft, Edit, Trash2, FileText, FileCode, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { noteAPI } from '../api'

// small helper: resolve an image src that may be a root-relative path
// (e.g. "/uploads/x.png") against the current origin.
const resolveSrc = (src) => {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src
  return src.startsWith('/') ? src : '/' + src
}

function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOriginalModal, setShowOriginalModal] = useState(false)

  const TAG_COLORS = ['#7C3AED', '#059669', '#2563EB', '#DC2626', '#EA580C', '#0891B2', '#4F46E5', '#B45309']
  const tagColor = (name) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % 997
    return TAG_COLORS[hash % TAG_COLORS.length]
  }

  // Image lightbox state: the zoomed src + scale + natural pixel width.
  const [zoomImage, setZoomImage] = useState(null)
  const [zoomScale, setZoomScale] = useState(1)
  const [naturalW, setNaturalW] = useState(0)
  const scrollRef = useRef(null)
  const ZOOM_MIN = 0.1
  const ZOOM_MAX = 20

  const clamp = (v) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v))

  // step is a factor; >1 zoom in, <1 zoom out (anchor zoom to keep viewport center-ish)
  const applyZoom = useCallback((factor) => {
    setZoomScale((s) => clamp(Math.round(s * factor * 20) / 20))
  }, [])

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

  const openZoom = (src) => {
    setZoomImage(resolveSrc(src))
    setZoomScale(1) // open at 100% (natural pixels); user can zoom in/out
    setNaturalW(0)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    })
  }
  const closeZoom = () => setZoomImage(null)
  const zoomIn = () => applyZoom(1.25)
  const zoomOut = () => applyZoom(0.8)
  const resetZoom = () => setZoomScale(1)
  const zoomPct = Math.round(zoomScale * 100)

  // Escape closes; Ctrl/Cmd +/- zooms; plain +/- zooms too
  useEffect(() => {
    if (!zoomImage) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeZoom()
        return
      }
      const key = e.key
      const zoomUp = (e.ctrlKey || e.metaKey) && (key === '+' || key === '=' || key === 'Add')
      const zoomDown = (e.ctrlKey || e.metaKey) && (key === '-' || key === 'Subtract')
      const plainUp = !e.ctrlKey && !e.metaKey && (key === '+' || key === '=')
      const plainDown = !e.ctrlKey && !e.metaKey && key === '-'
      if (zoomUp || plainUp) {
        e.preventDefault()
        zoomIn()
      } else if (zoomDown || plainDown) {
        e.preventDefault()
        zoomOut()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomImage])

  // Ctrl/Cmd + wheel to zoom
  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    applyZoom(e.deltaY < 0 ? 1.1 : 0.9)
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
              {(note.tags || []).map((t) => (
                <span
                  key={t.id || t.name}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-white flex-shrink-0 text-xs"
                  style={{ backgroundColor: tagColor(t.name) }}
                >
                  #{t.name}
                </span>
              ))}
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
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                pre: ({ children }) => {
                  // 从 <code> 子元素读出语言标记
                  const child = Array.isArray(children) ? children[0] : children
                  const lang = child?.props?.className || ''
                  const match = /language-(\w+)/.exec(lang)
                  if (match && match[1] === 'mermaid') {
                    const codeText = String(child.props.children || '').replace(/\n$/, '')
                    return <MermaidBlock code={codeText} />
                  }
                  return <pre>{children}</pre>
                },
                img: ({ node, alt, src, ...props }) => (
                  <span
                    className="inline-block max-w-full cursor-zoom-in relative group"
                    title="点击放大"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openZoom(String(src))
                    }}
                  >
                    <img
                      {...props}
                      src={resolveSrc(String(src))}
                      alt={alt || ''}
                      className="max-w-full h-auto rounded-lg"
                      loading="lazy"
                    />
                    <span
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"
                      aria-hidden
                    >
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow" />
                    </span>
                  </span>
                )
              }}
            >
              {note.content}
            </ReactMarkdown>
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

      {/* Image lightbox - zoomable fullscreen viewer */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          {/* Toolbar */}
          <div className="flex items-center gap-2 justify-between px-4 py-2.5 bg-black/40 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-lg transition-colors"
                title="缩小 (Ctrl+-)"
                aria-label="缩小"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1.5 text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-lg transition-colors min-w-[56px] text-center"
                title="重置为 100%"
              >
                {zoomPct}%
              </button>
              <button
                onClick={zoomIn}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-lg transition-colors"
                title="放大 (Ctrl++)"
                aria-label="放大"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 hidden sm:inline">Ctrl+滚轮 · +/- 放大缩小</span>
              <button
                onClick={resetZoom}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-lg transition-colors"
                title="重置缩放"
                aria-label="重置缩放"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={closeZoom}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-lg transition-colors"
                aria-label="关闭 (Esc)"
                title="关闭 (Esc)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Pannable canvas */}
          <div
            ref={scrollRef}
            onWheel={onWheel}
            className="flex-1 overflow-auto touch-auto p-4"
            onClick={closeZoom}
          >
            <div className="min-h-full min-w-full grid place-items-center">
              <img
                src={zoomImage}
                alt=""
                loading="lazy"
                onLoad={(e) => naturalW || setNaturalW(e.currentTarget.naturalWidth)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: naturalW ? `${Math.round(naturalW * zoomScale)}px` : undefined, maxWidth: 'none' }}
                className="shadow-2xl select-none"
                draggable="false"
              />
            </div>
          </div>
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