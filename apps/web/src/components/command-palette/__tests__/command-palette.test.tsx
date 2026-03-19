import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { commandPaletteOpenAtom } from "@/stores/command-palette";

// Mock all heavy dependencies the command palette imports
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("@/lib/api/hooks", () => ({
  useBoards: () => ({ data: undefined }),
  useAgents: () => ({ data: undefined }),
  useTasks: () => ({ data: undefined }),
  useGateways: () => ({ data: undefined }),
  queryKeys: {
    gateways: { all: ["gateways"] },
    agents: { all: ["agents"] },
  },
}));

vi.mock("@/lib/api/client", () => ({
  gatewaysApi: { sync: vi.fn() },
}));

// Import after mocks are set up
import { CommandPalette } from "../command-palette";

function renderWithStore(isOpen: boolean) {
  const store = createStore();
  store.set(commandPaletteOpenAtom, isOpen);
  return {
    store,
    ...render(
      <Provider store={store}>
        <CommandPalette />
      </Provider>
    ),
  };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    const { container } = renderWithStore(false);
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when open", () => {
    renderWithStore(true);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Command palette");
  });

  it("renders search input with combobox role", () => {
    renderWithStore(true);
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", "command-palette-list");
  });

  it("renders search input with correct placeholder", () => {
    renderWithStore(true);
    const input = screen.getByPlaceholderText(
      "Search boards, agents, tasks, or type a command..."
    );
    expect(input).toBeInTheDocument();
  });

  it("renders listbox for results", () => {
    renderWithStore(true);
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveAttribute("id", "command-palette-list");
  });

  it("renders static action items when open with no query", () => {
    renderWithStore(true);
    expect(screen.getByText("Create Board")).toBeInTheDocument();
    expect(screen.getByText("Create Agent")).toBeInTheDocument();
    expect(screen.getByText("Create Task")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });

  it("renders category headers", () => {
    renderWithStore(true);
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders escape key hint", () => {
    renderWithStore(true);
    // There are 2 "esc" elements: one in the search bar, one in the footer hints
    const escKeys = screen.getAllByText("esc");
    expect(escKeys.length).toBeGreaterThanOrEqual(1);
  });

  it("renders keyboard navigation hints in footer", () => {
    renderWithStore(true);
    expect(screen.getByText("navigate")).toBeInTheDocument();
    expect(screen.getByText("select")).toBeInTheDocument();
    expect(screen.getByText("close")).toBeInTheDocument();
  });

  it("renders action items as options", () => {
    renderWithStore(true);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    // First option should be selected by default
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("first static action is selected by default", () => {
    renderWithStore(true);
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    // The rest should not be selected
    for (let i = 1; i < options.length; i++) {
      expect(options[i]).toHaveAttribute("aria-selected", "false");
    }
  });
});
