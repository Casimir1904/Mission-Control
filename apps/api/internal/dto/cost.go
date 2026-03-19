package dto

import (
	"time"

	"github.com/google/uuid"
)

// RecordCostInput is the payload for recording a cost event.
type RecordCostInput struct {
	Amount     float64    `json:"amount" minimum:"0" doc:"Monetary cost in USD" required:"true"`
	TokenCount int        `json:"token_count" minimum:"0" doc:"Number of tokens consumed" required:"true"`
	Model      string     `json:"model" minLength:"1" maxLength:"128" doc:"LLM model identifier" required:"true"`
	AgentID    uuid.UUID  `json:"agent_id" format:"uuid" doc:"Agent that incurred the cost" required:"true"`
	BoardID    *uuid.UUID `json:"board_id,omitempty" format:"uuid" doc:"Optional board association"`
}

// CostRecordOutput is the API response for a cost record.
type CostRecordOutput struct {
	ID         uuid.UUID  `json:"id"`
	Amount     float64    `json:"amount"`
	TokenCount int        `json:"token_count"`
	Model      string     `json:"model"`
	AgentID    uuid.UUID  `json:"agent_id"`
	BoardID    *uuid.UUID `json:"board_id,omitempty"`
	Period     time.Time  `json:"period"`
	CreatedAt  time.Time  `json:"created_at"`
}

// CostSummaryOptions defines the filters for cost aggregation queries.
type CostSummaryOptions struct {
	BoardID *uuid.UUID `json:"board_id,omitempty"`
	AgentID *uuid.UUID `json:"agent_id,omitempty"`
	Days    int        `json:"days"` // 7, 30, or 90
}

// CostSummaryOutput is the aggregated cost summary response.
type CostSummaryOutput struct {
	TotalCost   float64            `json:"total_cost"`
	TotalTokens int                `json:"total_tokens"`
	CostByAgent map[string]float64 `json:"cost_by_agent"`
	CostByModel map[string]float64 `json:"cost_by_model"`
	CostByBoard map[string]float64 `json:"cost_by_board"`
	DailyTrend  []DailyAggregate   `json:"daily_trend"`
}

// DailyAggregate represents cost data for a single day.
type DailyAggregate struct {
	Date       string  `json:"date"`
	TotalCost  float64 `json:"total_cost"`
	TokenCount int     `json:"token_count"`
}

// ListCostRecordOptions extends ListOptions with cost-specific filters.
type ListCostRecordOptions struct {
	ListOptions
	BoardID *uuid.UUID `json:"board_id,omitempty"`
	AgentID *uuid.UUID `json:"agent_id,omitempty"`
	Days    int        `json:"days,omitempty"`
}
