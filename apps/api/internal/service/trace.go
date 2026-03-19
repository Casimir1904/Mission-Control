package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/span"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/trace"
)

// TraceService defines the interface for trace and span operations.
type TraceService interface {
	IngestTrace(ctx context.Context, input dto.IngestTraceInput) (*dto.TraceOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.TraceOutput, error)
	List(ctx context.Context, opts dto.ListTraceOptions) (*dto.PaginatedResponse[dto.TraceOutput], error)
	GetSpans(ctx context.Context, traceID uuid.UUID) ([]dto.SpanOutput, error)
}

type traceService struct {
	client *generated.Client
}

// NewTraceService creates a new TraceService backed by the Ent client.
func NewTraceService(client *generated.Client) TraceService {
	return &traceService{client: client}
}

func (s *traceService) IngestTrace(ctx context.Context, input dto.IngestTraceInput) (*dto.TraceOutput, error) {
	if input.TraceID == "" {
		return nil, apperror.NewValidation("trace_id is required")
	}
	if input.Name == "" {
		return nil, apperror.NewValidation("name is required")
	}

	// Use a transaction to create the trace and all its spans atomically.
	tx, err := s.client.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TraceService.IngestTrace begin tx: %w", err)
	}

	// Build the trace.
	traceBuilder := tx.Trace.Create().
		SetTraceID(input.TraceID).
		SetName(input.Name).
		SetAgentID(input.AgentID)

	if input.Status != "" {
		traceBuilder.SetStatus(input.Status)
	}
	if input.DurationMs != nil {
		traceBuilder.SetDurationMs(*input.DurationMs)
	}
	if input.TokenCount != nil {
		traceBuilder.SetTokenCount(*input.TokenCount)
	}
	if input.Cost != nil {
		traceBuilder.SetCost(*input.Cost)
	}

	t, err := traceBuilder.Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		return nil, fmt.Errorf("service.TraceService.IngestTrace save trace: %w", err)
	}

	// Create spans within the trace.
	spanOutputs := make([]dto.SpanOutput, 0, len(input.Spans))
	for _, si := range input.Spans {
		spanBuilder := tx.Span.Create().
			SetTraceID(t.ID).
			SetSpanID(si.SpanID).
			SetName(si.Name)

		if si.ParentSpanID != "" {
			spanBuilder.SetParentSpanID(si.ParentSpanID)
		}
		if si.Status != "" {
			spanBuilder.SetStatus(si.Status)
		}
		if si.StartTime != nil {
			spanBuilder.SetStartTime(*si.StartTime)
		}
		if si.EndTime != nil {
			spanBuilder.SetEndTime(*si.EndTime)
		}
		if si.Attributes != nil {
			spanBuilder.SetAttributes(si.Attributes)
		}

		sp, err := spanBuilder.Save(ctx)
		if err != nil {
			_ = tx.Rollback()
			return nil, fmt.Errorf("service.TraceService.IngestTrace save span %s: %w", si.SpanID, err)
		}

		spanOutputs = append(spanOutputs, spanToOutput(sp))
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("service.TraceService.IngestTrace commit: %w", err)
	}

	slog.Info("trace ingested", "id", t.ID, "trace_id", input.TraceID, "spans", len(spanOutputs))

	out := traceToOutput(t)
	out.Spans = spanOutputs
	return out, nil
}

func (s *traceService) Get(ctx context.Context, id uuid.UUID) (*dto.TraceOutput, error) {
	t, err := s.client.Trace.Query().
		Where(trace.ID(id)).
		WithSpans(func(q *generated.SpanQuery) {
			q.Order(generated.Asc(span.FieldStartTime))
		}).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("trace not found")
		}
		return nil, fmt.Errorf("service.TraceService.Get: %w", err)
	}

	out := traceToOutput(t)
	if t.Edges.Spans != nil {
		out.Spans = make([]dto.SpanOutput, len(t.Edges.Spans))
		for i, sp := range t.Edges.Spans {
			out.Spans[i] = spanToOutput(sp)
		}
	}

	return out, nil
}

func (s *traceService) List(ctx context.Context, opts dto.ListTraceOptions) (*dto.PaginatedResponse[dto.TraceOutput], error) {
	query := s.client.Trace.Query().
		Order(generated.Desc(trace.FieldCreatedAt))

	if opts.AgentID != nil {
		query = query.Where(trace.AgentID(*opts.AgentID))
	}
	if opts.Days > 0 {
		cutoff := time.Now().AddDate(0, 0, -opts.Days)
		query = query.Where(trace.CreatedAtGTE(cutoff))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TraceService.List count: %w", err)
	}

	traces, err := query.
		Offset(opts.Offset()).
		Limit(opts.Limit()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TraceService.List: %w", err)
	}

	items := make([]dto.TraceOutput, len(traces))
	for i, t := range traces {
		items[i] = *traceToOutput(t)
	}

	return &dto.PaginatedResponse[dto.TraceOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *traceService) GetSpans(ctx context.Context, traceID uuid.UUID) ([]dto.SpanOutput, error) {
	spans, err := s.client.Span.Query().
		Where(span.TraceID(traceID)).
		Order(generated.Asc(span.FieldStartTime)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TraceService.GetSpans: %w", err)
	}

	items := make([]dto.SpanOutput, len(spans))
	for i, sp := range spans {
		items[i] = spanToOutput(sp)
	}
	return items, nil
}

func traceToOutput(t *generated.Trace) *dto.TraceOutput {
	out := &dto.TraceOutput{
		ID:        t.ID,
		TraceID:   t.TraceID,
		Name:      t.Name,
		Status:    t.Status,
		AgentID:   t.AgentID,
		CreatedAt: t.CreatedAt,
	}

	if t.DurationMs != 0 {
		d := t.DurationMs
		out.DurationMs = &d
	}
	if t.TokenCount != 0 {
		tc := t.TokenCount
		out.TokenCount = &tc
	}
	if t.Cost != 0 {
		c := t.Cost
		out.Cost = &c
	}

	return out
}

func spanToOutput(sp *generated.Span) dto.SpanOutput {
	return dto.SpanOutput{
		ID:           sp.ID,
		SpanID:       sp.SpanID,
		ParentSpanID: sp.ParentSpanID,
		Name:         sp.Name,
		Status:       sp.Status,
		StartTime:    sp.StartTime,
		EndTime:      sp.EndTime,
		Attributes:   sp.Attributes,
	}
}
