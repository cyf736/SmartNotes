# SmartNotes - 智能笔记系统

## 1. 项目概述

**项目名称:** SmartNotes  
**项目类型:** 学习笔记管理平台  
**核心功能:** 支持多学习模块切换、笔记CRUD、智能笔记整理（AI二次加工）、Markdown渲染  
**目标用户:** 学习者，需要整理和管理各类笔记的用户

## 2. 技术架构

### 后端
- **语言:** Go 1.21+
- **框架:** Gin Web Framework
- **ORM:** GORM
- **数据库:** MySQL 8.0
- **AI接入:** OpenAI SDK + 阿里云百炼API (DashScope)
- **端口:** 6767

### 前端
- **框架:** React 18 + Vite
- **路由:** React Router v6
- **Markdown:** react-markdown + remark-gfm
- **HTTP:** Axios
- **UI:** TailwindCSS + Lucide Icons

### API设计
| Method | Endpoint | 描述 |
|--------|----------|------|
| GET | /api/modules | 获取所有学习模块 |
| POST | /api/modules | 创建学习模块 |
| PUT | /api/modules/:id | 更新学习模块 |
| DELETE | /api/modules/:id | 删除学习模块 |
| GET | /api/notes | 获取笔记列表（分页+模糊搜索） |
| GET | /api/notes/:id | 获取笔记详情 |
| POST | /api/notes | 创建笔记 |
| PUT | /api/notes/:id | 更新笔记 |
| DELETE | /api/notes/:id | 删除笔记 |
| POST | /api/notes/upload | 上传并智能整理笔记 |

## 3. 数据库设计

### 模块表 (modules)
| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(100) | 模块名称 |
| description | TEXT | 模块描述 |
| color | VARCHAR(20) | 模块颜色 |
| sort_order | INT | 排序 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 笔记表 (notes)
| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| module_id | BIGINT FK | 所属模块 |
| title | VARCHAR(255) | 笔记标题 |
| content | LONGTEXT | Markdown内容 |
| original_content | LONGTEXT | 原始上传内容 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 4. 前端页面结构

### 页面列表
1. **首页/仪表盘** - 展示模块列表和最近笔记
2. **模块管理页** - 管理学习模块（增删改）
3. **笔记列表页** - 分页展示笔记，支持搜索
4. **笔记详情页** - Markdown渲染展示
5. **笔记编辑页** - 创建/编辑笔记
6. **智能上传页** - 上传笔记并AI整理

### 路由设计
```
/                     - 首页仪表盘
/modules              - 模块管理
/notes                - 笔记列表
/notes/new            - 新建笔记
/notes/:id            - 笔记详情
/notes/:id/edit       - 编辑笔记
/upload               - 智能上传
```

## 5. AI智能整理功能

### 提示词设计
```
你是一个专业的学习笔记整理助手。请对用户上传的笔记进行以下处理：

1. 格式整理：
   - 使用Markdown格式组织内容
   - 标题层级清晰（一级、二级、三级标题）
   - 列表、代码块、引用等适当使用
   
2. 内容优化：
   - 修正错别字和语法错误
   - 使语句更加通顺
   - 保持原意不变
   
3. 结构优化：
   - 自动识别并添加合适的标题
   - 内容分段合理
   - 重点内容可使用加粗或高亮

请直接返回整理后的Markdown内容，不要添加任何解释。
```

### API调用
- **Endpoint:** POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
- **Model:** qwen-plus (qwen3.6-plus)
- **API Key:** 从配置文件加载

## 6. 设计系统

### 颜色
- Primary: #7C3AED (紫色)
- Secondary: #8B5CF6
- Accent: #059669 (绿色)
- Background: #FAF5FF
- Foreground: #0F172A
- Muted: #F7F3FD
- Border: #EFE7FC
- Destructive: #DC2626

### 字体
- Google Fonts: Plus Jakarta Sans
- 用途: 全部文本

### 效果
- 微交互动画 (50-100ms)
- 加载旋转动画
- 成功/错误状态动画

## 7. 配置文件

### .env 文件位置
- `/home/admin/.openclaw/workspace/smartnotes/.env`

### 配置文件格式
```
DSN=root:password@tcp(localhost:3306)/smartnotes?charset=utf8mb4&parseTime=True&loc=Local
API_KEY=your-api-key-here
BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL=qwen-plus
```

## 8. Nginx配置

- **监听端口:** 6767
- **反向代理:** 前端静态资源 + 后端API
- **静态文件:** /dist

## 9. 功能清单

### 模块管理
- [x] 查看模块列表
- [x] 创建新模块
- [x] 编辑模块
- [x] 删除模块
- [x] 模块切换

### 笔记管理
- [x] 查看笔记列表（分页）
- [x] 搜索笔记（标题/内容模糊匹配）
- [x] 创建笔记
- [x] 编辑笔记
- [x] 删除笔记
- [x] Markdown渲染展示

### 智能上传
- [x] 上传笔记文本
- [x] 调用AI进行格式整理
- [x] 生成Markdown格式笔记
- [x] 保存到笔记列表

## 10. 验收标准

1. ✅ 可以切换不同的学习模块
2. ✅ 可以新增/编辑/删除模块
3. ✅ 可以新增/编辑/删除笔记
4. ✅ 笔记列表支持分页
5. ✅ 支持标题和内容的模糊搜索
6. ✅ 笔记内容以Markdown格式展示
7. ✅ 上传笔记后AI自动整理格式
8. ✅ 系统运行在6767端口
9. ✅ API Key从配置文件加载，不硬编码