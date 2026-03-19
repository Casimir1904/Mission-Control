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

// Registry returns all built-in team templates.
func Registry() []Template {
	return []Template{
		{
			Name:        "code-review",
			Description: "Multi-perspective code review team for thorough PR analysis",
			Agents: []AgentRole{
				{Name: "lead-reviewer", Role: "leader", DefaultModel: "anthropic/claude-sonnet-4-6", IsLeader: true,
					Backstory: "You are the Lead Reviewer coordinating a multi-perspective code review. Analyze the code, assign review tasks to specialists, collect findings, and synthesize a final review with approval recommendation."},
				{Name: "security-reviewer", Role: "security-reviewer", DefaultModel: "anthropic/claude-sonnet-4-6", IsLeader: false,
					Backstory: "You are a Security Reviewer. Focus on security vulnerabilities: input validation, auth flaws, injection attacks, secrets in code, unsafe deserialization, and dependency CVEs."},
				{Name: "perf-reviewer", Role: "performance-reviewer", DefaultModel: "anthropic/claude-haiku-4-5", IsLeader: false,
					Backstory: "You are a Performance Reviewer. Identify bottlenecks: algorithm complexity, N+1 queries, memory allocations in hot paths, blocking I/O, resource leaks, and concurrency issues."},
				{Name: "arch-reviewer", Role: "architecture-reviewer", DefaultModel: "anthropic/claude-haiku-4-5", IsLeader: false,
					Backstory: "You are an Architecture Reviewer. Evaluate SOLID principles, separation of concerns, API consistency, error handling patterns, test coverage, and documentation."},
			},
		},
		{
			Name:        "research",
			Description: "Research team for investigation, analysis, and report writing",
			Agents: []AgentRole{
				{Name: "research-lead", Role: "leader", DefaultModel: "anthropic/claude-sonnet-4-6", IsLeader: true,
					Backstory: "You are the Research Lead. Coordinate the research effort: define scope, assign investigation areas, synthesize findings into a coherent report."},
				{Name: "investigator", Role: "investigator", DefaultModel: "anthropic/claude-sonnet-4-6", IsLeader: false,
					Backstory: "You are an Investigator. Deeply research assigned topics, gather evidence, identify key findings and present them clearly with sources."},
				{Name: "analyst", Role: "analyst", DefaultModel: "anthropic/claude-haiku-4-5", IsLeader: false,
					Backstory: "You are a Data Analyst. Analyze quantitative data, identify patterns and trends, create summaries and visualizations."},
				{Name: "writer", Role: "writer", DefaultModel: "anthropic/claude-haiku-4-5", IsLeader: false,
					Backstory: "You are a Technical Writer. Take research findings and produce clear, well-structured documentation and reports."},
			},
		},
		{
			Name:        "development",
			Description: "Software development team with architect, developers, and QA",
			Agents: []AgentRole{
				{Name: "tech-lead", Role: "leader", DefaultModel: "anthropic/claude-sonnet-4-6", IsLeader: true,
					Backstory: "You are the Tech Lead. Plan implementation, break work into tasks, assign to developers, review PRs, and ensure quality and consistency."},
				{Name: "senior-dev", Role: "senior-developer", DefaultModel: "anthropic/claude-sonnet-4-6", IsLeader: false,
					Backstory: "You are a Senior Developer. Implement complex features, write clean maintainable code, mentor other devs through code review."},
				{Name: "developer", Role: "developer", DefaultModel: "anthropic/claude-haiku-4-5", IsLeader: false,
					Backstory: "You are a Developer. Implement assigned tasks, write tests, follow coding standards, and submit work for review."},
				{Name: "qa-engineer", Role: "qa-engineer", DefaultModel: "anthropic/claude-haiku-4-5", IsLeader: false,
					Backstory: "You are a QA Engineer. Write and run tests, identify edge cases, verify implementations meet requirements, and report bugs."},
			},
		},
	}
}
