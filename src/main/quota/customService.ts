/*
 * @Author: baobaobao
 * @Date: 2026-02-04 14:21:10
 * @LastEditTime: 2026-02-04 15:57:35
 * @LastEditors: baobaobao
 */
import axios from "axios";

export interface CustomUserSelfResponse {
  data?: {
    quota?: number;
    used_quota?: number;
    request_count?: number;
    username?: string;
  };
  success?: boolean;
  message?: string;
}

export interface CustomPricingResponse {
  data?: unknown;
  success?: boolean;
  message?: string;
}

export interface CustomPricingModel {
  name: string;
  vendor?: string;
}

function resolveApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(baseUrl);
  const trimmedPath = url.pathname.replace(/\/+$/, "");
  const normalizedBase = trimmedPath.replace(/\/(api\/v1|v1|api)$/i, "");
  url.pathname = normalizedBase ? `${normalizedBase}/` : "/";
  return new URL(normalizedPath, url).toString();
}

export async function fetchCustomUserSelf(
  baseUrl: string,
  accessToken: string,
  newApiUser?: string,
): Promise<CustomUserSelfResponse> {
  const url = resolveApiUrl(baseUrl, "/api/user/self");
  const response = await axios.get<CustomUserSelfResponse>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(newApiUser ? { "new-api-user": newApiUser } : {}),
    },
    timeout: 30000,
  });

  return response.data;
}

export async function fetchCustomPricing(
  baseUrl: string,
  accessToken: string,
  newApiUser?: string,
): Promise<CustomPricingResponse> {
  const url = resolveApiUrl(baseUrl, "/api/pricing");
  const response = await axios.get<CustomPricingResponse>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(newApiUser ? { "new-api-user": newApiUser } : {}),
    },
    timeout: 30000,
  });
  return response.data;
}

function extractModelsAndVendors(payload: unknown): {
  models: unknown[];
  vendors?: unknown;
} {
  if (Array.isArray(payload)) {
    return { models: payload };
  }
  if (!payload || typeof payload !== "object") {
    return { models: [] };
  }
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) {
    return { models: root.data, vendors: root.vendors };
  }
  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return { models: nested.data, vendors: nested.vendors || root.vendors };
    }
  }
  return { models: [] };
}

function buildVendorMaps(vendors?: unknown): {
  modelToVendor: Map<string, string>;
  vendorIdToName: Map<string, string>;
} {
  const modelToVendor = new Map<string, string>();
  const vendorIdToName = new Map<string, string>();
  if (!vendors) return { modelToVendor, vendorIdToName };

  if (Array.isArray(vendors)) {
    for (const entry of vendors) {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const vendorName =
          (record.vendor as string) ||
          (record.name as string) ||
          (record.vendor_name as string);
        const vendorId = record.id;
        if (vendorName && vendorId !== undefined && vendorId !== null) {
          vendorIdToName.set(String(vendorId), vendorName);
        }
        const models = record.models;
        if (vendorName && Array.isArray(models)) {
          models.forEach((model) => {
            if (typeof model === "string") {
              modelToVendor.set(model, vendorName);
            }
          });
        }
      }
    }
    return { modelToVendor, vendorIdToName };
  }

  if (typeof vendors === "object") {
    for (const [vendorName, list] of Object.entries(
      vendors as Record<string, unknown>,
    )) {
      if (Array.isArray(list)) {
        list.forEach((model) => {
          if (typeof model === "string") modelToVendor.set(model, vendorName);
        });
      }
    }
  }
  return { modelToVendor, vendorIdToName };
}

export function parseCustomPricingModels(
  response: CustomPricingResponse,
): CustomPricingModel[] {
  const { models, vendors } = extractModelsAndVendors(response);
  if (!models.length) return [];
  const { modelToVendor, vendorIdToName } = buildVendorMaps(vendors);
  const results: CustomPricingModel[] = [];

  for (const item of models) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name =
      (record.model_name as string) ||
      (record.name as string) ||
      (record.model as string) ||
      (record.id as string) ||
      (record.modelId as string);
    if (!name) continue;
    const vendor =
      (record.vendor as string) ||
      (record.vendor_name as string) ||
      (record.provider as string) ||
      (record.group as string) ||
      modelToVendor.get(name) ||
      vendorIdToName.get(String(record.vendor_id ?? record.vendorId ?? ""));
    results.push({ name, vendor });
  }

  return results;
}

export function formatQuotaValue(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
}
