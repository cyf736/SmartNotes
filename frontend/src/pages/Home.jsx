import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, ChevronRight, Clock } from 'lucide-react'
import { moduleAPI, noteAPI } from '../api'

function Home() {
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [recentNotes, setRecentNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      moduleAPI.list(),
      noteAPI.list({ pageSize: 5 })
    ]).then(([modulesRes, notesRes]) => {
      setModules(modulesRes.data.data || [])
      setRecentNotes(notesRes.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">欢迎使用 SmartNotes</h1>
        <p className="opacity-90 mb-6">智能笔记管理系统，让你的学习更加高效</p>
        <button
          onClick={() => navigate('/notes/new')}
          className="bg-white text-primary px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建笔记
        </button>
      </div>

      {/* Modules Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">学习模块</h2>
          <button
            onClick={() => navigate('/modules')}
            className="text-primary hover:underline flex items-center gap-1"
          >
            管理模块 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modules.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              暂无模块，<button onClick={() => navigate('/modules')} className="text-primary hover:underline">去创建</button>
            </div>
          ) : (
            modules.slice(0, 3).map((module) => (
              <div
                key={module.id}
                className="bg-white rounded-xl p-6 border border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/notes?module_id=${module.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: module.color + '20' }}
                  >
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: module.color }} />
                  </div>
                  <h3 className="font-semibold">{module.name}</h3>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{module.description || '暂无描述'}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Notes Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">最近笔记</h2>
          <button
            onClick={() => navigate('/notes')}
            className="text-primary hover:underline flex items-center gap-1"
          >
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {recentNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无笔记
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 hover:bg-muted cursor-pointer transition-colors flex items-center gap-4"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {note.module && <span className="px-2 py-0.5 bg-muted rounded">{note.module.name}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home