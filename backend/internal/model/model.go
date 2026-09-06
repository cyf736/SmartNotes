package model

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
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
	Tags            []Tag          `gorm:"many2many:note_tags;" json:"tags,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Settings holds single-row, global configuration for the app.
// id is always 1 (singleton); these values are read at request time and
// apply immediately (no server restart needed).
type Settings struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	AIPrompt string `gorm:"column:ai_prompt;type:longtext" json:"ai_prompt"` // system prompt used by AI 智能整理
	AIModel  string `gorm:"column:ai_model;size:100" json:"ai_model"`        // model id used by AI 智能整理
	// AIModelsRaw stores the user-editable AI model candidate list as a JSON
	// string array (e.g. `["deepseek-chat","deepseek-v3"]`). It is hidden from
	// the JSON API; handlers expose it as AIModels ([]string) instead.
	AIModelsRaw string `gorm:"column:ai_models;type:longtext" json:"-"`
}

// DefaultAIModels is the initial model candidate list seeded on first run.
var DefaultAIModels = []string{"deepseek-v4-flash-vision-exp", "deepseek-chat", "deepseek-reasoner", "deepseek-v3"}

// SeedSettings inserts the singleton row (id=1) with defaults if missing.
// Fallback prompt matches historical behavior; fallback model comes from .env.
func SeedSettings(aiModel string, aiPrompt string) error {
	row := Settings{ID: 1, AIModel: aiModel, AIPrompt: aiPrompt}
	if raw, err := json.Marshal(DefaultAIModels); err == nil {
		row.AIModelsRaw = string(raw)
	} else {
		row.AIModelsRaw = `["deepseek-chat"]`
	}
	var existing Settings
	if err := db.First(&existing, row).Error; err == nil {
		// Already seeded; ensure optional fields are populated for very old rows.
		updated := false
		if existing.AIModel == "" && aiModel != "" {
			existing.AIModel = aiModel
			updated = true
		}
		if existing.AIPrompt == "" && aiPrompt != "" {
			existing.AIPrompt = aiPrompt
			updated = true
		}
		if existing.AIModelsRaw == "" {
			existing.AIModelsRaw = row.AIModelsRaw
			updated = true
		}
		if updated {
			db.Save(&existing)
		}
		return nil
	}
	return db.Create(&row).Error
}

// Tag is a free-form label that can be attached to many notes.
type Tag struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:50;uniqueIndex;not null" json:"name"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
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
	query := db.Preload("Module").Preload("Tags")

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

	// Optional tag filter: ?tag_id=1  (single)  or  ?tag_ids=1,2,3 (any-of)
	tagFilter := c.Query("tag_id")
	if ids := c.Query("tag_ids"); ids != "" {
		tagFilter = ids
	}
	if tagFilter != "" {
		var tagIDs []uint
		for _, s := range strings.Split(tagFilter, ",") {
			trimmed := strings.TrimSpace(s)
			if trimmed == "" {
				continue
			}
			if v, err := strconv.ParseUint(trimmed, 10, 64); err == nil {
				tagIDs = append(tagIDs, uint(v))
			}
		}
		if len(tagIDs) > 0 {
			query = query.Where("id IN (SELECT note_id FROM note_tags WHERE tag_id IN ?)", tagIDs)
		}
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
	if err := db.Preload("Module").Preload("Tags").First(&note, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// resolveTagsByName ensures each given tag name exists (creating when missing)
// and returns the Tag rows in original order.
func resolveTagsByName(names []string) []Tag {
	tags := make([]Tag, 0, len(names))
	seen := map[string]bool{}
	for _, raw := range names {
		name := strings.TrimSpace(raw)
		if name == "" || seen[name] {
			continue
		}
		var t Tag
		if err := db.Where("name = ?", name).First(&t).Error; err != nil {
			t = Tag{Name: name}
			if db.Where("name = ?", name).First(&t).Error == nil {
				// created in another request meanwhile
			} else {
				db.Create(&t)
			}
		}
		seen[name] = true
		tags = append(tags, t)
	}
	return tags
}

func replaceNoteTags(noteID uint, tags []Tag) {
	note := Note{ID: noteID}
	_ = db.Model(&note).Association("Tags").Replace(tags)
}

func CreateNote(c *gin.Context) {
	var req struct {
		ModuleID        uint     `json:"module_id"`
		Title           string   `json:"title"`
		Content         string   `json:"content"`
		OriginalContent string   `json:"original_content"`
		Tags            []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.ModuleID == 0 {
		req.ModuleID = 1
	}
	note := Note{
		ModuleID:        req.ModuleID,
		Title:           strings.TrimSpace(req.Title),
		Content:         req.Content,
		OriginalContent: req.OriginalContent,
	}
	db.Create(&note)
	tags := resolveTagsByName(req.Tags)
	if len(tags) > 0 {
		replaceNoteTags(note.ID, tags)
	}
	db.Preload("Module").Preload("Tags").First(&note, note.ID)
	c.JSON(http.StatusCreated, gin.H{"data": note})
}

func UpdateNote(c *gin.Context) {
	id := c.Param("id")
	var note Note
	if err := db.First(&note, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}
	var req struct {
		ModuleID        uint     `json:"module_id"`
		Title           string   `json:"title"`
		Content         string   `json:"content"`
		OriginalContent string   `json:"original_content"`
		Tags            []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Editor always sends complete fields; keep prior values when a field is absent
	// (empty string) to avoid accidentally clearing content on partial updates.
	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = strings.TrimSpace(req.Title)
	}
	if req.Content != "" {
		updates["content"] = req.Content
	}
	if req.OriginalContent != "" {
		updates["original_content"] = req.OriginalContent
	}
	if req.ModuleID != 0 {
		updates["module_id"] = req.ModuleID
	}
	if len(updates) > 0 {
		db.Model(&note).Updates(updates)
	}

	// Replace tags with the provided set (empty list = clear all tags)
	tags := resolveTagsByName(req.Tags)
	replaceNoteTags(note.ID, tags)

	db.Preload("Module").Preload("Tags").First(&note, id)
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

// Tag Handlers

func ListTags(c *gin.Context) {
	var tags []Tag
	db.Order("name ASC").Find(&tags)
	c.JSON(http.StatusOK, gin.H{"data": tags})
}

func CreateTag(c *gin.Context) {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag name is required"})
		return
	}
	var existing Tag
	if err := db.Where("name = ?", name).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"data": existing, "created": false})
		return
	}
	tag := Tag{Name: name}
	db.Create(&tag)
	c.JSON(http.StatusCreated, gin.H{"data": tag, "created": true})
}

func DeleteTag(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Tag{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Remove dangling join rows so notes no longer reference a deleted tag
	// (soft-delete above does NOT touch the many2many table automatically).
	db.Exec("DELETE FROM note_tags WHERE tag_id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
}

// UpdateTag renames a tag in place (preserving every note association) or,
// when the new name already equals an existing tag (MySQL compares case-
// insensitively here), merges it: all notes switch to the surviving tag and the
// edited tag is removed.
func UpdateTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tag id"})
		return
	}
	var tag Tag
	if err := db.First(&tag, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newName := strings.TrimSpace(input.Name)
	if newName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag name is required"})
		return
	}

	// Target name unchanged -> nothing to do.
	if strings.EqualFold(newName, tag.Name) && newName == tag.Name {
		c.JSON(http.StatusOK, gin.H{"data": tag, "merged": false})
		return
	}

	// Does another (case-insensitively) equal tag already exist?
	var clash Tag
	if err := db.Where("name = ? AND id <> ?", newName, tag.ID).First(&clash).Error; err == nil {
		// Merge: repoint this tag's notes to the surviving tag, then remove it.
		db.Exec("UPDATE IGNORE note_tags SET tag_id = ? WHERE tag_id = ?", clash.ID, tag.ID)
		db.Exec("DELETE FROM note_tags WHERE tag_id = ?", tag.ID)
		db.Delete(&Tag{}, tag.ID)
		c.JSON(http.StatusOK, gin.H{"data": clash, "merged": true})
		return
	}

	// Plain rename in place (keeps all note_tags rows).
	if err := db.Model(&tag).Update("name", newName).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	db.First(&tag, id)
	c.JSON(http.StatusOK, gin.H{"data": tag, "merged": false})
}

// Settings Handlers

// GetSettingsRow returns the singleton settings row, creating it with defaults
// if it somehow does not exist yet.
func GetSettingsRow() Settings {
	var s Settings
	if err := db.First(&s, Settings{ID: 1}).Error; err != nil {
		s = Settings{ID: 1}
		db.Create(&s)
	}
	return s
}

// settingsModelsJSON parses the raw JSON array stored in AIModelsRaw. On any
// error an empty list is returned so the API is always a valid []string.
func settingsModelsJSON(raw string) []string {
	if raw == "" {
		// If nothing stored yet, fall back to the defaults.
		out := make([]string, len(DefaultAIModels))
		copy(out, DefaultAIModels)
		return out
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []string{}
	}
	return out
}

func settingsResponse(s Settings) gin.H {
	return gin.H{
		"id":        s.ID,
		"ai_prompt": s.AIPrompt,
		"ai_model":  s.AIModel,
		"ai_models": settingsModelsJSON(s.AIModelsRaw),
	}
}

func GetSettings(c *gin.Context) {
	s := GetSettingsRow()
	c.JSON(http.StatusOK, gin.H{"data": settingsResponse(s)})
}

func UpdateSettings(c *gin.Context) {
	var input struct {
		AIPrompt string    `json:"ai_prompt"`
		AIModel  string    `json:"ai_model"`
		AIModels *[]string `json:"ai_models"` // pointer: distinguishes "not sent" from "empty list"
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Keep the existing value when a field is omitted, so the editor can send a
	// partial object without accidentally clearing the prompt/model. An explicitly
	// empty list (or pointer) still clears the field as intended.
	s := GetSettingsRow()
	updates := map[string]interface{}{}
	whenChanged := func(cur string, next string, col string) {
		if next != "" && next != cur {
			updates[col] = next
		}
	}
	whenChanged(s.AIPrompt, input.AIPrompt, "ai_prompt")
	whenChanged(s.AIModel, input.AIModel, "ai_model")
	if input.AIModels != nil {
		// Keep only non-empty, trimmed, de-duplicated entries.
		seen := map[string]bool{}
		list := make([]string, 0, len(*input.AIModels))
		for _, m := range *input.AIModels {
			m = strings.TrimSpace(m)
			if m == "" || seen[m] {
				continue
			}
			seen[m] = true
			list = append(list, m)
		}
		if raw, err := json.Marshal(list); err == nil {
			rawStr := string(raw)
			if rawStr != s.AIModelsRaw {
				updates["ai_models"] = rawStr
			}
		}
	}
	if len(updates) > 0 {
		db.Model(&s).Updates(updates)
	}
	s = GetSettingsRow()
	c.JSON(http.StatusOK, gin.H{"data": settingsResponse(s)})
}
