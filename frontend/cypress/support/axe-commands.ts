/// <reference types="cypress" />

import type { RunOptions, AxeResults, Result } from "axe-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AxeCoreType = any;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  interface Window {
    axe?: AxeCoreType;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Injects axe-core into the page.
       */
      injectAxe(): Chainable<void>;

      /**
       * Runs an accessibility check on the page or a specific element.
       * @param context - Optional selector or element to check (default: entire document)
       * @param options - Optional axe-core run options
       */
      checkA11y(
        context?: string | Node,
        options?: RunOptions,
      ): Chainable<AxeResults>;

      /**
       * Configures axe-core rules.
       * @param options - axe-core spec to configure
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      configureAxe(options: Record<string, unknown>): Chainable<void>;
    }
  }
}

/**
 * Inject axe-core script into the page.
 * This loads axe-core from node_modules and injects it into the browser context.
 */
Cypress.Commands.add("injectAxe", () => {
  cy.window({ log: false }).then((win) => {
    // Check if axe is already loaded
    if (win.axe) {
      return;
    }

    // Read axe-core source and inject it
    cy.readFile("node_modules/axe-core/axe.min.js", { log: false }).then(
      (axeSource) => {
        // Execute axe in the browser context
        const script = win.document.createElement("script");
        script.textContent = axeSource;
        win.document.head.appendChild(script);
      },
    );
  });
});

/**
 * Configure axe-core rules and settings.
 */
Cypress.Commands.add("configureAxe", (options: Record<string, unknown>) => {
  cy.window({ log: false }).then((win) => {
    if (!win.axe) {
      throw new Error(
        "axe-core is not loaded. Call cy.injectAxe() before configuring.",
      );
    }
    win.axe.configure(options);
  });
});

/**
 * Format violation message for output.
 */
function formatViolation(violation: Result): string {
  const nodes = violation.nodes
    .map((node) => {
      const target = Array.isArray(node.target)
        ? node.target.join(", ")
        : node.target;
      return `  - ${target}: ${node.failureSummary || ""}`;
    })
    .join("\n");

  return `[${violation.impact?.toUpperCase() || "UNKNOWN"}] ${violation.id}: ${violation.description}\n${nodes}`;
}

/**
 * Run accessibility check and report violations.
 */
Cypress.Commands.add(
  "checkA11y",
  (
    context: string | Node = "document",
    options: RunOptions = {},
  ): Cypress.Chainable<AxeResults> => {
    return cy.window({ log: false }).then((win) => {
      if (!win.axe) {
        throw new Error(
          "axe-core is not loaded. Call cy.injectAxe() before running accessibility checks.",
        );
      }

      // Default options - exclude some common non-critical issues
      const defaultOptions: RunOptions = {
        rules: {
          // Allow color contrast checks but note they may need manual review
          "color-contrast": { enabled: true },
        },
        ...options,
      };

      return win.axe
        .run(context, defaultOptions)
        .then((results: AxeResults) => {
          const violations = results.violations;

          // Log results
          cy.log(`axe-core found ${violations.length} accessibility violations`);

          if (violations.length > 0) {
            // Log each violation
            violations.forEach((violation) => {
              const message = formatViolation(violation);
              cy.log(message);
            });

            // Create detailed assertion message
            const criticalViolations = violations.filter(
              (v) => v.impact === "critical" || v.impact === "serious",
            );

            if (criticalViolations.length > 0) {
              const errorMessage = criticalViolations
                .map(formatViolation)
                .join("\n\n");
              throw new Error(
                `Accessibility violations found (${criticalViolations.length} critical/serious):\n\n${errorMessage}`,
              );
            }
          }

          return results;
        });
    });
  },
);

export {};
