/// <reference types="cypress" />

/**
 * TaskBoard Accessibility Audit
 *
 * This test runs axe-core accessibility checks on the TaskBoard component
 * to verify it meets WCAG 2.1 AA standards.
 */
describe("TaskBoard Accessibility Audit", () => {
  const apiBase = "**/api/v1";
  const email = "local-auth-user@example.com";

  const originalDefaultCommandTimeout = Cypress.config("defaultCommandTimeout");

  beforeEach(() => {
    Cypress.config("defaultCommandTimeout", 20_000);
  });

  afterEach(() => {
    Cypress.config("defaultCommandTimeout", originalDefaultCommandTimeout);
  });

  function stubEmptySse() {
    // Keep known board-related SSE endpoints quiet in tests.
    const emptySse = {
      statusCode: 200,
      headers: { "content-type": "text/event-stream" },
      body: "",
    };

    cy.intercept("GET", `${apiBase}/boards/*/tasks/stream*`, emptySse).as(
      "tasksStream",
    );
    cy.intercept("GET", `${apiBase}/boards/*/approvals/stream*`, emptySse).as(
      "approvalsStream",
    );
    cy.intercept("GET", `${apiBase}/boards/*/memory/stream*`, emptySse).as(
      "memoryStream",
    );
    cy.intercept("GET", `${apiBase}/agents/stream*`, emptySse).as("agentsStream");
  }

  it("has no critical accessibility violations on initial load", () => {
    stubEmptySse();

    // Setup API stubs
    cy.intercept("GET", `${apiBase}/organizations/me/member*`, {
      statusCode: 200,
      body: {
        id: "m1",
        organization_id: "o1",
        user_id: "u1",
        role: "owner",
        all_boards_read: true,
        all_boards_write: true,
        created_at: "2026-02-11T00:00:00Z",
        updated_at: "2026-02-11T00:00:00Z",
        board_access: [{ board_id: "b1", can_read: true, can_write: true }],
      },
    }).as("membership");

    cy.intercept("GET", `${apiBase}/users/me*`, {
      statusCode: 200,
      body: {
        id: "u1",
        clerk_user_id: "clerk_u1",
        email,
        name: "Jane Test",
        preferred_name: "Jane",
        timezone: "America/New_York",
        is_super_admin: false,
      },
    }).as("me");

    cy.intercept("GET", `${apiBase}/organizations/me/list*`, {
      statusCode: 200,
      body: [{ id: "o1", name: "Personal", role: "owner", is_active: true }],
    }).as("organizations");

    cy.intercept("GET", `${apiBase}/tags*`, {
      statusCode: 200,
      body: { items: [], total: 0, limit: 200, offset: 0 },
    }).as("tags");

    cy.intercept("GET", `${apiBase}/organizations/me/custom-fields*`, {
      statusCode: 200,
      body: [],
    }).as("customFields");

    // Setup board snapshot with tasks in multiple columns
    cy.intercept("GET", `${apiBase}/boards/b1/snapshot*`, {
      statusCode: 200,
      body: {
        board: {
          id: "b1",
          name: "Accessibility Test Board",
          slug: "accessibility-test-board",
          description: "Board for testing accessibility",
          gateway_id: "g1",
          board_group_id: null,
          board_type: "general",
          objective: null,
          success_metrics: null,
          target_date: null,
          goal_confirmed: true,
          goal_source: "test",
          organization_id: "o1",
          created_at: "2026-02-11T00:00:00Z",
          updated_at: "2026-02-11T00:00:00Z",
        },
        tasks: [
          {
            id: "t1",
            board_id: "b1",
            title: "Inbox Task",
            description: "A task in the inbox column",
            status: "inbox",
            priority: "high",
            due_at: null,
            assigned_agent_id: null,
            depends_on_task_ids: [],
            created_by_user_id: null,
            in_progress_at: null,
            created_at: "2026-02-11T00:00:00Z",
            updated_at: "2026-02-11T00:00:00Z",
            blocked_by_task_ids: [],
            is_blocked: false,
            assignee: null,
            approvals_count: 0,
            approvals_pending_count: 0,
          },
          {
            id: "t2",
            board_id: "b1",
            title: "In Progress Task",
            description: "A task currently in progress",
            status: "in_progress",
            priority: "medium",
            due_at: null,
            assigned_agent_id: null,
            depends_on_task_ids: [],
            created_by_user_id: null,
            in_progress_at: "2026-02-11T00:00:00Z",
            created_at: "2026-02-11T00:00:00Z",
            updated_at: "2026-02-11T00:00:00Z",
            blocked_by_task_ids: [],
            is_blocked: false,
            assignee: null,
            approvals_count: 0,
            approvals_pending_count: 0,
          },
          {
            id: "t3",
            board_id: "b1",
            title: "Review Task",
            description: "A task awaiting review",
            status: "review",
            priority: "low",
            due_at: null,
            assigned_agent_id: null,
            depends_on_task_ids: [],
            created_by_user_id: null,
            in_progress_at: null,
            created_at: "2026-02-11T00:00:00Z",
            updated_at: "2026-02-11T00:00:00Z",
            blocked_by_task_ids: [],
            is_blocked: false,
            assignee: null,
            approvals_count: 0,
            approvals_pending_count: 0,
          },
          {
            id: "t4",
            board_id: "b1",
            title: "Done Task",
            description: "A completed task",
            status: "done",
            priority: "low",
            due_at: null,
            assigned_agent_id: null,
            depends_on_task_ids: [],
            created_by_user_id: null,
            in_progress_at: "2026-02-11T00:00:00Z",
            created_at: "2026-02-11T00:00:00Z",
            updated_at: "2026-02-11T00:00:00Z",
            blocked_by_task_ids: [],
            is_blocked: false,
            assignee: null,
            approvals_count: 0,
            approvals_pending_count: 0,
          },
        ],
        agents: [],
        approvals: [],
        chat_messages: [],
        pending_approvals_count: 0,
      },
    }).as("snapshot");

    cy.intercept("GET", `${apiBase}/boards/b1/group-snapshot*`, {
      statusCode: 200,
      body: { group: null, boards: [] },
    }).as("groupSnapshot");

    // Login and visit board
    cy.loginWithLocalAuth();
    cy.visit("/boards/b1");
    cy.waitForAppLoaded();

    cy.wait([
      "@snapshot",
      "@groupSnapshot",
      "@membership",
      "@me",
      "@organizations",
      "@tags",
      "@customFields",
    ]);

    // Verify TaskBoard is loaded
    cy.get('[data-testid="task-board"]').should("be.visible");

    // Inject axe-core and run accessibility check
    cy.injectAxe();

    // Run accessibility check on the entire page
    // This will fail if there are any critical or serious violations
    cy.checkA11y("[data-testid='task-board']", {
      rules: {
        // Best practice rules that may need manual review
        "color-contrast": { enabled: true },
        // Exclude experimental rules
        "css-orientation-lock": { enabled: false },
        "identical-links-same-purpose": { enabled: false },
      },
    });
  });

  it("has no accessibility violations with keyboard focus", () => {
    stubEmptySse();

    // Setup API stubs (same as above)
    cy.intercept("GET", `${apiBase}/organizations/me/member*`, {
      statusCode: 200,
      body: {
        id: "m1",
        organization_id: "o1",
        user_id: "u1",
        role: "owner",
        all_boards_read: true,
        all_boards_write: true,
        created_at: "2026-02-11T00:00:00Z",
        updated_at: "2026-02-11T00:00:00Z",
        board_access: [{ board_id: "b1", can_read: true, can_write: true }],
      },
    }).as("membership");

    cy.intercept("GET", `${apiBase}/users/me*`, {
      statusCode: 200,
      body: {
        id: "u1",
        clerk_user_id: "clerk_u1",
        email,
        name: "Jane Test",
        preferred_name: "Jane",
        timezone: "America/New_York",
        is_super_admin: false,
      },
    }).as("me");

    cy.intercept("GET", `${apiBase}/organizations/me/list*`, {
      statusCode: 200,
      body: [{ id: "o1", name: "Personal", role: "owner", is_active: true }],
    }).as("organizations");

    cy.intercept("GET", `${apiBase}/tags*`, {
      statusCode: 200,
      body: { items: [], total: 0, limit: 200, offset: 0 },
    }).as("tags");

    cy.intercept("GET", `${apiBase}/organizations/me/custom-fields*`, {
      statusCode: 200,
      body: [],
    }).as("customFields");

    cy.intercept("GET", `${apiBase}/boards/b1/snapshot*`, {
      statusCode: 200,
      body: {
        board: {
          id: "b1",
          name: "Accessibility Test Board",
          slug: "accessibility-test-board",
          description: "Board for testing accessibility",
          gateway_id: "g1",
          board_group_id: null,
          board_type: "general",
          objective: null,
          success_metrics: null,
          target_date: null,
          goal_confirmed: true,
          goal_source: "test",
          organization_id: "o1",
          created_at: "2026-02-11T00:00:00Z",
          updated_at: "2026-02-11T00:00:00Z",
        },
        tasks: [
          {
            id: "t1",
            board_id: "b1",
            title: "Keyboard Test Task",
            description: "Task for testing keyboard navigation",
            status: "inbox",
            priority: "high",
            due_at: null,
            assigned_agent_id: null,
            depends_on_task_ids: [],
            created_by_user_id: null,
            in_progress_at: null,
            created_at: "2026-02-11T00:00:00Z",
            updated_at: "2026-02-11T00:00:00Z",
            blocked_by_task_ids: [],
            is_blocked: false,
            assignee: null,
            approvals_count: 0,
            approvals_pending_count: 0,
          },
        ],
        agents: [],
        approvals: [],
        chat_messages: [],
        pending_approvals_count: 0,
      },
    }).as("snapshot");

    cy.intercept("GET", `${apiBase}/boards/b1/group-snapshot*`, {
      statusCode: 200,
      body: { group: null, boards: [] },
    }).as("groupSnapshot");

    // Login and visit board
    cy.loginWithLocalAuth();
    cy.visit("/boards/b1");
    cy.waitForAppLoaded();

    cy.wait([
      "@snapshot",
      "@groupSnapshot",
      "@membership",
      "@me",
      "@organizations",
      "@tags",
      "@customFields",
    ]);

    // Verify TaskBoard is loaded
    cy.get('[data-testid="task-board"]').should("be.visible");

    // Focus the task board and navigate to a task
    cy.get('[data-testid="task-board"]').focus();
    cy.focused().type("{downarrow}");

    // Verify task is focused
    cy.contains("Keyboard Test Task").should("have.focus");

    // Inject axe-core after focus state
    cy.injectAxe();

    // Run accessibility check with focused element
    cy.checkA11y("[data-testid='task-board']", {
      rules: {
        "color-contrast": { enabled: true },
        "focus-order-semantics": { enabled: true },
        "frame-tested": { enabled: false },
      },
    });
  });

  it("has no accessibility violations during keyboard move mode", () => {
    stubEmptySse();

    // Setup API stubs
    cy.intercept("GET", `${apiBase}/organizations/me/member*`, {
      statusCode: 200,
      body: {
        id: "m1",
        organization_id: "o1",
        user_id: "u1",
        role: "owner",
        all_boards_read: true,
        all_boards_write: true,
        created_at: "2026-02-11T00:00:00Z",
        updated_at: "2026-02-11T00:00:00Z",
        board_access: [{ board_id: "b1", can_read: true, can_write: true }],
      },
    }).as("membership");

    cy.intercept("GET", `${apiBase}/users/me*`, {
      statusCode: 200,
      body: {
        id: "u1",
        clerk_user_id: "clerk_u1",
        email,
        name: "Jane Test",
        preferred_name: "Jane",
        timezone: "America/New_York",
        is_super_admin: false,
      },
    }).as("me");

    cy.intercept("GET", `${apiBase}/organizations/me/list*`, {
      statusCode: 200,
      body: [{ id: "o1", name: "Personal", role: "owner", is_active: true }],
    }).as("organizations");

    cy.intercept("GET", `${apiBase}/tags*`, {
      statusCode: 200,
      body: { items: [], total: 0, limit: 200, offset: 0 },
    }).as("tags");

    cy.intercept("GET", `${apiBase}/organizations/me/custom-fields*`, {
      statusCode: 200,
      body: [],
    }).as("customFields");

    cy.intercept("GET", `${apiBase}/boards/b1/snapshot*`, {
      statusCode: 200,
      body: {
        board: {
          id: "b1",
          name: "Accessibility Test Board",
          slug: "accessibility-test-board",
          description: "Board for testing accessibility",
          gateway_id: "g1",
          board_group_id: null,
          board_type: "general",
          objective: null,
          success_metrics: null,
          target_date: null,
          goal_confirmed: true,
          goal_source: "test",
          organization_id: "o1",
          created_at: "2026-02-11T00:00:00Z",
          updated_at: "2026-02-11T00:00:00Z",
        },
        tasks: [
          {
            id: "t1",
            board_id: "b1",
            title: "Move Mode Test Task",
            description: "Task for testing move mode",
            status: "inbox",
            priority: "medium",
            due_at: null,
            assigned_agent_id: null,
            depends_on_task_ids: [],
            created_by_user_id: null,
            in_progress_at: null,
            created_at: "2026-02-11T00:00:00Z",
            updated_at: "2026-02-11T00:00:00Z",
            blocked_by_task_ids: [],
            is_blocked: false,
            assignee: null,
            approvals_count: 0,
            approvals_pending_count: 0,
          },
        ],
        agents: [],
        approvals: [],
        chat_messages: [],
        pending_approvals_count: 0,
      },
    }).as("snapshot");

    cy.intercept("GET", `${apiBase}/boards/b1/group-snapshot*`, {
      statusCode: 200,
      body: { group: null, boards: [] },
    }).as("groupSnapshot");

    cy.intercept("PATCH", `${apiBase}/boards/b1/tasks/t1`, (req) => {
      req.reply({
        statusCode: 200,
        body: {
          id: "t1",
          board_id: "b1",
          title: "Move Mode Test Task",
          description: "Task for testing move mode",
          status: req.body.status || "inbox",
          priority: "medium",
          due_at: null,
          assigned_agent_id: null,
          depends_on_task_ids: [],
          created_by_user_id: null,
          in_progress_at: null,
          created_at: "2026-02-11T00:00:00Z",
          updated_at: "2026-02-11T00:00:00Z",
          blocked_by_task_ids: [],
          is_blocked: false,
          assignee: null,
          approvals_count: 0,
          approvals_pending_count: 0,
        },
      });
    }).as("updateTask");

    // Login and visit board
    cy.loginWithLocalAuth();
    cy.visit("/boards/b1");
    cy.waitForAppLoaded();

    cy.wait([
      "@snapshot",
      "@groupSnapshot",
      "@membership",
      "@me",
      "@organizations",
      "@tags",
      "@customFields",
    ]);

    // Verify TaskBoard is loaded
    cy.get('[data-testid="task-board"]').should("be.visible");

    // Focus the task board and navigate to a task
    cy.get('[data-testid="task-board"]').focus();
    cy.focused().type("{downarrow}");

    // Activate move mode
    cy.focused().type("{enter}");

    // Inject axe-core during move mode
    cy.injectAxe();

    // Run accessibility check during move mode
    cy.checkA11y("[data-testid='task-board']", {
      rules: {
        "aria-required-attr": { enabled: true },
        "aria-required-children": { enabled: true },
        "aria-required-parent": { enabled: true },
        "aria-roles": { enabled: true },
        "aria-valid-attr-value": { enabled: true },
        "aria-valid-attr": { enabled: true },
        "button-name": { enabled: true },
        "color-contrast": { enabled: true },
        "label": { enabled: true },
        "link-name": { enabled: true },
        "list": { enabled: true },
        "listitem": { enabled: true },
        "region": { enabled: true },
      },
    });
  });
});
