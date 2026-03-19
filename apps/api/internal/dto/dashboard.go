package dto

// DashboardOverview holds aggregated stats for the dashboard view.
type DashboardOverview struct {
	AgentsByStatus      map[string]int        `json:"agents_by_status"`
	TasksByStatus       map[string]int        `json:"tasks_by_status"`
	PendingApprovals    int                   `json:"pending_approvals"`
	TasksCompletedToday int                   `json:"tasks_completed_today"`
	RecentActivity      []ActivityEventOutput `json:"recent_activity"`
}
