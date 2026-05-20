package model

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var db *gorm.DB

func InitDB(d *gorm.DB) {
	db = d
}

func GetDB() *gorm.DB {
	return db
}

type Module struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Color       string         `gorm:"size:20" json:"color"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Note struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	ModuleID        uint           `gorm:"index" json:"module_id"`
	Title           string         `gorm:"size:255;not null" json:"title"`
	Content         string         `gorm:"type:longtext" json:"content"`
	OriginalContent string         `gorm:"type:longtext" json:"original_content,omitempty"`
	Module          Module         `gorm:"foreignKey:ModuleID" json:"module,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Module Handlers

func ListModules(c *gin.Context) {
	var modules []Module
	db.Find(&modules)
	c.JSON(http.StatusOK, gin.H{"data": modules})
}

func CreateModule(c *gin.Context) {
	var module Module
	if err := c.ShouldBindJSON(&module); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&module)
	c.JSON(http.StatusCreated, gin.H{"data": module})
}

func UpdateModule(c *gin.Context) {
	id := c.Param("id")
	var module Module
	if err := db.First(&module, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Module not found"})
		return
	}
	var input Module
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Model(&module).Updates(input)
	c.JSON(http.StatusOK, gin.H{"data": module})
}

func DeleteModule(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Module{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Module deleted"})
}

// Note Handlers

func ListNotes(c *gin.Context) {
	var notes []Note
	query := db.Preload("Module")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if pageSize > 50 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	search := c.Query("search")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title LIKE ? OR content LIKE ?", searchPattern, searchPattern)
	}

	moduleID := c.Query("module_id")
	if moduleID != "" {
		query = query.Where("module_id = ?", moduleID)
	}

	var total int64
	query.Model(&Note{}).Count(&total)

	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&notes)

	c.JSON(http.StatusOK, gin.H{
		"data":       notes,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": int(math.Ceil(float64(total) / float64(pageSize))),
	})
}

func GetNote(c *gin.Context) {
	id := c.Param("id")
	var note Note
	if err := db.Preload("Module").First(&note, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

func CreateNote(c *gin.Context) {
	var note Note
	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&note)
	c.JSON(http.StatusCreated, gin.H{"data": note})
}

func UpdateNote(c *gin.Context) {
	id := c.Param("id")
	var note Note
	if err := db.First(&note, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}
	var input Note
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Model(&note).Updates(input)
	c.JSON(http.StatusOK, gin.H{"data": note})
}

func DeleteNote(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Note{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Note deleted"})
}