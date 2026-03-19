import { atom } from "jotai";

export interface OnboardingData {
  organizationName: string;
  gatewayUrl: string;
  gatewayToken: string;
  gatewayId: string | null;
  gatewayConnected: boolean;
  selectedTemplate: string | null;
  agentCount: number;
}

const STORAGE_KEY = "mc_onboarding";

function loadPersistedStep(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.step ?? 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

function loadPersistedData(): OnboardingData {
  if (typeof window === "undefined") return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultData(), ...parsed.data };
    }
  } catch {
    // ignore
  }
  return defaultData();
}

function defaultData(): OnboardingData {
  return {
    organizationName: "",
    gatewayUrl: "",
    gatewayToken: "",
    gatewayId: null,
    gatewayConnected: false,
    selectedTemplate: null,
    agentCount: 0,
  };
}

/** Current onboarding step (0-4). */
export const onboardingStepAtom = atom<number>(loadPersistedStep());

/** Collected onboarding data across all steps. */
export const onboardingDataAtom = atom<OnboardingData>(loadPersistedData());

/** Persist onboarding state to localStorage. */
export function persistOnboarding(step: number, data: OnboardingData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // ignore
  }
}

/** Clear onboarding state from localStorage. */
export function clearOnboardingState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
