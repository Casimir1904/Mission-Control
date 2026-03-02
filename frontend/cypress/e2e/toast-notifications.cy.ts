/// <reference types="cypress" />

describe("Toast notifications", () => {
  const apiBase = "**/api/v1";

  function stubAgentCreationApis() {
    // User authentication stubs
    cy.intercept("GET", `${apiBase}/users/me*`, {
      statusCode: 200,
      body: {
        id: "u1",
        clerk_user_id: "local-auth-user",
        email: "local@example.com",
        name: "Local User",
        preferred_name: "Local User",
        timezone: "UTC",
        is_super_admin: true,
      },
    }).as("usersMe");

    cy.intercept("GET", `${apiBase}/organizations/me/list*`, {
      statusCode: 200,
      body: [
        {
          id: "org1",
          name: "Testing Org",
          role: "owner",
          is_active: true,
        },
      ],
    }).as("orgsList");

    cy.intercept("GET", `${apiBase}/organizations/me/member*`, {
      statusCode: 200,
      body: {
        id: "membership-1",
        user_id: "u1",
        organization_id: "org1",
        role: "owner",
        all_boards_read: true,
        all_boards_write: true,
        board_access: [],
      },
    }).as("orgMembership");

    // Boards list for agent creation form
    cy.intercept("GET", `${apiBase}/boards*`, {
      statusCode: 200,
      body: {
        items: [
          {
            id: "board-1",
            name: "Test Board",
            slug: "test-board",
            description: "Test board description",
            organization_id: "org1",
            gateway_id: "gateway-1",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
    }).as("boardsList");
  }

  it("displays success toast when agent is created successfully", () => {
    stubAgentCreationApis();

    // Stub successful agent creation
    cy.intercept("POST", `${apiBase}/agents`, {
      statusCode: 200,
      body: {
        data: {
          id: "agent-1",
          name: "Test Agent",
          board_id: "board-1",
          status: "provisioning",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        status: 200,
      },
    }).as("createAgent");

    cy.loginWithLocalAuth();
    cy.visit("/agents/new");
    cy.waitForAppLoaded();

    // Wait for initial data load
    cy.wait(["@usersMe", "@orgsList", "@orgMembership", "@boardsList"]);

    // Fill in the agent creation form
    cy.contains("label", "Agent name")
      .parent()
      .find("input")
      .type("Test Agent");

    // Submit the form
    cy.contains("button", /^Create agent$/)
      .should("be.visible")
      .and("not.be.disabled")
      .click();

    cy.wait(["@createAgent"]);

    // Verify success toast appears - sonner uses data-sonner-toast attribute
    cy.get('[data-sonner-toast]', { timeout: 10_000 })
      .should("be.visible")
      .and("contain.text", "Agent created");
  });

  it("displays error toast when agent creation fails", () => {
    stubAgentCreationApis();

    // Stub failed agent creation
    cy.intercept("POST", `${apiBase}/agents`, {
      statusCode: 500,
      body: {
        error: "Internal server error",
        message: "Failed to create agent",
      },
    }).as("createAgentError");

    cy.loginWithLocalAuth();
    cy.visit("/agents/new");
    cy.waitForAppLoaded();

    // Wait for initial data load
    cy.wait(["@usersMe", "@orgsList", "@orgMembership", "@boardsList"]);

    // Fill in the agent creation form
    cy.contains("label", "Agent name")
      .parent()
      .find("input")
      .type("Test Agent");

    // Submit the form
    cy.contains("button", /^Create agent$/)
      .should("be.visible")
      .and("not.be.disabled")
      .click();

    cy.wait(["@createAgentError"]);

    // Verify error toast appears - sonner uses data-sonner-toast attribute
    cy.get('[data-sonner-toast]', { timeout: 10_000 })
      .should("be.visible")
      .and("contain.text", "Failed to create agent");
  });

  it("displays toast with description when using custom messages", () => {
    stubAgentCreationApis();

    // Stub successful agent creation
    cy.intercept("POST", `${apiBase}/agents`, {
      statusCode: 200,
      body: {
        data: {
          id: "agent-2",
          name: "Custom Agent",
          board_id: "board-1",
          status: "provisioning",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        status: 200,
      },
    }).as("createAgent");

    cy.loginWithLocalAuth();
    cy.visit("/agents/new");
    cy.waitForAppLoaded();

    // Wait for initial data load
    cy.wait(["@usersMe", "@orgsList", "@orgMembership", "@boardsList"]);

    // Fill in the agent creation form
    cy.contains("label", "Agent name")
      .parent()
      .find("input")
      .type("Custom Agent");

    // Submit the form
    cy.contains("button", /^Create agent$/)
      .should("be.visible")
      .and("not.be.disabled")
      .click();

    cy.wait(["@createAgent"]);

    // Verify toast is visible and has the expected structure
    cy.get('[data-sonner-toast]', { timeout: 10_000 }).should("be.visible");

    // Sonner toasts should have a close button
    cy.get('[data-sonner-toast]')
      .find('[data-sonner-toast-close]')
      .should("exist");
  });
});
