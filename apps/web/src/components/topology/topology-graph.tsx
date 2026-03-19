"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type CSSProperties,
} from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
  Kanban,
  Radio,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TopologyData,
  TopologyNode,
  TopologyNodeType,
} from "@/hooks/use-topology-data";
import { NodeTooltip } from "./node-tooltip";

// ── Color constants ──

const EDGE_COLOR = "rgba(42, 42, 46, 0.5)";
const EDGE_HIGHLIGHT_COLOR = "rgba(59, 130, 246, 0.7)";
const NODE_DIM_OPACITY = 0.15;

// ── FA2 layout settings ──

const FA2_SETTINGS = {
  gravity: 1,
  scalingRatio: 10,
  slowDown: 5,
  barnesHutOptimize: true,
  strongGravityMode: false,
  adjustSizes: true,
};

interface TopologyGraphProps {
  data: TopologyData;
}

/**
 * Full-page WebGL topology graph using Sigma.js v3 and Graphology.
 * All sigma/graphology imports are dynamic to prevent SSR crashes.
 */
export function TopologyGraph({ data }: TopologyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigmaRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Refs for hover state (used inside sigma reducers which can't access React state)
  const hoveredNodeRef = useRef<string | null>(null);
  const neighborsRef = useRef<Set<string>>(new Set());
  const cleanupRef = useRef<(() => void) | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Component state
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [, setHoveredNode] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    agents: true,
    boards: true,
    gateways: true,
  });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Track initialization
  const initializedRef = useRef(false);

  // ── Populate graph helper ──
  const populateGraph = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (graph: any, topologyData: TopologyData, currentFilters: typeof filters) => {
      graph.clear();

      const nodeMap = new Set<string>();

      for (const node of topologyData.nodes) {
        if (node.type === "agent" && !currentFilters.agents) continue;
        if (node.type === "board" && !currentFilters.boards) continue;
        if (node.type === "gateway" && !currentFilters.gateways) continue;

        nodeMap.add(node.id);

        graph.addNode(node.id, {
          label: node.label,
          size: node.size,
          color: node.color,
          x: Math.random() * 100,
          y: Math.random() * 100,
          nodeType: node.type,
          originalColor: node.color,
          originalSize: node.size,
        });
      }

      for (const edge of topologyData.edges) {
        if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
          graph.addEdge(edge.source, edge.target, {
            color: EDGE_COLOR,
            size: 1,
            originalColor: EDGE_COLOR,
          });
        }
      }
    },
    []
  );

  // ── Run ForceAtlas2 layout ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runLayout = useCallback(async (graph: any, iterations = 150) => {
    try {
      const fa2Module = await import("graphology-layout-forceatlas2");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fa2: any = fa2Module.default ?? fa2Module;

      if (fa2 && typeof fa2.assign === "function") {
        fa2.assign(graph, { iterations, settings: FA2_SETTINGS });
      } else if (typeof fa2 === "function") {
        fa2(graph, { iterations, settings: FA2_SETTINGS });
      }
    } catch (err) {
      console.warn("ForceAtlas2 layout failed, using random positions", err);
    }
  }, []);

  // ── Initialize Sigma ──
  useEffect(() => {
    if (!containerRef.current || data.isEmpty) return;
    if (initializedRef.current) return;

    let cancelled = false;

    async function init() {
      const [graphologyModule, sigmaModule] = await Promise.all([
        import("graphology"),
        import("sigma"),
      ]);

      if (cancelled || !containerRef.current) return;

      // Resolve constructors from various export shapes
      const Graph = graphologyModule.default ?? graphologyModule;
      const Sigma = sigmaModule.default ?? sigmaModule;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GraphConstructor = typeof Graph === "function" ? Graph : (Graph as any).Graph ?? Graph;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SigmaConstructor = typeof Sigma === "function" ? Sigma : (Sigma as any).Sigma ?? Sigma;

      const graph = new GraphConstructor();
      graphRef.current = graph;

      // Populate and layout
      populateGraph(graph, dataRef.current, filtersRef.current);
      await runLayout(graph);

      if (cancelled || !containerRef.current) return;

      // Create renderer
      const sigma = new SigmaConstructor(graph, containerRef.current, {
        renderLabels: true,
        renderEdgeLabels: false,
        labelSize: 12,
        labelColor: { color: "#ededef" },
        labelFont: "Inter, system-ui, sans-serif",
        labelWeight: "500",
        defaultEdgeColor: EDGE_COLOR,
        defaultEdgeType: "line",
        labelRenderedSizeThreshold: 6,
        labelDensity: 0.6,
        labelGridCellSize: 100,
        zIndex: true,
        minCameraRatio: 0.1,
        maxCameraRatio: 10,
        // Hover highlight reducers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeReducer: (node: string, attrs: any) => {
          const res = { ...attrs };
          if (hoveredNodeRef.current) {
            if (
              node !== hoveredNodeRef.current &&
              !neighborsRef.current.has(node)
            ) {
              res.color = dimColor(
                attrs.originalColor ?? attrs.color,
                NODE_DIM_OPACITY
              );
              res.label = "";
            }
          }
          return res;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edgeReducer: (_edge: string, attrs: any, source: string, target: string) => {
          const res = { ...attrs };
          if (hoveredNodeRef.current) {
            if (
              source === hoveredNodeRef.current ||
              target === hoveredNodeRef.current
            ) {
              res.color = EDGE_HIGHLIGHT_COLOR;
              res.size = 2;
            } else {
              res.color = dimColor(EDGE_COLOR, NODE_DIM_OPACITY);
            }
          }
          return res;
        },
      });

      sigmaRef.current = sigma;
      initializedRef.current = true;

      // ── Event handlers ──

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sigma.on("enterNode", (payload: any) => {
        const node = payload.node;
        hoveredNodeRef.current = node;
        neighborsRef.current = new Set(graph.neighbors(node));
        sigma.refresh();
        setHoveredNode(node);
        if (containerRef.current) containerRef.current.style.cursor = "pointer";
      });

      sigma.on("leaveNode", () => {
        hoveredNodeRef.current = null;
        neighborsRef.current = new Set();
        sigma.refresh();
        setHoveredNode(null);
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sigma.on("clickNode", (payload: any) => {
        const nodeId = payload.node;
        const topoNode = dataRef.current.nodes.find((n) => n.id === nodeId);
        if (topoNode) {
          // Use the mouse event position from the payload
          const mouseEvent = payload.event?.original ?? payload.event;
          const x = mouseEvent?.clientX ?? mouseEvent?.x ?? 300;
          const y = mouseEvent?.clientY ?? mouseEvent?.y ?? 300;
          setSelectedNode(topoNode);
          setTooltipPos({ x, y });
        }
      });

      sigma.on("clickStage", () => {
        setSelectedNode(null);
      });

      // Resize handling
      const resizeObserver = new ResizeObserver(() => {
        sigma.refresh();
      });
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      cleanupRef.current = () => {
        resizeObserver.disconnect();
        sigma.kill();
        initializedRef.current = false;
        sigmaRef.current = null;
        graphRef.current = null;
      };
    }

    init();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.isEmpty]);

  // ── Rebuild graph when filters change ──
  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current || !initializedRef.current) return;

    populateGraph(graphRef.current, data, filters);

    runLayout(graphRef.current, 100).then(() => {
      sigmaRef.current?.refresh();
    });

    // Close tooltip on filter change
    setSelectedNode(null);
  }, [filters, data, populateGraph, runLayout]);

  // ── Camera controls ──

  const handleZoomIn = useCallback(() => {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 300 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    sigmaRef.current?.getCamera().animatedReset({ duration: 300 });
  }, []);

  const toggleFilter = useCallback((type: TopologyNodeType) => {
    setFilters((prev) => ({
      ...prev,
      [`${type}s`]: !prev[`${type}s` as keyof typeof prev],
    }));
  }, []);

  // ── Node counts for UI ──

  const nodeCounts = {
    agents: data.nodes.filter((n) => n.type === "agent").length,
    boards: data.nodes.filter((n) => n.type === "board").length,
    gateways: data.nodes.filter((n) => n.type === "gateway").length,
  };

  return (
    <div className="relative flex-1 overflow-hidden rounded-md border border-border-subtle">
      {/* Sigma WebGL canvas */}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={
          {
            cursor: "grab",
            background: "var(--bg-base)",
          } as CSSProperties
        }
        role="img"
        aria-label={`Topology graph showing ${nodeCounts.agents} agents, ${nodeCounts.boards} boards, and ${nodeCounts.gateways} gateways`}
      />

      {/* Controls overlay (top-right) */}
      <div className="absolute right-space-3 top-space-3 flex flex-col gap-space-2">
        {/* Zoom controls */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-md border border-border-subtle bg-bg-elevated/90 backdrop-blur-sm">
          <ControlButton
            onClick={handleZoomIn}
            label="Zoom in"
            icon={ZoomIn}
          />
          <div className="h-px bg-border-subtle" />
          <ControlButton
            onClick={handleZoomOut}
            label="Zoom out"
            icon={ZoomOut}
          />
          <div className="h-px bg-border-subtle" />
          <ControlButton
            onClick={handleFitToScreen}
            label="Fit to screen"
            icon={Maximize2}
          />
        </div>

        {/* Filter toggles */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-md border border-border-subtle bg-bg-elevated/90 backdrop-blur-sm">
          <FilterToggle
            label="Agents"
            icon={Bot}
            count={nodeCounts.agents}
            active={filters.agents}
            color="#10B981"
            onToggle={() => toggleFilter("agent")}
          />
          <div className="h-px bg-border-subtle" />
          <FilterToggle
            label="Boards"
            icon={Kanban}
            count={nodeCounts.boards}
            active={filters.boards}
            color="#3B82F6"
            onToggle={() => toggleFilter("board")}
          />
          <div className="h-px bg-border-subtle" />
          <FilterToggle
            label="Gateways"
            icon={Radio}
            count={nodeCounts.gateways}
            active={filters.gateways}
            color="#8B5CF6"
            onToggle={() => toggleFilter("gateway")}
          />
        </div>
      </div>

      {/* Legend (bottom-left) */}
      <div className="absolute bottom-space-3 left-space-3 rounded-md border border-border-subtle bg-bg-elevated/90 px-space-3 py-space-2 backdrop-blur-sm">
        <div className="mb-space-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Legend
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <LegendItem color="#10B981" label="Agent (online)" />
          <LegendItem color="#F59E0B" label="Agent (degraded)" />
          <LegendItem color="#EF4444" label="Agent (offline)" />
          <LegendItem color="#3B82F6" label="Board" />
          <LegendItem color="#8B5CF6" label="Gateway" />
        </div>
      </div>

      {/* Stats badge (bottom-right) */}
      <div className="absolute bottom-space-3 right-space-3 rounded-md border border-border-subtle bg-bg-elevated/90 px-space-3 py-space-2 text-xs text-text-muted backdrop-blur-sm">
        <span className="font-mono tabular-nums">
          {data.nodes.length} nodes &middot; {data.edges.length} edges
        </span>
      </div>

      {/* Node tooltip */}
      {selectedNode && (
        <NodeTooltip
          node={selectedNode}
          position={tooltipPos}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function ControlButton({
  onClick,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  label: string;
  icon: typeof ZoomIn;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
      aria-label={label}
      title={label}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function FilterToggle({
  label,
  icon: _Icon,
  count,
  active,
  color,
  onToggle,
}: {
  label: string;
  icon: typeof Bot;
  count: number;
  active: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-space-2 px-space-2 py-1.5 text-xs transition-colors",
        active ? "text-text-primary" : "text-text-muted opacity-50"
      )}
      aria-label={`${active ? "Hide" : "Show"} ${label}`}
      title={`${active ? "Hide" : "Show"} ${label}`}
    >
      {active ? (
        <Eye size={12} aria-hidden="true" />
      ) : (
        <EyeOff size={12} aria-hidden="true" />
      )}
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: active ? color : "var(--text-muted)" }}
        aria-hidden="true"
      />
      <span className="min-w-[52px]">{label}</span>
      <span className="font-mono tabular-nums text-text-muted">{count}</span>
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-space-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-text-secondary">{label}</span>
    </div>
  );
}

// ── Utility: dim a hex color to rgba ──

function dimColor(hex: string, opacity: number): string {
  if (hex.startsWith("rgba")) {
    return hex.replace(/[\d.]+\)$/, `${opacity})`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
