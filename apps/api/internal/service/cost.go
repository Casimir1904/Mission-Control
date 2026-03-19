package service

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"time"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/costrecord"
)

// CostService defines the interface for cost tracking operations.
type CostService interface {
	Record(ctx context.Context, input dto.RecordCostInput) (*dto.CostRecordOutput, error)
	GetSummary(ctx context.Context, opts dto.CostSummaryOptions) (*dto.CostSummaryOutput, error)
	ListRecords(ctx context.Context, opts dto.ListCostRecordOptions) (*dto.PaginatedResponse[dto.CostRecordOutput], error)
}

type costService struct {
	client *generated.Client
}

// NewCostService creates a new CostService backed by the Ent client.
func NewCostService(client *generated.Client) CostService {
	return &costService{client: client}
}

func (s *costService) Record(ctx context.Context, input dto.RecordCostInput) (*dto.CostRecordOutput, error) {
	if input.Model == "" {
		return nil, apperror.NewValidation("model is required")
	}

	builder := s.client.CostRecord.Create().
		SetAmount(input.Amount).
		SetTokenCount(input.TokenCount).
		SetModel(input.Model).
		SetAgentID(input.AgentID).
		SetPeriod(time.Now())

	if input.BoardID != nil {
		builder.SetBoardID(*input.BoardID)
	}

	cr, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.CostService.Record: %w", err)
	}

	slog.Info("cost record created", "id", cr.ID, "agent_id", input.AgentID, "amount", input.Amount)
	return costRecordToOutput(cr), nil
}

func (s *costService) GetSummary(ctx context.Context, opts dto.CostSummaryOptions) (*dto.CostSummaryOutput, error) {
	days := opts.Days
	if days <= 0 {
		days = 7
	}
	cutoff := time.Now().AddDate(0, 0, -days)

	// Build base query with filters.
	query := s.client.CostRecord.Query().
		Where(costrecord.CreatedAtGTE(cutoff))

	if opts.BoardID != nil {
		query = query.Where(costrecord.BoardID(*opts.BoardID))
	}
	if opts.AgentID != nil {
		query = query.Where(costrecord.AgentID(*opts.AgentID))
	}

	// Fetch all matching records for aggregation.
	records, err := query.
		WithAgent().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.CostService.GetSummary: %w", err)
	}

	summary := &dto.CostSummaryOutput{
		CostByAgent: make(map[string]float64),
		CostByModel: make(map[string]float64),
		CostByBoard: make(map[string]float64),
	}

	// Aggregate daily data by date string.
	dailyMap := make(map[string]*dto.DailyAggregate)

	for _, r := range records {
		summary.TotalCost += r.Amount
		summary.TotalTokens += r.TokenCount

		// Cost by model.
		summary.CostByModel[r.Model] += r.Amount

		// Cost by agent (use agent name if edge loaded, otherwise ID).
		agentKey := r.AgentID.String()
		if r.Edges.Agent != nil {
			agentKey = r.Edges.Agent.Name
		}
		summary.CostByAgent[agentKey] += r.Amount

		// Cost by board.
		if r.BoardID != nil {
			summary.CostByBoard[r.BoardID.String()] += r.Amount
		}

		// Daily trend aggregation.
		dateStr := r.CreatedAt.Format("2006-01-02")
		if d, ok := dailyMap[dateStr]; ok {
			d.TotalCost += r.Amount
			d.TokenCount += r.TokenCount
		} else {
			dailyMap[dateStr] = &dto.DailyAggregate{
				Date:       dateStr,
				TotalCost:  r.Amount,
				TokenCount: r.TokenCount,
			}
		}
	}

	// Convert daily map to sorted slice.
	summary.DailyTrend = make([]dto.DailyAggregate, 0, len(dailyMap))
	for _, d := range dailyMap {
		summary.DailyTrend = append(summary.DailyTrend, *d)
	}
	// Sort by date ascending.
	sortDailyTrend(summary.DailyTrend)

	return summary, nil
}

