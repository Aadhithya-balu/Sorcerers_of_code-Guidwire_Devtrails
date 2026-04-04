export interface WorkerProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  platform: string;
  dailyIncome: number;
  workingHours?: string;
  workingDays?: string;
  avgDailyHours?: string;
  zoneType: string;
  trustScore: number | null;
  backendUserId: string;
  location?: string;
}

export interface Policy {
  id: string;
  plan: string;
  normalizedPlanCode?: string;
  weeklyPremium: number;
  coverageAmount: number;
  lockedPayableAmount?: number;
  pricingBreakdown?: {
    basePremium?: number;
    baseCoverage?: number;
    riskFactor?: number;
    riskMultiplierApplied?: number;
    seasonalMultiplierApplied?: number;
    workerMultiplierApplied?: number;
    dynamicPlan?: boolean;
  } | null;
  status: string;
  expiryDate: string;
  startDate: string;
  riskFactor?: number;
  paymentStatus?: string;
  paymentProvider?: string;
  nextPaymentDue?: string;
  amountPaid?: number;
  lastPaymentId?: string;
  lastPaymentAt?: string;
  billingHistory?: {
    cycleStart?: string;
    cycleEnd?: string;
    amount?: number;
    status?: string;
    provider?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
  }[];
}

type PlanSelection = "standard" | "premium";

export interface PaymentOrder {
  policyId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  weeklyPremium: number;
  coverageAmount: number;
  lockedPayableAmount?: number;
  normalizedPlanCode?: string;
  pricingBreakdown?: {
    basePremium?: number;
    baseCoverage?: number;
    riskFactor?: number;
    riskMultiplierApplied?: number;
    seasonalMultiplierApplied?: number;
    workerMultiplierApplied?: number;
    dynamicPlan?: boolean;
  };
  nextPaymentDue: string;
}

export interface NearbyZone {
  zoneName: string;
  placeId: string | null;
  distanceKm: number | null;
  riskScore: number;
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
}

export interface DemoSimulationResult {
  selectedPlan: string;
  riskLabel: string;
  disruptionType: string;
  baselineIncome: number;
  lostIncome: number;
  incomeLossPercent: number;
  approved: boolean;
  rejectionReason: string | null;
  claimAmount: number;
  fraudScore: number;
  fraudFlags: string[];
  workflow: {
    policyPaymentVerified: { passed: boolean; reason: string };
    disruptionDetected: { passed: boolean; reason: string };
    incomeLossValidated: { passed: boolean; reason: string };
    fraudLayers: Record<string, { triggered: boolean; score: number; reason: string }>;
    fraudDecision: { passed: boolean; score: number; reason: string };
    payoutCalculated: { passed: boolean; amount: number; plan: string; reason: string };
    payoutSent: { passed: boolean; reason: string };
    notificationSent: { passed: boolean; reason: string };
  };
}

export interface ProtectionEstimate {
  estimatedLoss: number;
  payout: number;
  disruptionPercent: number;
  weeklyPremium: number;
  coverageAmount: number;
  riskFactor: number;
  source: string;
}

export interface Claim {
  _id?: string;
  id: string;
  policyId: string;
  userId: string;
  claimType: string;
  disruptionType: string;
  riskScore: number;
  status: string;
  payout: number;
  zone: string;
  date: string;
  payoutAmount?: number;
  createdAt?: string;
  fraudScore?: number;
  fraudFlags?: string[];
  fraudDescription?: string;
  fraudDecision?: string;
  triggerEvidence?: {
    weatherData?: {
      rainfall?: number;
      aqi?: number;
      temperature?: number;
      timestamp?: string;
    };
    locationData?: {
      latitude?: number;
      longitude?: number;
      address?: string;
      timestamp?: string;
    };
    activityData?: {
      deliveriesCompleted?: number;
      workingHours?: number;
      timestamp?: string;
    };
  };
  approvalNotes?: string;
  payoutMethod?: string;
  payoutDate?: string;
  rejectionReason?: string;
}


export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Info";
  timestamp: string;
  zone: string;
}

export interface ChartDataPoint {
  name: string;
  payout?: number;
  risk?: number;
  weather?: number;
  traffic?: number;
  aqi?: number;
}

