# SecureX

Security-aware gateway between AI agents and x402 paid APIs. See the architecture doc
("SecureX: Revised Architecture Sections") for the design.

## Layout

- `packages/policy` - x402 v2 types and strict parsing, policy config, Payment Intent Firewall. Shared by gateway and signer, which each run their own copy.
- `apps/gateway` - ingress, registry, router (stub).
- `apps/signer` - signer service (stub). Deployed separately from the gateway.
- Canary worker: later stage.

## Commands

    npm install
    npm run typecheck
    npm test

## Baseline decisions

EVM, x402 v2 `exact` scheme, EIP-3009 only, Base Sepolia (`eip155:84532`) for development.
