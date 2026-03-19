package handler

import "github.com/Casimir1904/Mission-Control/apps/api/internal/dto"

// PaginationParams are the common query parameters for paginated list endpoints.
type PaginationParams struct {
	Page    int `query:"page" minimum:"1" default:"1" doc:"Page number (1-based)"`
	PerPage int `query:"per_page" minimum:"1" maximum:"100" default:"20" doc:"Items per page"`
}

// ToListOptions converts PaginationParams into a dto.ListOptions.
func (p PaginationParams) ToListOptions() dto.ListOptions {
	opts := dto.DefaultListOptions()
	if p.Page > 0 {
		opts.Page = p.Page
	}
	if p.PerPage > 0 {
		opts.PerPage = p.PerPage
	}
	return opts
}
