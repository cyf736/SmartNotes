package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"smartnotes/internal/model"
	"smartnotes/pkg/ai"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type UploadRequest struct {
	ModuleID string `json:"module_id"`
	Title    string `json:"title"`
	Content  string `json:"content"`
}

func UploadNote(aiClient *ai.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UploadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		processedContent, err := aiClient.ProcessNote(req.Content)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process note: " + err.Error()})
			return
		}

		moduleID := uint(1)
		if req.ModuleID != "" {
			if mid, err := strconv.ParseUint(req.ModuleID, 10, 64); err == nil {
				moduleID = uint(mid)
			}
		}

		note := model.Note{
			ModuleID:        moduleID,
			Title:          req.Title,
			Content:        processedContent,
			OriginalContent: req.Content,
		}

		// Do NOT create a new note here. AI整理 (“/notes/upload”) is only meant to
		// reformat the current draft: it must not insert a note row on its own.
		// Otherwise every paste + AI整理 / save flow would spawn an unwanted duplicate
		// “new note”. Persistence is owned by the editor’s single 保存 (create/update).
		c.JSON(http.StatusOK, gin.H{"data": note})
	}
}

func UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".svg": true}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg"})
		return
	}

	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large. Max 10MB"})
		return
	}

	// Generate unique filename
	timestamp := time.Now().UnixNano()
	filename := fmt.Sprintf("%d%s", timestamp, ext)
	uploadPath := "/var/www/smartnotes/uploads"
	fullPath := filepath.Join(uploadPath, filename)

	// Ensure upload directory exists
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Save file
	if err := c.SaveUploadedFile(file, fullPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file: " + err.Error()})
		return
	}

	// Return public URL
	url := "/uploads/" + filename
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     url,
		"filename": filename,
	})
}