export interface RiskSnapshot {
  overallRisk: number | null;
  environmentalRisk: number | null;
  locationRisk: number | null;
  activityRisk: number | null;
  rainfall: number | null;
  aqi: number | null;
  temperature: number | null;
  windSpeed: number | null;
  trafficIndex: number | null;
  zone: string | null;
  riskZone: string | null;
  address: string | null;
  dataSource: string | null;
  updatedAt: string | null;
}

type BackendUser = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  platform: string;
  location?: string;
  dailyIncome?: number | null;
  workingHours?: string | null;
  workingDays?: string | null;
  avgDailyHours?: string | null;
  riskProfile?: {
    reputationScore?: number;
  };
};

type UserIdentifier = {
  userId?: string;
  email?: string;
};

const APP_NAME = "RakshitArtha";
const INSURANCE_DEFAULT_PORT = 5000;
const AUTOMATION_DEFAULT_PORT = 3000;

const getHost = () =>
  typeof window !== "undefined" && window.location?.hostname
    ? window.location.hostname
    : "localhost";

const normalizeBase = (base: string) => base.trim().replace(/\/+$/, "");
const normalizePath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const resolveApiBases = (
  explicitUrl: string | undefined,
  fallbackPort: number,
  proxyPath: string,
) => {
  if (explicitUrl?.trim()) {
    return [normalizeBase(explicitUrl)];
  }

  const host = getHost();
  const candidates = [
    `http://${host}:${fallbackPort}`,
    `http://localhost:${fallbackPort}`,
    proxyPath,
  ].map(normalizeBase);

  return Array.from(new Set(candidates));
};

const insuranceApiBases = resolveApiBases(
  import.meta.env.VITE_INSURANCE_API_URL,
  INSURANCE_DEFAULT_PORT,
  "/insurance-api",
);
const automationApiBases = resolveApiBases(
  import.meta.env.VITE_AUTOMATION_API_URL,
  AUTOMATION_DEFAULT_PORT,
  "/automation-api",
);

const fetchFromBases = async (
  bases: string[],
  path: string,
  init: RequestInit | undefined,
  networkErrorMessage: string,
) => {
  const endpointPath = normalizePath(path);
  let lastNetworkError: unknown = null;

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i];
    const url = `${base}${endpointPath}`;
    try {
      const response = await fetch(url, init);
      const isRetryableHttp =
        [404, 502, 503, 504].includes(response.status) &&
        i < bases.length - 1;
      if (isRetryableHttp) {
        continue;
      }
      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (lastNetworkError) {
    throw new Error(networkErrorMessage);
  }

  throw new Error("API request failed");
};

const fetchInsurance = (path: string, init?: RequestInit) =>
  fetchFromBases(
    insuranceApiBases,
    path,
    init,
    `Unable to connect to ${APP_NAME} insurance service. Start backend on port ${INSURANCE_DEFAULT_PORT}.`,
  );

const fetchAutomation = (path: string, init?: RequestInit) =>
  fetchFromBases(
    automationApiBases,
    path,
    init,
    `Unable to connect to ${APP_NAME} automation service. Start backend on port ${AUTOMATION_DEFAULT_PORT}.`,
  );

const profileCache = new Map<string, WorkerProfile>();

const parseJson = async (res: Response) => {
  const raw = await res.text();
  let body: any = null;

  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = { message: raw };
    }
  }

  if (!res.ok) {
    const msg = body?.message || body?.error || "API request failed";
    throw new Error(msg);
  }
  return body ?? {};
};

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getEstimatedDailyIncome = (platform?: string) => {
  switch ((platform || "").toUpperCase()) {
    case "SWIGGY":
      return 1200;
    case "ZOMATO":
      return 1100;
    case "RIKSHAW":
      return 950;
    default:
      return 850;
  }
};

const getZoneType = (location?: string) => {
  const value = (location || "").toLowerCase();
  if (value.includes("bandra") || value.includes("whitefield") || value.includes("connaught")) {
    return "Urban";
  }
  return "Mixed";
};

