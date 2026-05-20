package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	AuthCookieName  = "sn_auth"
	AuthCookieMaxAge = 86400 * 30 // 30 days
)

var globalAuthCode = ""

func InitAuthCode(code string) {
	if code == "" {
		b := make([]byte, 16)
		rand.Read(b)
		globalAuthCode = hex.EncodeToString(b)
	} else {
		globalAuthCode = code
	}
}

func GetAuthCode() string {
	if globalAuthCode == "" {
		b := make([]byte, 16)
		rand.Read(b)
		globalAuthCode = hex.EncodeToString(b)
	}
	return globalAuthCode
}

func GenerateAuthCode() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func SetAuthCookie(c *gin.Context, code string) {
	c.SetCookie(
		AuthCookieName,
		code,
		AuthCookieMaxAge,
		"/",
		"",
		false,
		true,
	)
}

func CheckAuthCookie(c *gin.Context) bool {
	cookie, err := c.Cookie(AuthCookieName)
	return err == nil && cookie == GetAuthCode()
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !CheckAuthCookie(c) {
			if c.Request.URL.Path[:4] == "/api" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
				c.Abort()
				return
			}
			c.HTML(http.StatusUnauthorized, "login.html", gin.H{
				"AuthCode": GetAuthCode(),
			})
			c.Abort()
		} else {
			c.Next()
		}
	}
}

func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		if CheckAuthCookie(c) {
			c.Set("authenticated", true)
		}
		c.Next()
	}
}