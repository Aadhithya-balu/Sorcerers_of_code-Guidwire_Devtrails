import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

type UserIdentifier = {
  userId?: string;
  email?: string;
};

type PlanSelection = Parameters<typeof api.activatePlan>[1];

const shouldRetry = (failureCount: number, error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("not found") || message.includes("404")) {
    return false;
  }
  return failureCount < 2;
};

export function useWorkerProfile(identifier?: UserIdentifier) {
  return useQuery({
    queryKey: ['workerProfile', identifier?.userId, identifier?.email],
    queryFn: async () => {
      if (!identifier?.userId && !identifier?.email) {
        throw new Error('userId or email is required for worker profile');
      }
      return api.getWorkerProfile(identifier);
    },
    enabled: Boolean(identifier?.userId || identifier?.email),
    staleTime: 30000,
    retry: shouldRetry,
    refetchInterval: (query) => (query.state.status === 'success' ? 15000 : false),
  });
}

export function usePolicy(identifier?: UserIdentifier) {
  return useQuery({
    queryKey: ['policy', identifier?.userId, identifier?.email],
    queryFn: async () => {
      if (!identifier?.userId && !identifier?.email) {
        return [];
      }
      return api.getPolicy(identifier);
    },
    enabled: Boolean(identifier?.userId || identifier?.email),
    staleTime: 30000,
    retry: shouldRetry,
    refetchInterval: (query) => (query.state.status === 'success' ? 15000 : false),
  });
}

export function useClaims(identifier?: UserIdentifier) {
  return useQuery({
    queryKey: ['claims', identifier?.userId, identifier?.email],
    queryFn: async () => {
      if (!identifier?.userId && !identifier?.email) {
        return [];
      }
      return api.getClaims(identifier);
    },
    enabled: Boolean(identifier?.userId || identifier?.email),
    staleTime: 30000,
    retry: shouldRetry,
    refetchInterval: (query) => (query.state.status === 'success' ? 15000 : false),
  });
}

export function useRiskSnapshot(identifier?: UserIdentifier) {
  return useQuery({
    queryKey: ['riskSnapshot', identifier?.userId, identifier?.email],
    queryFn: async () => {
      if (!identifier?.userId && !identifier?.email) {
        throw new Error('userId or email is required for risk snapshot');
      }
      return api.getRiskSnapshot(identifier);
    },
    enabled: Boolean(identifier?.userId || identifier?.email),
    staleTime: 10000,
    retry: shouldRetry,
    refetchInterval: (query) => (query.state.status === 'success' ? 10000 : false),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts(),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useChartData() {
  return useQuery({
    queryKey: ['chartData'],
    queryFn: () => api.getChartData(),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useSimulatePayout() {
  return useMutation({
    mutationFn: ({
      identifier,
      dailyIncome,
    }: {
      identifier: UserIdentifier;
      dailyIncome: number;
    }) => api.getProtectionEstimate(identifier, dailyIncome),
  });
}

export function useActivatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      identifier,
      selectedPlan,
      overallRisk,
    }: {
      identifier: UserIdentifier;
      selectedPlan: PlanSelection;
      overallRisk?: number | null;
    }) => api.activatePlan(identifier, selectedPlan, overallRisk),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['policy', variables.identifier.userId, variables.identifier.email],
      });
      void queryClient.invalidateQueries({
        queryKey: ['workerProfile', variables.identifier.userId, variables.identifier.email],
      });
    },
  });
}

export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: ({
      identifier,
      selectedPlan,
      overallRisk,
    }: {
      identifier: UserIdentifier;
      selectedPlan: PlanSelection;
      overallRisk?: number | null;
    }) => api.createPaymentOrder(identifier, selectedPlan, overallRisk),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      identifier,
      payload,
    }: {
      identifier: UserIdentifier;
      payload: {
        policyId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      };
    }) => api.verifyPaymentAndActivatePlan(identifier, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['policy', variables.identifier.userId, variables.identifier.email],
      });
      void queryClient.invalidateQueries({
        queryKey: ['riskSnapshot', variables.identifier.userId, variables.identifier.email],
      });
      void queryClient.invalidateQueries({
        queryKey: ['claims', variables.identifier.userId, variables.identifier.email],
      });
    },
  });
}

export function useNearbyZones(identifier?: UserIdentifier) {
  return useQuery({
    queryKey: ['nearbyZones', identifier?.userId, identifier?.email],
    queryFn: async () => {
      if (!identifier?.userId && !identifier?.email) {
        return [];
      }
      return api.getNearbyZones(identifier);
    },
    enabled: Boolean(identifier?.userId || identifier?.email),
    staleTime: 30000,
    retry: shouldRetry,
    refetchInterval: (query) => (query.state.status === 'success' ? 30000 : false),
  });
}

export function useGetPremiumQuote(identifier: UserIdentifier) {
  return useMutation({
    mutationFn: ({ plan, overallRisk }: { plan: PlanSelection; overallRisk?: number | null; }) => api.getPremiumQuote({
      userId: identifier.userId!,
      plan,
      overallRisk
    }),
  });
}

export function useSimulateDemoClaim() {
  return useMutation({
    mutationFn: ({
      identifier,
      payload,
    }: {
      identifier: UserIdentifier;
      payload: {
        selectedPlan: PlanSelection;
        disruptionType: string;
        otherReason?: string;
        rainfall: number;
        aqi: number;
        traffic: number;
        lostIncome: number;
        temperature?: number;
        policyId?: string;
      };
    }) => api.simulateDemoClaim(identifier, payload),
  });
}
