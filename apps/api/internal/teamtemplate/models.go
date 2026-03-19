package teamtemplate

// AvailableModel describes a model that can be assigned to agents.
type AvailableModel struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Provider    string `json:"provider"`
	Tier        string `json:"tier"` // "premium", "standard", "economy"
	ContextSize int    `json:"context_size"`
}

// AvailableModels returns the known models from the OpenClaw configuration.
// In a future version this can be fetched dynamically from the gateway.
func AvailableModels() []AvailableModel {
	return []AvailableModel{
		{Key: ModelOpus4, Name: "Claude Opus 4.6", Provider: "anthropic", Tier: "premium", ContextSize: 1000000},
		{Key: ModelSonnet4, Name: "Claude Sonnet 4.6", Provider: "anthropic", Tier: "standard", ContextSize: 1000000},
		{Key: ModelKimiCoding, Name: "Kimi for Coding", Provider: "kimi-coding", Tier: "standard", ContextSize: 262144},
		{Key: ModelMiniMaxM25, Name: "MiniMax M2.5", Provider: "minimax-portal", Tier: "standard", ContextSize: 200000},
		{Key: ModelMiniMaxFast, Name: "MiniMax M2.5 Lightning", Provider: "minimax-portal", Tier: "economy", ContextSize: 200000},
		{Key: ModelGLM5, Name: "GLM-5", Provider: "zai", Tier: "economy", ContextSize: 204800},
		{Key: ModelMiniMaxM27, Name: "MiniMax-M2.7 (local)", Provider: "metaclaw", Tier: "economy", ContextSize: 32768},
	}
}
