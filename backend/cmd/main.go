package main

import (
	"log"
	"net/http"
	"smartnotes/internal/handler"
	"smartnotes/internal/model"
	"smartnotes/pkg/ai"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var authCode string

func getAuthCode() string {
	return authCode
}

func generateLoginPage() string {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartNotes - 访问验证</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
            max-width: 420px;
            width: 90%;
        }
        .logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #7C3AED, #8B5CF6);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .logo svg { width: 36px; height: 36px; color: white; }
        h1 { color: #0F172A; margin-bottom: 0.5rem; font-size: 1.75rem; }
        p { color: #64748B; margin-bottom: 1.5rem; font-size: 0.95rem; }
        input[type="password"] {
            width: 100%;
            padding: 0.875rem 1rem;
            border: 2px solid #E2E8F0;
            border-radius: 0.75rem;
            font-size: 1rem;
            margin-bottom: 1rem;
            transition: all 0.2s;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #7C3AED;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }
        button {
            width: 100%;
            padding: 0.875rem;
            background: linear-gradient(135deg, #7C3AED, #8B5CF6);
            color: white;
            border: none;
            border-radius: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4); }
        .error { color: #DC2626; font-size: 0.875rem; margin-top: 0.5rem; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        </div>
        <h1>SmartNotes</h1>
        <p>请输入访问验证码</p>
        <form id="loginForm">
            <input type="password" id="codeInput" placeholder="请输入验证码" autocomplete="off">
            <button type="submit">验证并进入</button>
            <div class="error" id="errorMsg">验证码错误，请重新输入</div>
        </form>
    </div>
    <script>
        const form = document.getElementById('loginForm');
        const input = document.getElementById('codeInput');
        const error = document.getElementById('errorMsg');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = input.value;
            try {
                const resp = await fetch('/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                if (resp.ok) {
                    window.location.href = '/';
                } else {
                    error.style.display = 'block';
                    input.value = '';
                }
            } catch (err) {
                error.style.display = 'block';
            }
        });
    </script>
</body>
</html>`
}

func main() {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()
	if err := viper.ReadInConfig(); err != nil {
		log.Fatal("Failed to read .env file:", err)
	}

	dsn := viper.GetString("DSN")
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db.AutoMigrate(&model.Module{}, &model.Note{}, &model.Tag{}, &model.Settings{})
	model.InitDB(db)

	aiClient := ai.NewClient(
		viper.GetString("API_KEY"),
		viper.GetString("BASE_URL"),
		viper.GetString("MODEL"),
	)

	// Seed the singleton AI settings row (id=1) from the current model + the
	// historical hardcoded AI-整理 prompt, if a row isn't there yet. From here
	// on the stored values (editable from 设置) are authoritative.
	model.SeedSettings(viper.GetString("MODEL"), ai.DefaultAIPrompt) 

	authCode = viper.GetString("AUTH_CODE")
	if authCode == "" {
		log.Fatal("AUTH_CODE is not set in .env file")
	}
	log.Printf("Auth code: %s", authCode)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Serve static files
	r.Static("/assets", "/var/www/smartnotes/assets")
	r.Static("/uploads", "/var/www/smartnotes/uploads")

	// Auth check middleware
	authMiddleware := func(c *gin.Context) {
		if c.Request.URL.Path == "/auth/login" || c.Request.URL.Path == "/auth/verify" {
			c.Next()
			return
		}
		cookie, err := c.Cookie("sn_auth")
		if err != nil || cookie != authCode {
			c.Redirect(http.StatusFound, "/auth/login")
			c.Abort()
			return
		}
		c.Next()
	}

	// Login page
	r.GET("/auth/login", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(generateLoginPage()))
	})

	// Verify endpoint
	r.POST("/auth/verify", func(c *gin.Context) {
		var req struct {
			Code string `json:"code"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.Code == authCode {
			c.SetCookie("sn_auth", authCode, 86400*30, "/", "", false, true)
			c.JSON(http.StatusOK, gin.H{"success": true})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid code"})
		}
	})

	// Main app - requires auth
	r.Use(authMiddleware)

	// Main index
	r.GET("/", func(c *gin.Context) {
		c.File("/var/www/smartnotes/index.html")
	})

	// All other routes - serve SPA
	r.NoRoute(func(c *gin.Context) {
		c.File("/var/www/smartnotes/index.html")
	})

	// API routes
	api := r.Group("/api")
	{
		api.GET("/modules", model.ListModules)
		api.POST("/modules", model.CreateModule)
		api.PUT("/modules/:id", model.UpdateModule)
		api.DELETE("/modules/:id", model.DeleteModule)

		api.GET("/tags", model.ListTags)
		api.POST("/tags", model.CreateTag)
		api.PUT("/tags/:id", model.UpdateTag)
		api.DELETE("/tags/:id", model.DeleteTag)

		api.GET("/notes", model.ListNotes)
		api.GET("/notes/:id", model.GetNote)
		api.POST("/notes", model.CreateNote)
		api.PUT("/notes/:id", model.UpdateNote)
		api.DELETE("/notes/:id", model.DeleteNote)
		api.POST("/notes/upload", handler.UploadNote(aiClient))
		api.POST("/notes/upload-image", handler.UploadImage)

		api.GET("/settings", model.GetSettings)
		api.PUT("/settings", model.UpdateSettings)
	}

	port := viper.GetString("PORT")
	if port == "6767" {
		port = "6768"
	}
	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}