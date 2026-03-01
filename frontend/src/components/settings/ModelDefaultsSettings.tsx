"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { useAuth } from "@/auth/clerk";
import { ApiError } from "@/api/mutator";
import {
  type listGatewaysApiV1GatewaysGetResponse,
  useListGatewaysApiV1GatewaysGet,
} from "@/api/generated/gateways/gateways";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/ui/searchable-select";
import { useOrganizationMembership } from "@/lib/use-organization-membership";
import {
  useGetModelDefaults,
  useUpdateModelDefaults,
  useListGatewayModels,
} from "@/lib/api-hooks";

export function ModelDefaultsSettings() {
  const { isSignedIn } = useAuth();
  const { isAdmin } = useOrganizationMembership(isSignedIn);

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [edited, setEdited] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const defaultsQuery = useGetModelDefaults({
    enabled: Boolean(isSignedIn && isAdmin),
    refetchOnMount: "always",
  });

  const gatewaysQuery = useListGatewaysApiV1GatewaysGet<
    listGatewaysApiV1GatewaysGetResponse,
    ApiError
  >(undefined, {
    query: {
      enabled: Boolean(isSignedIn && isAdmin),
      refetchOnMount: "always",
    },
  });

  const gateways = useMemo(
    () =>
      gatewaysQuery.data?.status === 200
        ? (gatewaysQuery.data.data.items ?? [])
        : [],
    [gatewaysQuery.data],
  );

  const firstGatewayId = gateways[0]?.id ?? null;
  const modelsQuery = useListGatewayModels(firstGatewayId, {
    enabled: !!firstGatewayId,
    staleTime: 60_000,
  });

  const models = useMemo(
    () => (modelsQuery.data?.status === 200 ? modelsQuery.data.data : []),
    [modelsQuery.data],
  );

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        value: m.id,
        label: m.name || m.id,
      })),
    [models],
  );

  const defaults =
    defaultsQuery.data?.status === 200 ? defaultsQuery.data.data : null;

  useEffect(() => {
    if (defaults && !edited) {
      setSelectedModel(defaults.global_default_model ?? "");
    }
  }, [defaults, edited]);

  const updateMutation = useUpdateModelDefaults({
    onSuccess: () => {
      setSaveError(null);
      setSaveSuccess("Model defaults saved.");
      setEdited(false);
    },
    onError: (error: ApiError) => {
      setSaveSuccess(null);
      setSaveError(error.message || "Unable to save.");
    },
  });

  const handleSave = () => {
    setSaveError(null);
    setSaveSuccess(null);
    updateMutation.mutate({
      global_default_model: selectedModel || null,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Model Defaults
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Set the default AI model used when creating new agents. Models are
          discovered from your connected gateways.
        </p>

        <div className="mt-6 max-w-md space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Global default model
            </label>
            {modelsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading models from gateway...</p>
            ) : modelOptions.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">
                  {gateways.length === 0
                    ? "No gateways configured. Add a gateway first to discover available models."
                    : "No models found on gateway. Verify the gateway is running and has models configured."}
                </p>
                <input
                  className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setEdited(true);
                  }}
                  placeholder="Enter model ID manually"
                />
              </div>
            ) : (
              <SearchableSelect
                ariaLabel="Select default model"
                value={selectedModel}
                onValueChange={(value) => {
                  setSelectedModel(value);
                  setEdited(true);
                }}
                options={modelOptions}
                placeholder="Select model"
                searchPlaceholder="Search models..."
                emptyMessage="No matching models."
                triggerClassName="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                contentClassName="rounded-xl border border-slate-200 shadow-lg"
                itemClassName="px-4 py-3 text-sm text-slate-700 data-[selected=true]:bg-slate-50 data-[selected=true]:text-slate-900"
              />
            )}
          </div>

          {saveError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {saveError}
            </div>
          ) : null}
          {saveSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {saveSuccess}
            </div>
          ) : null}

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !edited}
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving…" : "Save defaults"}
          </Button>
        </div>
      </section>
    </div>
  );
}
