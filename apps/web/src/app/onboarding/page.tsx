"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import {
  onboardingStepAtom,
  onboardingDataAtom,
  persistOnboarding,
  clearOnboardingState,
  type OnboardingData,
} from "@/stores/onboarding";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { StepWelcome } from "@/components/onboarding/step-welcome";
import { StepOrganization } from "@/components/onboarding/step-organization";
import { StepGateway } from "@/components/onboarding/step-gateway";
import { StepTemplate } from "@/components/onboarding/step-template";
import { StepComplete } from "@/components/onboarding/step-complete";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useAtom(onboardingStepAtom);
  const [data, setData] = useAtom(onboardingDataAtom);

  const goTo = useCallback(
    (nextStep: number) => {
      setStep(nextStep);
      persistOnboarding(nextStep, data);
    },
    [setStep, data]
  );

  const updateData = useCallback(
    (partial: Partial<OnboardingData>) => {
      setData((prev) => {
        const next = { ...prev, ...partial };
        persistOnboarding(step, next);
        return next;
      });
    },
    [setData, step]
  );

  const handleFinish = useCallback(() => {
    clearOnboardingState();
    router.push("/dashboard");
  }, [router]);

  return (
    <WizardShell currentStep={step}>
      {step === 0 && <StepWelcome onNext={() => goTo(1)} />}

      {step === 1 && (
        <StepOrganization
          organizationName={data.organizationName}
          onUpdate={(name) => updateData({ organizationName: name })}
          onNext={() => goTo(2)}
          onBack={() => goTo(0)}
        />
      )}

      {step === 2 && (
        <StepGateway
          gatewayUrl={data.gatewayUrl}
          gatewayToken={data.gatewayToken}
          gatewayId={data.gatewayId}
          gatewayConnected={data.gatewayConnected}
          onUpdate={(gwData) => updateData(gwData)}
          onNext={() => goTo(3)}
          onBack={() => goTo(1)}
        />
      )}

      {step === 3 && (
        <StepTemplate
          selectedTemplate={data.selectedTemplate}
          onUpdate={(template, agentCount) =>
            updateData({ selectedTemplate: template, agentCount })
          }
          onNext={() => goTo(4)}
          onBack={() => goTo(2)}
        />
      )}

      {step === 4 && (
        <StepComplete data={data} onFinish={handleFinish} />
      )}
    </WizardShell>
  );
}