const mapWorkerProfile = (user: BackendUser): WorkerProfile => ({
  id: user._id,
  backendUserId: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  platform: user.platform,
  location: user.location,
  dailyIncome: typeof user.dailyIncome === "number" ? user.dailyIncome : getEstimatedDailyIncome(user.platform),
  workingHours: user.workingHours || "",
  workingDays: user.workingDays || "",
  avgDailyHours: user.avgDailyHours || "",
  zoneType: getZoneType(user.location),
  trustScore:
    typeof user.riskProfile?.reputationScore === "number"
      ? user.riskProfile.reputationScore
      : null,
});

const resolveIdentifierKey = ({ userId, email }: UserIdentifier) =>
  userId || email || "default";

const resolveUserProfile = async ({
  userId,
  email,
}: UserIdentifier): Promise<WorkerProfile> => {
  const cacheKey = resolveIdentifierKey({ userId, email });
  const cached = profileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let url: string;
  let path: string;
  if (userId) {
    path = `/auth/profile/${userId}`;
  } else if (email) {
    path = `/auth/profile-by-email/${encodeURIComponent(email)}`;
  } else {
    throw new Error("A userId or email is required");
  }

  const res = await fetchInsurance(path);
  const json = await parseJson(res);
  const profile = mapWorkerProfile(json.data);

  profileCache.set(cacheKey, profile);
  profileCache.set(profile.backendUserId, profile);
  if (profile.email) {
    profileCache.set(profile.email, profile);
  }

  return profile;
};

const mapPolicy = (policy: any): Policy => ({
  id: policy._id,
  plan: policy.plan,
  normalizedPlanCode: policy.normalizedPlanCode,
  weeklyPremium: policy.weeklyPremium,
  coverageAmount: policy.coverageAmount,
  lockedPayableAmount: policy.lockedPayableAmount,
  pricingBreakdown: policy.pricingBreakdown ?? null,
  status: toTitleCase(policy.status),
  expiryDate: policy.expiryDate,
  startDate: policy.startDate,
  riskFactor: policy.riskFactor,
  paymentStatus: policy.paymentStatus ? toTitleCase(policy.paymentStatus) : undefined,
  paymentProvider: policy.paymentProvider,
  nextPaymentDue: policy.nextPaymentDue,
  amountPaid: policy.amountPaid,
  lastPaymentId: policy.lastPaymentId,
  lastPaymentAt: policy.lastPaymentAt,
  billingHistory: Array.isArray(policy.billingHistory)
    ? policy.billingHistory.map((entry: any) => ({
        cycleStart: entry.cycleStart,
        cycleEnd: entry.cycleEnd,
        amount: entry.amount,
        status: entry.status ? toTitleCase(entry.status) : undefined,
        provider: entry.provider,
        razorpayOrderId: entry.razorpayOrderId,
        razorpayPaymentId: entry.razorpayPaymentId,
        paidAt: entry.paidAt,
      }))
    : [],
});

const mapClaim = (claim: any): Claim => ({
  _id: claim._id,
  id: claim._id,
  policyId: claim.policyId,
  userId: claim.userId,
  claimType: claim.claimType,
  disruptionType: toTitleCase(claim.claimType),
  riskScore: claim.riskScore,
  status:
    claim.status === "SUBMITTED" ? "Pending" : toTitleCase(claim.status),
  payout: claim.payoutAmount || claim.approvedAmount || 0,
  payoutAmount: claim.payoutAmount || claim.approvedAmount || 0,
  zone:
    claim.triggerEvidence?.locationData?.address ||
    claim.triggerEvidence?.locationData?.zone ||
    "Unknown Zone",
  date: claim.createdAt,
  createdAt: claim.createdAt,
  fraudScore: claim.fraudScore,
  fraudFlags: claim.fraudFlags || [],
  fraudDescription: claim.fraudFlagDescription,
  fraudDecision: claim.status,
  triggerEvidence: claim.triggerEvidence,
  approvalNotes: claim.approvalNotes,
  payoutMethod: claim.payoutMethod,
  payoutDate: claim.payoutDate,
  rejectionReason: claim.rejectionReason,
});

const mapAlert = (alert: any): Alert => ({
  id: alert.id,
  title: alert.title || toTitleCase(alert.type || "System Alert"),
  description: alert.description || alert.message || "No description available.",
  severity: (alert.severity || "Info") as Alert["severity"],
  timestamp: alert.timestamp,
  zone: alert.zone || "System",
});

