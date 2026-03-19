package teamtemplate

// AgentRole defines an agent within a team template.
type AgentRole struct {
	Name         string
	Role         string
	Backstory    string
	DefaultModel string
	IsLeader     bool
}

// Template defines a team composition.
type Template struct {
	Name        string
	Description string
	Agents      []AgentRole
}

// Available model keys (matching OpenClaw configuration).
const (
	ModelOpus4          = "anthropic/claude-opus-4-6"
	ModelSonnet4        = "anthropic/claude-sonnet-4-6"
	ModelMiniMaxM27     = "metaclaw/MiniMax-M2.7"
	ModelMiniMaxM25     = "minimax-portal/MiniMax-M2.5"
	ModelMiniMaxFast    = "minimax-portal/MiniMax-M2.5-Lightning"
	ModelKimiCoding     = "kimi-coding/k2p5"
	ModelGLM5           = "zai/glm-5"
)

// Registry returns all built-in team templates.
func Registry() []Template {
	return []Template{
		{
			Name:        "code-review",
			Description: "Multi-perspective code review team for thorough PR analysis",
			Agents: []AgentRole{
				{Name: "lead-reviewer", Role: "leader", DefaultModel: ModelSonnet4, IsLeader: true,
					Backstory: "You are the Lead Reviewer coordinating a multi-perspective code review. Analyze the code, assign review tasks to specialists, collect findings, and synthesize a final review with approval recommendation."},
				{Name: "security-reviewer", Role: "security-reviewer", DefaultModel: ModelSonnet4, IsLeader: false,
					Backstory: "You are a Security Reviewer. Focus on security vulnerabilities: input validation, auth flaws, injection attacks, secrets in code, unsafe deserialization, and dependency CVEs."},
				{Name: "perf-reviewer", Role: "performance-reviewer", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are a Performance Reviewer. Identify bottlenecks: algorithm complexity, N+1 queries, memory allocations in hot paths, blocking I/O, resource leaks, and concurrency issues."},
				{Name: "arch-reviewer", Role: "architecture-reviewer", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are an Architecture Reviewer. Evaluate SOLID principles, separation of concerns, API consistency, error handling patterns, test coverage, and documentation."},
			},
		},
		{
			Name:        "hedge-fund",
			Description: "AI hedge fund — multi-analyst investment research and portfolio decisions",
			Agents: []AgentRole{
				{Name: "portfolio-manager", Role: "leader", DefaultModel: ModelOpus4, IsLeader: true,
					Backstory: "You are the Portfolio Manager. Coordinate all analysts, synthesize their signals into a unified view, make final buy/hold/sell decisions, and manage portfolio risk. You receive reports from each specialist and produce an actionable investment thesis with position sizing and risk parameters."},
				{Name: "fundamentals-analyst", Role: "fundamentals-analyst", DefaultModel: ModelSonnet4, IsLeader: false,
					Backstory: "You are a Fundamentals Analyst. Analyze financial statements, revenue growth, margins, cash flow, debt levels, and valuation metrics (P/E, EV/EBITDA, DCF). Identify whether a stock is undervalued or overvalued relative to intrinsic value. Report findings to the portfolio manager."},
				{Name: "technical-analyst", Role: "technical-analyst", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are a Technical Analyst. Analyze price action, volume, moving averages, RSI, MACD, support/resistance levels, and chart patterns. Identify trend direction, momentum, and optimal entry/exit points. Report findings to the portfolio manager."},
				{Name: "sentiment-analyst", Role: "sentiment-analyst", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are a Sentiment Analyst. Monitor news, social media, insider transactions, institutional holdings, and analyst ratings. Gauge market sentiment and identify catalysts or risks not reflected in price. Report findings to the portfolio manager."},
				{Name: "risk-manager", Role: "risk-manager", DefaultModel: ModelSonnet4, IsLeader: false,
					Backstory: "You are the Risk Manager. Evaluate portfolio exposure, correlation risk, drawdown scenarios, position sizing, and stop-loss levels. Flag concentration risks and ensure the portfolio stays within defined risk parameters. Report findings to the portfolio manager."},
			},
		},
		{
			Name:        "research",
			Description: "Research team for investigation, analysis, and report writing",
			Agents: []AgentRole{
				{Name: "research-lead", Role: "leader", DefaultModel: ModelSonnet4, IsLeader: true,
					Backstory: "You are the Research Lead. Coordinate the research effort: define scope, assign investigation areas, synthesize findings into a coherent report."},
				{Name: "investigator", Role: "investigator", DefaultModel: ModelSonnet4, IsLeader: false,
					Backstory: "You are an Investigator. Deeply research assigned topics, gather evidence, identify key findings and present them clearly with sources."},
				{Name: "analyst", Role: "analyst", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are a Data Analyst. Analyze quantitative data, identify patterns and trends, create summaries and visualizations."},
				{Name: "writer", Role: "writer", DefaultModel: ModelGLM5, IsLeader: false,
					Backstory: "You are a Technical Writer. Take research findings and produce clear, well-structured documentation and reports."},
			},
		},
		{
			Name:        "development",
			Description: "Software development team with architect, developers, and QA",
			Agents: []AgentRole{
				{Name: "tech-lead", Role: "leader", DefaultModel: ModelSonnet4, IsLeader: true,
					Backstory: "You are the Tech Lead. Plan implementation, break work into tasks, assign to developers, review PRs, and ensure quality and consistency."},
				{Name: "senior-dev", Role: "senior-developer", DefaultModel: ModelKimiCoding, IsLeader: false,
					Backstory: "You are a Senior Developer. Implement complex features, write clean maintainable code, mentor other devs through code review."},
				{Name: "developer", Role: "developer", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are a Developer. Implement assigned tasks, write tests, follow coding standards, and submit work for review."},
				{Name: "qa-engineer", Role: "qa-engineer", DefaultModel: ModelMiniMaxM25, IsLeader: false,
					Backstory: "You are a QA Engineer. Write and run tests, identify edge cases, verify implementations meet requirements, and report bugs."},
			},
		},
	}
}
