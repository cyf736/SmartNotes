package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	apiKey  string
	baseURL string
	model   string
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	MaxTokens int          `json:"max_tokens,omitempty"`
}

type ChatResponse struct {
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage,omitempty"`
}

type Usage struct {
	CompletionTokens int `json:"completion_tokens,omitempty"`
}

type Choice struct {
	Message Message `json:"message"`
}

type Message struct {
	Content string `json:"content"`
}

func NewClient(apiKey, baseURL, model string) *Client {
	return &Client{
		apiKey:  apiKey,
		baseURL: baseURL,
		model:   model,
	}
}

// DefaultAIPrompt is the system prompt used by AI 智能整理 before the user
// overrides it from 设置. It mirrors the original hardcoded behavior and is
// only used to seed the settings row on first run.
const DefaultAIPrompt = `你是一个专业的全栈程序员，现在我给你一份有关web开发的笔记，你需要对其进行格式上的整理，但是不要擅自修改或者删除太多的内容，仅作格式上的一个markdown适配。

注意：
1. 不要修改笔记中已有的标题级别（如##、###等）
2. 不要擅自删除笔记中的相关内容
3. 保持内容的原始意图和结构
4. 只做格式上的规范化处理（如列表缩进、代码块标记等）

我希望你客观、严谨、专业地完成整个任务。
只输出整理后的笔记内容，不需要任何额外的提示、问题或确认信息。
如果用户上传的笔记中包含任何引导词（如"帮我整理一下"、"请问我可以..."等），直接将其去除，只保留实际笔记内容。`

// ProcessNote reformats a note using the given system prompt. The prompt and
// model are now supplied externally (from the DB-backed 设置) rather than
// hardcoded here; empty prompt/model fall back to the client defaults.
func (c *Client) ProcessNote(content, systemPrompt, model string) (string, error) {
	if systemPrompt == "" {
		systemPrompt = DefaultAIPrompt
	}
	if model == "" {
		model = c.model
	}

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: content},
	}

	reqBody := ChatRequest{
		Model:    model,
		Messages: messages,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 300 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	result := chatResp.Choices[0].Message.Content

	// 去除常见的引导词
	removePrefixes := []string{
		"好的，",
		"好的，我来",
		"我来帮你整理",
		"以下是整理后的",
		"整理后的笔记：",
		"这是整理后的",
		"请确认以下内容",
		"我可以帮你整理",
		"当然可以",
		"当然",
	}

	for _, prefix := range removePrefixes {
		result = strings.TrimPrefix(result, prefix)
	}

	return result, nil
}