package dto

// PaginatedResponse is a generic paginated response envelope.
type PaginatedResponse[T any] struct {
	Items   []T `json:"items"`
	Total   int `json:"total"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
}

// ListOptions contains common pagination and sorting parameters.
type ListOptions struct {
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Sort    string `json:"sort,omitempty"`
	Order   string `json:"order,omitempty"` // "asc" or "desc"
}

// DefaultListOptions returns ListOptions with sensible defaults.
func DefaultListOptions() ListOptions {
	return ListOptions{
		Page:    1,
		PerPage: 20,
		Order:   "desc",
	}
}

// Offset calculates the database offset from page and per_page.
func (o ListOptions) Offset() int {
	if o.Page < 1 {
		return 0
	}
	return (o.Page - 1) * o.Limit()
}

// Limit returns the clamped per_page value (1..100).
func (o ListOptions) Limit() int {
	if o.PerPage < 1 {
		return 20
	}
	if o.PerPage > 100 {
		return 100
	}
	return o.PerPage
}