const mapRiskSnapshot = (riskData: any): RiskSnapshot => ({
  overallRisk:
    typeof riskData?.riskMetrics?.overallRisk === "number"
      ? riskData.riskMetrics.overallRisk
      : null,
  environmentalRisk:
    typeof riskData?.riskMetrics?.environmentalRisk === "number"
      ? riskData.riskMetrics.environmentalRisk
      : null,
  locationRisk:
    typeof riskData?.riskMetrics?.locationRisk === "number"
      ? riskData.riskMetrics.locationRisk
      : null,
  activityRisk:
    typeof riskData?.riskMetrics?.activityRisk === "number"
      ? riskData.riskMetrics.activityRisk
      : null,
  rainfall:
    typeof riskData?.weatherData?.rainfall === "number"
      ? riskData.weatherData.rainfall
      : null,
  aqi:
    typeof riskData?.weatherData?.aqi === "number"
      ? riskData.weatherData.aqi
      : null,
  temperature:
    typeof riskData?.weatherData?.temperature === "number"
      ? riskData.weatherData.temperature
      : null,
  windSpeed:
    typeof riskData?.weatherData?.windSpeed === "number"
      ? riskData.weatherData.windSpeed
      : null,
  trafficIndex:
    typeof riskData?.activityData?.routeBlockages === "number"
      ? riskData.activityData.routeBlockages
      : null,
  zone: riskData?.locationData?.zone || null,
  riskZone: riskData?.locationData?.riskZone || null,
  address: riskData?.locationData?.address || null,
  dataSource: riskData?.dataSource || null,
  updatedAt: riskData?.timestamp || riskData?.updatedAt || riskData?.createdAt || null,
});

const mapSelectedPlanToBackendPlan = (plan: PlanSelection) =>
  plan === "premium" ? "GIG_PREMIUM" : "GIG_STANDARD";

const toRiskFactor = (overallRisk?: number | null) => {
  if (typeof overallRisk !== "number") {
    return 1;
  }
  return Math.max(0.5, Math.min(2, Number((overallRisk / 50).toFixed(2))));
};

