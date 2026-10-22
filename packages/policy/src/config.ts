import { z } from 'zod';

const Caip2Evm = z.string().regex(/^eip155:[0-9]{1,20}$/);
const EvmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const AtomicAmount = z.string().regex(/^[0-9]{1,78}$/);

/** MVP: only the EIP-3009 transfer method is permitted (see doc section 8). */
export const TransferMethodSchema = z.enum(['eip3009']);

export const PolicySchema = z
  .object({
    version: z.string().min(1),
    networks: z.array(Caip2Evm).min(1),
    assets: z
      .array(
        z
          .object({
            network: Caip2Evm,
            address: EvmAddress,
            /** EIP-712 domain name of the token contract. */
            name: z.string().min(1),
            /** EIP-712 domain version of the token contract. */
            version: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    recipients: z.array(EvmAddress).min(1),
    maxAmountPerRequest: AtomicAmount,
    maxTimeoutSeconds: z.number().int().positive(),
    allowedTransferMethods: z.array(TransferMethodSchema).min(1),
  })
  .strict();

export type PolicyConfig = z.infer<typeof PolicySchema>;

export interface CompiledAsset {
  readonly name: string;
  readonly version: string;
}

export interface CompiledPolicy {
  readonly version: string;
  readonly networks: ReadonlySet<string>;
  /** key: `${network}:${lowercase address}` */
  readonly assets: ReadonlyMap<string, CompiledAsset>;
  readonly recipients: ReadonlySet<string>;
  readonly maxAmountPerRequest: bigint;
  readonly maxTimeoutSeconds: number;
  readonly transferMethods: ReadonlySet<string>;
}

export function assetKey(network: string, address: string): string {
  return `${network}:${address.toLowerCase()}`;
}

/**
 * Validate and compile a policy. Throws on an invalid policy: a broken policy
 * must stop the service at startup, never degrade into a permissive one.
 */
export function compilePolicy(input: unknown): CompiledPolicy {
  const p = PolicySchema.parse(input);
  return {
    version: p.version,
    networks: new Set(p.networks),
    assets: new Map(
      p.assets.map((a) => [
        assetKey(a.network, a.address),
        { name: a.name, version: a.version },
      ]),
    ),
    recipients: new Set(p.recipients.map((r) => r.toLowerCase())),
    maxAmountPerRequest: BigInt(p.maxAmountPerRequest),
    maxTimeoutSeconds: p.maxTimeoutSeconds,
    transferMethods: new Set(p.allowedTransferMethods),
  };
}
