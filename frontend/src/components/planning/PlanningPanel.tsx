"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetPlanning,
  useStartPlanning,
  useSubmitPlanningAnswer,
  useCancelPlanning,
  useApprovePlanning,
  type PlanningQuestionRead,
} from "@/lib/api-hooks";

export function PlanningPanel({
  taskId,
  gatewayId,
}: {
  taskId: string;
  gatewayId: string | null;
}) {
  const planningQuery = useGetPlanning(taskId, {
    refetchInterval: 5000,
  });
  const startMutation = useStartPlanning();
  const answerMutation = useSubmitPlanningAnswer();
  const cancelMutation = useCancelPlanning();
  const approveMutation = useApprovePlanning();

  const planning =
    planningQuery.data?.status === 200 ? planningQuery.data.data : null;

  if (!planning) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">AI Planning</h3>
        <p className="mt-1 text-sm text-slate-500">
          Start an AI-assisted planning session to break down this task.
        </p>
        <div className="mt-4">
          <Button
            onClick={() => {
              if (gatewayId) {
                startMutation.mutate({ taskId, gatewayId });
              }
            }}
            disabled={!gatewayId || startMutation.isPending}
          >
            <Play className="h-4 w-4" />
            {startMutation.isPending ? "Starting..." : "Start planning"}
          </Button>
          {!gatewayId ? (
            <p className="mt-2 text-xs text-slate-400">
              No gateway available. Configure a gateway first.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (planning.status === "cancelled") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-500">
          Planning cancelled
        </h3>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (gatewayId) {
                startMutation.mutate({ taskId, gatewayId });
              }
            }}
            disabled={!gatewayId || startMutation.isPending}
          >
            <Play className="h-4 w-4" />
            Start new planning session
          </Button>
        </div>
      </div>
    );
  }

  if (planning.status === "approved") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-900">
            Plan approved
          </h3>
        </div>
        {planning.planning_spec ? (
          <PlanningSpec spec={planning.planning_spec} />
        ) : null}
      </div>
    );
  }

  if (planning.status === "completed") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-900">
          Planning complete
        </h3>
        {planning.planning_spec ? (
          <PlanningSpec spec={planning.planning_spec} />
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => approveMutation.mutate(taskId)}
            disabled={approveMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4" />
            {approveMutation.isPending ? "Approving..." : "Approve & dispatch"}
          </Button>
          <Button
            variant="outline"
            onClick={() => cancelMutation.mutate(taskId)}
            disabled={cancelMutation.isPending}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Active planning session
  const questions = planning.questions || [];
  const currentQuestion = questions.find((q) => q.answer === null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          AI Planning
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            Active
          </span>
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelMutation.mutate(taskId)}
          disabled={cancelMutation.isPending}
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>

      {/* Answered questions */}
      {questions
        .filter((q) => q.answer !== null)
        .map((q) => (
          <div key={q.id} className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">
              {q.question_text}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {q.answer}
            </p>
          </div>
        ))}

      {/* Current question */}
      {currentQuestion ? (
        <PlanningQuestionInput
          question={currentQuestion}
          taskId={taskId}
          onSubmit={(answer) =>
            answerMutation.mutate({ taskId, answer })
          }
          isPending={answerMutation.isPending}
        />
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for AI response...
        </div>
      )}
    </div>
  );
}

function PlanningQuestionInput({
  question,
  taskId,
  onSubmit,
  isPending,
}: {
  question: PlanningQuestionRead;
  taskId: string;
  onSubmit: (answer: string) => void;
  isPending: boolean;
}) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer.trim());
      setAnswer("");
    }
  };

  if (question.question_type === "multiple_choice" && question.options) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-900">
          {question.question_text}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSubmit(option)}
              disabled={isPending}
              className="rounded-lg border border-slate-200 bg-white p-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-medium text-slate-900">
        {question.question_text}
      </p>
      <div className="flex gap-2">
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending || !answer.trim()}>
          {isPending ? "Sending..." : "Answer"}
        </Button>
      </div>
    </form>
  );
}

function PlanningSpec({ spec }: { spec: Record<string, unknown> }) {
  const summary = spec.summary as string | undefined;
  const objectives = spec.objectives as string[] | undefined;
  const steps = spec.steps as Array<{
    title: string;
    description: string;
    agent_role?: string;
  }> | undefined;

  return (
    <div className="mt-3 space-y-3">
      {summary ? (
        <p className="text-sm text-slate-700">{summary}</p>
      ) : null}
      {objectives && objectives.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Objectives
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
            {objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {steps && steps.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Steps
          </p>
          <div className="mt-1 space-y-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-100 bg-white p-3"
              >
                <p className="text-sm font-medium text-slate-900">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {step.description}
                </p>
                {step.agent_role ? (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {step.agent_role}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