export const api = {
  getWorkerProfile: async (identifier: UserIdentifier): Promise<WorkerProfile> =>
    resolveUserProfile(identifier),

  getPolicy: async (identifier: UserIdentifier): Promise<Policy[]> => {
    const profile = await resolveUserProfile(identifier);
    const res = await fetchInsurance(`/policy/user/${profile.backendUserId}`);
    const json = await parseJson(res);
    return (json.data || []).map(mapPolicy);
  },

  getClaims: async (identifier: UserIdentifier): Promise<Claim[]> => {
    const profile = await resolveUserProfile(identifier);
    const res = await fetchInsurance(
      `/claim/user/${profile.backendUserId}/claims`,
    );
    const json = await parseJson(res);
    return (json.data || []).map(mapClaim);
  },


  getRiskSnapshot: async (identifier: UserIdentifier): Promise<RiskSnapshot> => {
    let path: string;
    const init: RequestInit = { method: "POST" };
    if (identifier.userId) {
      path = `/risk/user/${identifier.userId}/refresh`;
    } else if (identifier.email) {
      path = `/risk/email/${encodeURIComponent(identifier.email)}/refresh`;
    } else {
      throw new Error("A userId or email is required");
    }

    const res = await fetchInsurance(path, init);
    const json = await parseJson(res);
    return mapRiskSnapshot(json.data);
  },

  getAlerts: async (): Promise<Alert[]> => {
    const res = await fetchAutomation("/api/v1/automation/monitoring/alerts");
    const json = await parseJson(res);
    return (json.data || []).map(mapAlert);
  },

  getMetrics: async () => {
    const res = await fetchAutomation("/api/v1/automation/monitoring/metrics");
    const json = await parseJson(res);
    return json.data;
  },

  getChartData: async () => {
    const metrics = await api.getMetrics();
    return [
      {
        name: "Users",
        payout: metrics.users.total,
        risk: metrics.policies.active,
        weather: 0,
        traffic: 0,
        aqi: 0,
      },
      {
        name: "Claims",
        payout: metrics.claims.submitted,
        risk: metrics.claims.approved,
        weather: 0,
        traffic: 0,
        aqi: 0,
      },
    ];
  },

  simulatePayout: async (dailyIncome: number) => {
    const estimatedLoss = dailyIncome * 0.4;
    const payout = Math.min(350, estimatedLoss * 1.5);
    return { estimatedLoss, payout };
  },

  getProtectionEstimate: async (
    identifier: UserIdentifier,
    dailyIncome: number
  ): Promise<ProtectionEstimate> => {
    const profile = await resolveUserProfile(identifier);
    const response = await fetchInsurance(
      `/policy/user/${profile.backendUserId}/estimate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyIncome }),
      },
    );
    const json = await parseJson(response);
    return json.data;
  },

  activatePlan: async (
    identifier: UserIdentifier,
    selectedPlan: PlanSelection,
    overallRisk?: number | null
  ) => {
    const profile = await resolveUserProfile(identifier);
    const existingPolicies = await api.getPolicy({ userId: profile.backendUserId });
    const activePolicies = existingPolicies.filter((policy) => policy.status === "Active");

    for (const activePolicy of activePolicies) {
      await fetchInsurance(`/policy/${activePolicy.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetchInsurance("/policy/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.backendUserId,
        plan: mapSelectedPlanToBackendPlan(selectedPlan),
        workerType: "GIG",
        riskFactor: toRiskFactor(overallRisk),
        triggerTypes: ["HEAVY_RAIN", "HIGH_POLLUTION", "TRAFFIC_BLOCKED"],
      }),
    });
    const json = await parseJson(response);
    profileCache.delete(resolveIdentifierKey(identifier));
    profileCache.delete(profile.backendUserId);
    if (profile.email) {
      profileCache.delete(profile.email);
    }
    return json.data;
  },

  createPaymentOrder: async (
    identifier: UserIdentifier,
    selectedPlan: PlanSelection,
    overallRisk?: number | null
  ): Promise<PaymentOrder> => {
    const profile = await resolveUserProfile(identifier);
    const response = await fetchInsurance("/policy/payment/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.backendUserId,
        plan: mapSelectedPlanToBackendPlan(selectedPlan),
        overallRisk,
        triggerTypes: ["HEAVY_RAIN", "HIGH_POLLUTION", "TRAFFIC_BLOCKED"],
      }),
    });
    const json = await parseJson(response);
    return json.data;
  },

  verifyPaymentAndActivatePlan: async (
    identifier: UserIdentifier,
    payload: {
      policyId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ) => {
    const profile = await resolveUserProfile(identifier);
    const response = await fetchInsurance("/policy/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseJson(response);
    profileCache.delete(resolveIdentifierKey(identifier));
    profileCache.delete(profile.backendUserId);
    if (profile.email) {
      profileCache.delete(profile.email);
    }
    return json.data;
  },

  getNearbyZones: async (identifier: UserIdentifier): Promise<NearbyZone[]> => {
    let path: string;
    if (identifier.userId) {
      path = `/risk/user/${identifier.userId}/nearby-zones`;
    } else if (identifier.email) {
      path = `/risk/email/${encodeURIComponent(identifier.email)}/nearby-zones`;
    } else {
      throw new Error("A userId or email is required");
    }

    const response = await fetchInsurance(path);
    const json = await parseJson(response);
    return (json.data?.zones || []) as NearbyZone[];
  },

  getPremiumQuote: async ({ userId, plan, overallRisk }: { userId: string; plan: string; overallRisk?: number | null }) => {
    const profile = await resolveUserProfile({ userId });
    const response = await fetchInsurance("/policy/premium/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.backendUserId, plan, overallRisk }),
    });
    const json = await parseJson(response);
    return json.data;
  },

  simulateDemoClaim: async (
    identifier: UserIdentifier,
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
    }
  ): Promise<DemoSimulationResult> => {
    const profile = await resolveUserProfile(identifier);
    const { selectedPlan, ...restPayload } = payload;
    const response = await fetchInsurance("/claim/demo/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.backendUserId,
        selectedPlan: mapSelectedPlanToBackendPlan(selectedPlan),
        ...restPayload,
      }),
    });
    const json = await parseJson(response);
    return json.data as DemoSimulationResult;
  },
};
