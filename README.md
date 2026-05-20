# SmartNotes - 智能笔记管理系统

一个基于 React + Go 构建的智能笔记管理系统，支持多学习模块切换、笔记 CRUD、智能笔记整理（AI 二次加工）和 Markdown 渲染。

## 功能特性

- ✅ 多学习模块管理（增删改查、颜色分类）
- ✅ 笔记管理（支持 Markdown、搜索、分页）
- ✅ AI 智能整理上传（阿里云百炼 API）
- ✅ 访问验证码保护
- ✅ 响应式设计

## 技术栈

### 后端
- Go 1.21+
- Gin Web Framework
- GORM (MySQL)
- 阿里云百炼 API (DashScope)

### 前端
- React 18 + Vite
- React Router v6
- TailwindCSS
- react-markdown + remark-gfm

## 项目结构

```
smartnotes/
├── backend/
│   ├── cmd/
│   │   └── main.go           # 入口文件
│   ├── internal/
│   │   ├── handler/
│   │   │   └── upload.go      # 上传处理
│   │   └── model/
│   │       └── model.go      # 数据模型
│   ├── pkg/
│   │   └── ai/
│   │       └── client.go     # AI 客户端
│   ├── middleware/
│   │   └── auth.go           # 认证中间件
│   ├── templates/
│   │   └── login.html        # 登录页面
│   ├── go.mod
│   └── .env                  # 环境配置（不提交）
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js      # API 调用
│   │   ├── components/
│   │   │   └── Layout.jsx    # 布局组件
│   │   ├── pages/
│   │   │   ├── Home.jsx      # 首页
│   │   │   ├── Modules.jsx   # 模块管理
│   │   │   ├── Notes.jsx     # 笔记列表
│   │   │   ├── NoteDetail.jsx # 笔记详情
│   │   │   └── NoteEdit.jsx  # 笔记编辑
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── nginx/
│   └── smartnotes.conf       # Nginx 配置
├── SPEC.md                   # 项目规格说明
└── README.md
```

## 快速开始

### 环境要求

- Go 1.21+
- Node.js 18+
- MySQL 8.0+
- Nginx

### 后端配置

```bash
cd backend

# 创建环境配置
cat > .env << EOF
DSN=root:password@tcp(localhost:3306)/smartnotes?charset=utf8mb4&parseTime=True&loc=Local
API_KEY=your-api-key-here
BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL=qwen-plus
PORT=6768
AUTH_CODE=your-auth-code-here
EOF

# 运行
go run cmd/main.go
```

### 前端配置

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

### Nginx 配置

参考 `nginx/smartnotes.conf`，根据实际情况修改后复制到 Nginx 配置目录。

## API 接口

| Method | Endpoint | 描述 |
|--------|----------|------|
| GET | /api/modules | 获取所有模块 |
| POST | /api/modules | 创建模块 |
| PUT | /api/modules/:id | 更新模块 |
| DELETE | /api/modules/:id | 删除模块 |
| GET | /api/notes | 获取笔记列表（支持分页、搜索） |
| GET | /api/notes/:id | 获取笔记详情 |
| POST | /api/notes | 创建笔记 |
| PUT | /api/notes/:id | 更新笔记 |
| DELETE | /api/notes/:id | 删除笔记 |
| POST | /api/notes/upload | 上传并 AI 整理笔记 |

## 环境变量说明

| 变量 | 说明 |
|------|------|
| DSN | MySQL 数据库连接字符串 |
| API_KEY | 阿里云百炼 API Key |
| BASE_URL | API 基础地址 |
| MODEL | 使用的 AI 模型 |
| PORT | 服务端口（默认 6768） |
| AUTH_CODE | 访问验证码 |

## 许可证

MIT License