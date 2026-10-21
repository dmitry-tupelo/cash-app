import { parseAmount, parseDecimal } from '@/lib/amount';

import { apiRequest, invalidResponse, isRecord } from './client';

export type ClaimStatus = 'pending' | 'completed' | 'failed';

/** Amounts stay as the API's decimal strings (validated), so a claim can be saved as JSON. */
export type Claim = {
  id: string;
  asset: string;
  amount: string;
  fee: string;
  receiveAmount: string;
  destinationId: string;
  status: ClaimStatus;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimRequest = { asset: string; amount: string; destinationId: string };

export type Destination = { id: string; label: string };

export type ClaimOptions = {
  asset: string;
  /** Smallest units of the asset. */
  minAmount: bigint;
  fee: bigint;
  destinations: Destination[];
};

export async function fetchClaimOptions(
  token: string,
  asset: string,
  decimals: number,
  signal?: AbortSignal,
): Promise<ClaimOptions> {
  const json = await apiRequest(`/v1/claim-options?asset=${encodeURIComponent(asset)}`, {
    token,
    signal,
  });
  return parseClaimOptions(json, decimals);
}

export async function createClaim(
  token: string,
  idempotencyKey: string,
  body: ClaimRequest,
  signal?: AbortSignal,
): Promise<Claim> {
  const json = await apiRequest('/v1/claims', {
    token,
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  });
  return parseClaim(json);
}

export async function fetchClaim(token: string, id: string, signal?: AbortSignal): Promise<Claim> {
  return parseClaim(await apiRequest(`/v1/claims/${encodeURIComponent(id)}`, { token, signal }));
}

export function parseClaimOptions(json: unknown, decimals: number): ClaimOptions {
  if (!isRecord(json) || typeof json.asset !== 'string') throw invalidResponse('claim options');
  const units = (field: 'minAmount' | 'fee') => {
    const value = json[field];
    const parsed = typeof value === 'string' ? parseAmount(value, decimals) : null;
    if (!parsed?.ok) throw invalidResponse(`claim options ${field}`);
    return parsed.units;
  };
  if (!Array.isArray(json.destinations)) throw invalidResponse('claim options destinations');
  const destinations = json.destinations.map((raw): Destination => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.label !== 'string') {
      throw invalidResponse('destination');
    }
    return { id: raw.id, label: raw.label };
  });
  return { asset: json.asset, minAmount: units('minAmount'), fee: units('fee'), destinations };
}

const STATUSES: readonly string[] = ['pending', 'completed', 'failed'];

export function parseClaim(json: unknown): Claim {
  if (!isRecord(json)) throw invalidResponse('claim');
  const text = (field: string) => {
    const value = json[field];
    if (typeof value !== 'string' || !value) throw invalidResponse(`claim ${field}`);
    return value;
  };
  const decimal = (field: string) => {
    const value = text(field);
    if (!parseDecimal(value)) throw invalidResponse(`claim ${field}`);
    return value;
  };
  const time = (field: string) => {
    const value = text(field);
    if (Number.isNaN(Date.parse(value))) throw invalidResponse(`claim ${field}`);
    return value;
  };
  const status = text('status');
  if (!STATUSES.includes(status)) throw invalidResponse('claim status');
  const failureReason = json.failureReason;
  if (failureReason !== null && failureReason !== undefined && typeof failureReason !== 'string') {
    throw invalidResponse('claim failureReason');
  }

  return {
    id: text('id'),
    asset: text('asset'),
    amount: decimal('amount'),
    fee: decimal('fee'),
    receiveAmount: decimal('receiveAmount'),
    destinationId: text('destinationId'),
    status: status as ClaimStatus,
    failureReason: failureReason ?? null,
    createdAt: time('createdAt'),
    updatedAt: time('updatedAt'),
  };
}
