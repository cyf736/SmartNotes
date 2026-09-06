import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Bot, Sparkles, Check, Plus, X, CheckCircle2 } from 'lucide-react'
import { settingsAPI } from '../api'

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{hint}</p>}
    </div>
  )
}

function Settings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  // 当前解析模型（从列表中选中）
  const [model, setModel] = useState('')
  // 自定义模型候选列表（可增删改）
  const [models, setModels] = useState([])
  // AI 整理提示词
  const [prompt, setPrompt] = useState('')
  // 底部“新增模型”输入框
  const [newModel, setNewModel] = useState('')

  useEffect(() => {
    settingsAPI
      .get()
      .then((res) => {
        const s = res.data?.data || {}
        setModel(s.ai_model || '')
        setPrompt(s.ai_prompt || '')
        setModels(Array.isArray(s.ai_models) ? s.ai_models : [])
      })
      .catch((err) => alert('加载设置失败: ' + (err.response?.data?.error || err.message)))
      .finally(() => setLoading(false))
  }, [])

  const addModel = () => {
    const m = newModel.trim()
    if (!m) return
    if (models.includes(m)) {
      alert('该模型已在列表中')
      setNewModel('')
      return
    }
    setModels((prev) => [...prev, m])
    setNewModel('')
  }

  const removeModel = (m) => {
    setModels((prev) => prev.filter((x) => x !== m))
    // 如果删掉的是当前选中模型，则清空当前选择
    if (model === m) setModel('')
  }

  const handleSave = async () => {
    if (!model.trim()) {
      alert('请先在模型列表中选择一个解析模型（或在列表删改后点击模型名选中）')
      return
    }
    if (!prompt.trim()) {
      alert('请填写 AI 解析提示词')
      return
    }
    setSaving(true)
    try {
      await settingsAPI.update({ ai_model: model.trim(), ai_models: models, ai_prompt: prompt })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      alert('保存设置失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
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
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">设置</h1>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-8">
        {/* 解析模型 */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">AI 解析模型</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {/* 当前生效模型提示 */}
            {model ? <>当前解析使用：<code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm">{model}</code></> : '尚未选择解析模型'}
          </p>

          <div className="space-y-4">
            <Field label="模型候选列表（可自由增删改）" hint="点击条目即为当前解析模型；点 × 从列表删除。添加新模型请在下方输入后回车或点“添加”。">
              {models.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-6 bg-muted/50 rounded-lg border border-dashed border-border">
                  暂无模型，请在下方添加
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {models.map((m) => {
                    const selected = m === model
                    return (
                      <span
                        key={m}
                        className={`group inline-flex items-center gap-1.5 rounded-lg border px-2 pl-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? 'bg-primary text-white border-primary'
                            : 'border-border bg-white hover:bg-muted'
                        }`}
                      >
                        <button type="button" onClick={() => setModel(m)} className="font-mono flex items-center gap-1.5">
                          {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {m}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeModel(m)}
                          aria-label={`删除 ${m}`}
                          className={`p-0.5 rounded-full transition-colors ${
                            selected ? 'hover:bg-white/20 text-white/80' : 'text-gray-400 hover:bg-gray-200 hover:text-red-600'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </Field>

            <Field label="添加新模型">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
                  placeholder="输入模型 ID，如 deepseek-chat，回车添加"
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={addModel}
                  className="px-4 py-2 bg-muted rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">把条目加入列表后，点击该条目即可设为解析模型，保存一并生效。</p>
            </Field>
          </div>
        </section>

        {/* 解析提示词 */}
        <section className="pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">AI 解析提示词（System Prompt）</h2>
          </div>
          <Field label="提示词内容" hint="点击“AI智能整理”时发送给模型作为系统提示词，负责约束整理规则与输出格式。">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y text-sm leading-relaxed"
              placeholder="在此编写 AI 整理笔记的提示词…"
            />
          </Field>
        </section>

        {/* 操作栏 */}
        <div className="flex flex-wrap gap-3 pt-6 border-t border-border items-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {savedFlash ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? '保存中…' : savedFlash ? '已保存' : '保存设置'}
          </button>
          <span className="text-xs text-gray-500">保存后即刻生效，AI 智能整理将使用新配置，无需重启服务。</span>
        </div>
      </div>
    </div>
  )
}

export default Settings
