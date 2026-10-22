import {
  PaymentRequiredSchema,
  PaymentRequirementsSchema,
  type PaymentRequired,
  type PaymentRequirements,
} from './schemas';

export type ParseFailure = 'UNSUPPORTED_VERSION' | 'MALFORMED';
export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: ParseFailure };

function versionOf(input: unknown): unknown {
  return typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)['x402Version']
    : undefined;
}

/** Parse a 402 response body. Never throws; any problem is a failure. */
export function parsePaymentRequired(input: unknown): ParseResult<PaymentRequired> {
  if (versionOf(input) !== 2) return { ok: false, reason: 'UNSUPPORTED_VERSION' };
  const parsed = PaymentRequiredSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, reason: 'MALFORMED' };
}

/** Parse a single PaymentRequirements object. */
export function parsePaymentRequirements(
  input: unknown,
): ParseResult<PaymentRequirements> {
  const parsed = PaymentRequirementsSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, reason: 'MALFORMED' };
}
