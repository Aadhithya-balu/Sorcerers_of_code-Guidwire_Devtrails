const APP_NAME = "RakshitArtha";
const INSURANCE_DEFAULT_PORT = 5000;

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

const toNetworkError = () =>
  new Error(
    `Unable to connect to ${APP_NAME} insurance service. Start backend on port ${INSURANCE_DEFAULT_PORT} and try again.`,
  );

const fetchInsurance = async (path: string, init?: RequestInit) => {
  const endpointPath = normalizePath(path);
  let lastNetworkError: unknown = null;

  for (let i = 0; i < insuranceApiBases.length; i += 1) {
    const base = insuranceApiBases[i];
    const url = `${base}${endpointPath}`;
    try {
      const response = await fetch(url, init);
      const isRetryableHttp =
        [404, 502, 503, 504].includes(response.status) &&
        i < insuranceApiBases.length - 1;
      if (isRetryableHttp) {
        continue;
      }
      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (lastNetworkError) {
    throw toNetworkError();
  }

  throw new Error("Insurance API request failed");
};

type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  location: string;
  platform: string;
  dailyIncome?: number;
  workingHours?: string;
  workingDays?: string;
  avgDailyHours?: string;
};

type SyncResponse = {
  backendUserId: string;
  accountStatus: string;
  kycVerified: boolean;
};

export type BackendUserProfile = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  platform: string;
  location?: string;
  dailyIncome?: number | null;
  accountStatus?: string;
  kyc?: {
    verified?: boolean;
  };
};

const platformMap: Record<string, string> = {
  SWIGGY: "SWIGGY",
  ZOMATO: "ZOMATO",
  RIKSHAW: "RIKSHAW",
  RICKSHAW: "RIKSHAW",
  "UBER EATS": "OTHER",
  UBER: "OTHER",
  DUNZO: "OTHER",
  ZEPTO: "OTHER",
  BLINKIT: "OTHER",
  OTHER: "OTHER",
};

const normalizePlatform = (platform: string) => {
  const key = (platform || "").trim().toUpperCase();
  return platformMap[key] || "OTHER";
};

const normalizePhone = (phone: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return "9000000000";
};

const normalizeLocation = (location: string) => {
  const value = (location || "").trim();
  return value.length > 0 ? value : "Chennai";
};

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

export async function syncUserToBackend(payload: RegisterPayload): Promise<SyncResponse> {
  const normalizedPayload = {
    ...payload,
    email: payload.email.trim().toLowerCase(),
    phone: normalizePhone(payload.phone),
    location: normalizeLocation(payload.location),
    platform: normalizePlatform(payload.platform),
  };

  const registerResponse = await fetchInsurance("/auth/register", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...normalizedPayload,
      workerType: 'GIG',
      dailyIncome: typeof payload.dailyIncome === 'number' ? payload.dailyIncome : undefined,
      workingHours: payload.workingHours,
      workingDays: payload.workingDays,
      avgDailyHours: payload.avgDailyHours,
    }),
  });

  if (registerResponse.ok) {
    const json = await parseJson(registerResponse);
    const backendUserId = json.data.userId as string;

    return {
      backendUserId,
      accountStatus: json.data.status || 'VERIFICATION_PENDING',
      kycVerified: false,
    };
  }

  const existing = await fetchInsurance(
    `/auth/profile-by-email/${encodeURIComponent(normalizedPayload.email)}`,
  );
  if (!existing.ok) {
    const body = await registerResponse.json().catch(() => null);
    const validationErrors = body?.errors?.length ? `: ${body.errors.join(', ')}` : '';
    throw new Error((body?.message || 'Failed to sync user to backend') + validationErrors);
  }

  const existingJson = await parseJson(existing);
  const existingUser = existingJson.data;
  const backendUserId = existingUser._id as string;

  const profileNeedsUpdate =
    existingUser.phone !== normalizedPayload.phone ||
    existingUser.location !== normalizedPayload.location ||
    existingUser.platform !== normalizedPayload.platform ||
    existingUser.name !== normalizedPayload.name;

  if (profileNeedsUpdate) {
    await fetchInsurance(`/auth/profile/${backendUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedPayload.phone,
        location: normalizedPayload.location,
        latitude: null,
        longitude: null,
      }),
    });
  }

  return {
    backendUserId,
    accountStatus: existingUser.accountStatus || 'VERIFICATION_PENDING',
    kycVerified: Boolean(existingUser.kyc?.verified),
  };
}

export async function verifyKyc(
  backendUserId: string,
  documentType: string,
  documentId: string,
  options?: { documentImage?: string; profileImage?: string }
) {
  const response = await fetchInsurance(`/auth/verify-kyc/${backendUserId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentType,
      documentId,
      documentImage: options?.documentImage,
      profileImage: options?.profileImage,
    }),
  });
  const json = await parseJson(response);
  return json.data;
}

export async function updateDailyIncome(backendUserId: string, dailyIncome: number) {
  const response = await fetchInsurance(`/auth/profile/${backendUserId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dailyIncome }),
  });
  const json = await parseJson(response);
  return json.data;
}

export async function updateUserProfileFields(
  backendUserId: string,
  payload: {
    workingHours?: string;
    workingDays?: string;
    avgDailyHours?: string;
    dailyIncome?: number;
    themePreference?: 'light' | 'dark' | 'system';
    profileImage?: string;
  }
) {
  const response = await fetchInsurance(`/auth/profile/${backendUserId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseJson(response);
  return json.data;
}

export async function registerDeviceToken(
  backendUserId: string,
  token: string,
  platform = 'web'
) {
  const response = await fetchInsurance(`/auth/device-token/${backendUserId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform }),
  });
  const json = await parseJson(response);
  return json.data;
}

export async function fetchBackendProfileByEmail(email: string): Promise<BackendUserProfile | null> {
  const target = (email || '').trim().toLowerCase();
  if (!target) {
    return null;
  }
  try {
    const response = await fetchInsurance(
      `/auth/profile-by-email/${encodeURIComponent(target)}`,
    );
    if (!response.ok) {
      return null;
    }
    const json = await parseJson(response);
    return json.data as BackendUserProfile;
  } catch {
    return null;
  }
}
