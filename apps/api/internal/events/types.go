package events

// Event type constants define the NATS subjects used for publishing and subscribing.
// All subjects follow the pattern: mc.<domain>.<action>
const (
	// Agent events.
	AgentHeartbeat    = "mc.agent.heartbeat"
	AgentStatusChange = "mc.agent.status_change"
	AgentProvisioned  = "mc.agent.provisioned"
	AgentRemoved      = "mc.agent.removed"

	// Task events.
	TaskCreated    = "mc.task.created"
	TaskUpdated    = "mc.task.updated"
	TaskDeleted    = "mc.task.deleted"
	TaskAssigned   = "mc.task.assigned"
	TaskUnassigned = "mc.task.unassigned"
	TaskMoved      = "mc.task.moved"

	// Approval events.
	ApprovalSubmitted = "mc.approval.submitted"
	ApprovalReviewed  = "mc.approval.reviewed"

	// Board events.
	BoardCreated  = "mc.board.created"
	BoardUpdated  = "mc.board.updated"
	BoardArchived = "mc.board.archived"

	// Memory events.
	MemoryCreated = "mc.memory.created"
	MemoryUpdated = "mc.memory.updated"

	// Gateway events.
	GatewayConnected    = "mc.gateway.connected"
	GatewayDisconnected = "mc.gateway.disconnected"

	// Notification events.
	NotificationCreated = "mc.notification.created"

	// Trace events.
	TraceCompleted = "mc.trace.completed"

	// Cost events.
	CostRecorded = "mc.cost.recorded"

	// Webhook events.
	WebhookTriggered = "mc.webhook.triggered"
	WebhookDelivered = "mc.webhook.delivered"
	WebhookFailed    = "mc.webhook.failed"
)