func (s *costService) ListRecords(ctx context.Context, opts dto.ListCostRecordOptions) (*dto.PaginatedResponse[dto.CostRecordOutput], error) {
	query := s.client.CostRecord.Query().
		Order(generated.Desc(costrecord.FieldCreatedAt))

	if opts.BoardID != nil {
		query = query.Where(costrecord.BoardID(*opts.BoardID))
	}
	if opts.AgentID != nil {
		query = query.Where(costrecord.AgentID(*opts.AgentID))
	}
	if opts.Days > 0 {
		cutoff := time.Now().AddDate(0, 0, -opts.Days)
		query = query.Where(costrecord.CreatedAtGTE(cutoff))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.CostService.ListRecords count: %w", err)
	}

	records, err := query.
		Offset(opts.Offset()).
		Limit(opts.Limit()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.CostService.ListRecords: %w", err)
	}

	items := make([]dto.CostRecordOutput, len(records))
	for i, r := range records {
		items[i] = *costRecordToOutput(r)
	}

	return &dto.PaginatedResponse[dto.CostRecordOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

// GetSummaryRaw uses a raw SQL aggregate query for production-quality performance.
// This is an alternative to the in-memory aggregation above; use when datasets are large.
func (s *costService) getSummaryRaw(ctx context.Context, opts dto.CostSummaryOptions) (*dto.CostSummaryOutput, error) {
	days := opts.Days
	if days <= 0 {
		days = 7
	}
	cutoff := time.Now().AddDate(0, 0, -days)

	var results []struct {
		TotalCost   float64 `json:"total_cost"`
		TotalTokens int     `json:"total_tokens"`
	}

	query := s.client.CostRecord.Query().
		Where(costrecord.CreatedAtGTE(cutoff))

	if opts.BoardID != nil {
		query = query.Where(costrecord.BoardID(*opts.BoardID))
	}
	if opts.AgentID != nil {
		query = query.Where(costrecord.AgentID(*opts.AgentID))
	}

	err := query.Aggregate(
		generated.Sum(costrecord.FieldAmount),
		generated.Sum(costrecord.FieldTokenCount),
	).Scan(ctx, &results)
	if err != nil {
		return nil, fmt.Errorf("service.CostService.getSummaryRaw: %w", err)
	}

	summary := &dto.CostSummaryOutput{
		CostByAgent: make(map[string]float64),
		CostByModel: make(map[string]float64),
		CostByBoard: make(map[string]float64),
	}
	if len(results) > 0 {
		summary.TotalCost = results[0].TotalCost
		summary.TotalTokens = results[0].TotalTokens
	}

	// Daily trend via raw SQL for efficiency.
	type dailyAgg struct {
		Date       string  `json:"date"`
		TotalCost  float64 `json:"total_cost"`
		TokenCount int     `json:"token_count"`
	}
	var dailyResults []dailyAgg

	// For daily trend, query all records and aggregate in Go.
	// This is simpler than Ent's Modify and works with all Ent versions.
	dailyQuery := s.client.CostRecord.Query().
		Where(costrecord.CreatedAtGTE(cutoff)).
		Order(generated.Asc(costrecord.FieldCreatedAt))

	if opts.BoardID != nil {
		dailyQuery = dailyQuery.Where(costrecord.BoardID(*opts.BoardID))
	}
	if opts.AgentID != nil {
		dailyQuery = dailyQuery.Where(costrecord.AgentID(*opts.AgentID))
	}

	allRecords, err := dailyQuery.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.CostService.getSummaryRaw daily query: %w", err)
	}

	// Aggregate by day in Go.
	dailyMap := make(map[string]*dailyAgg)
	for _, r := range allRecords {
		day := r.CreatedAt.Format("2006-01-02")
		agg, ok := dailyMap[day]
		if !ok {
			agg = &dailyAgg{Date: day}
			dailyMap[day] = agg
		}
		agg.TotalCost += r.Amount
		agg.TokenCount += r.TokenCount
	}

	// Sort day keys.
	dayKeys := make([]string, 0, len(dailyMap))
	for d := range dailyMap {
		dayKeys = append(dayKeys, d)
	}
	sort.Strings(dayKeys)

	for _, d := range dayKeys {
		agg := dailyMap[d]
		dailyResults = append(dailyResults, *agg)
	}
	err = nil // reset for consistency
	if err != nil {
		return nil, fmt.Errorf("service.CostService.getSummaryRaw daily: %w", err)
	}

	for _, d := range dailyResults {
		summary.DailyTrend = append(summary.DailyTrend, dto.DailyAggregate{
			Date:       d.Date,
			TotalCost:  d.TotalCost,
			TokenCount: d.TokenCount,
		})
	}

	return summary, nil
}

func costRecordToOutput(r *generated.CostRecord) *dto.CostRecordOutput {
	return &dto.CostRecordOutput{
		ID:         r.ID,
		Amount:     r.Amount,
		TokenCount: r.TokenCount,
		Model:      r.Model,
		AgentID:    r.AgentID,
		BoardID:    r.BoardID,
		Period:     r.Period,
		CreatedAt:  r.CreatedAt,
	}
}

// sortDailyTrend sorts a slice of DailyAggregate by date ascending.
func sortDailyTrend(trend []dto.DailyAggregate) {
	for i := 1; i < len(trend); i++ {
		for j := i; j > 0 && trend[j].Date < trend[j-1].Date; j-- {
			trend[j], trend[j-1] = trend[j-1], trend[j]
		}
	}
}
