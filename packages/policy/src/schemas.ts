import { z } from 'zod';

/**
 * x402 v2 wire types (see specs/x402-specification-v2.md and
 * specs/schemes/exact/scheme_exact_evm.md in the x402 repository).
 *
 * Parsing is deliberately strict: unknown top-level fields and unknown `extra`
 * keys fail closed. Parsing only checks shape; the firewall decides policy.
 */

export const ResourceInfoSchema = z
  .object({
    url: z.string(),
    description: z.string().optional(),
    mimeType: z.string().optional(),
  })
  .strict();

export const PaymentRequirementsExtraSchema = z
  .object({
    assetTransferMethod: z.string().optional(),
    name: z.string().optional(),
    version: z.string().optional(),
  })
  .strict();

export const PaymentRequirementsSchema = z
  .object({
    scheme: z.string(),
    network: z.string(),
    amount: z.string(),
    asset: z.string(),
    payTo: z.string(),
    maxTimeoutSeconds: z.number(),
    extra: PaymentRequirementsExtraSchema.optional(),
  })
  .strict();

export const PaymentRequiredSchema = z
  .object({
    x402Version: z.literal(2),
    error: z.string().optional(),
    resource: ResourceInfoSchema,
    accepts: z.array(PaymentRequirementsSchema).min(1),
    extensions: z.record(z.unknown()).optional(),
  })
  .strict();

export type ResourceInfo = z.infer<typeof ResourceInfoSchema>;
export type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;
export type PaymentRequired = z.infer<typeof PaymentRequiredSchema>;
