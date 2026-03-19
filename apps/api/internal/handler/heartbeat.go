package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type RecordHeartbeatRequest struct {
	ID   uuid.UUID          `path:"id" format:"uuid" doc:"Agent ID"`
	Body dto.HeartbeatInput
}

type RecordHeartbeatResponse struct {
	Body struct {
		Status string `json:"status" doc:"Heartbeat acknowledgement"`
	}
}

// registerHeartbeatRoutes registers heartbeat endpoints on the Huma API.
func registerHeartbeatRoutes(api huma.API, heartbeatSvc service.HeartbeatService) {
	huma.Register(api, huma.Operation{
		OperationID: "record-heartbeat",
		Method:      http.MethodPost,
		Path:        "/agents/{id}/heartbeat",
		Summary:     "Record agent heartbeat",
		Description: "Records a heartbeat from an agent, updating its last seen time and setting it online if it was offline.",
		Tags:        []string{"agents", "heartbeat"},
	}, func(ctx context.Context, input *RecordHeartbeatRequest) (*RecordHeartbeatResponse, error) {
		slog.Debug("recording heartbeat", "agent_id", input.ID)
		if err := heartbeatSvc.RecordHeartbeat(ctx, input.ID, input.Body.Metrics); err != nil {
			return nil, toHumaError(err)
		}
		resp := &RecordHeartbeatResponse{}
		resp.Body.Status = "ok"
		return resp, nil
	})
}
