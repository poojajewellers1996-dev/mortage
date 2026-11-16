const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("girvi_token") : null;

  const requestHeaders = new Headers(headers);
  if (restOptions.body && !requestHeaders.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("girvi_token");
      localStorage.removeItem("girvi_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    const message = (isJson && data?.error) || response.statusText || "Request failed";
    throw new ApiError(message, response.status, isJson ? data?.details : data);
  }

  return data;
}

// API Endpoints Services
export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiFetch<{ success: boolean; token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  logout: () => apiFetch<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  getMe: () => apiFetch<{ success: boolean; user: any }>("/api/auth/me"),

  // Customers
  getCustomers: (params?: { search?: string; page?: number; limit?: number }) =>
    apiFetch<{ success: boolean; data: any[]; pagination: any }>("/api/customers", { params }),
  getCustomer: (id: string) =>
    apiFetch<{ success: boolean; data: any }>(`/api/customers/${id}`),
  createCustomer: (customerData: any) =>
    apiFetch<{ success: boolean; data: any }>("/api/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    }),
  updateCustomer: (id: string, customerData: any) =>
    apiFetch<{ success: boolean; data: any }>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    }),
  deleteCustomer: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/customers/${id}`, {
      method: "DELETE",
    }),

  // Pledges
  getNextPledgeNumber: () =>
    apiFetch<{ success: boolean; nextNumber: string }>("/api/pledges/next-number"),
  getPledges: (params?: { search?: string; status?: string; metalType?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    apiFetch<{ success: boolean; data: any[]; pagination: any }>("/api/pledges", { params }),
  getPledge: (id: string) =>
    apiFetch<{ success: boolean; data: any }>(`/api/pledges/${id}`),
  getPledgeReceipt: (id: string) =>
    apiFetch<{ success: boolean; data: any }>(`/api/pledges/${id}/receipt`),
  createPledge: (pledgeData: any) =>
    apiFetch<{ success: boolean; data: any; message: string }>("/api/pledges", {
      method: "POST",
      body: JSON.stringify(pledgeData),
    }),
  updatePledge: (id: string, updateData: any) =>
    apiFetch<{ success: boolean; data: any; message?: string }>(`/api/pledges/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    }),
  closePledge: (id: string, closureData: { totalPaid: number; paymentMode?: string; remarks?: string; closedDate?: string }) =>
    apiFetch<{ success: boolean; message: string }>(`/api/pledges/${id}/close`, {
      method: "POST",
      body: JSON.stringify(closureData),
    }),
  deletePledge: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/pledges/${id}`, {
      method: "DELETE",
    }),

  // Articles
  addArticle: (pledgeId: string, articleData: any) =>
    apiFetch<{ success: boolean; data: any }>(`/api/pledges/${pledgeId}/articles`, {
      method: "POST",
      body: JSON.stringify(articleData),
    }),
  updateArticle: (articleId: string, articleData: any) =>
    apiFetch<{ success: boolean; data: any }>(`/api/articles/${articleId}`, {
      method: "PUT",
      body: JSON.stringify(articleData),
    }),
  deleteArticle: (articleId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/articles/${articleId}`, {
      method: "DELETE",
    }),

  // Payments
  getPayments: (params?: { pledgeId?: string; page?: number; limit?: number }) =>
    apiFetch<{ success: boolean; data: any[]; pagination: any }>("/api/payments", { params }),
  recordPayment: (paymentData: any) =>
    apiFetch<{ success: boolean; data: any; message: string }>("/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    }),

  // Dashboard
  getDashboardSummary: () =>
    apiFetch<{ success: boolean; data: any }>("/api/dashboard/summary"),
  getDashboardAnalytics: () =>
    apiFetch<{ success: boolean; data: any }>("/api/dashboard/analytics"),

  // Upload
  uploadPhoto: (data: { base64Data: string; fileName?: string; folder?: string; entityType?: string; entityId?: string }) =>
    apiFetch<{ success: boolean; data: { filePath: string; signedUrl: string } }>("/api/upload", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Settings
  getSettings: () =>
    apiFetch<{ success: boolean; data: any }>("/api/settings"),
  updateSettings: (settingsData: any) =>
    apiFetch<{ success: boolean; data: any; message: string }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settingsData),
    }),
};
