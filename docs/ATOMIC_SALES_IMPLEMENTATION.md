# Atomic sale transaction: database implementation gate

## Current behavior
Crop and livestock sales are written to two local stores (stock and finance) with a durable local journal. Sync currently upserts each app independently into `animal_records`. This is **not** atomic across devices, and simultaneous sales can oversell stock.

## Required production change
Implement a single PostgreSQL RPC that validates and inserts both records in one database transaction, using the existing authenticated user's access to the farm. The client must not report a cloud-confirmed sale until the RPC succeeds.

### Server contract
Input: sale reference UUID, stock movement UUID, finance entry UUID, farm ID, exactly one of animal ID or crop-cycle ID, product key, unit, positive quantity, nonnegative amount, recorded time.

1. Require authenticated user and verify their **write** permission on the selected farm from the authoritative farm-membership tables. Do not rely on client-supplied roles.
2. Validate that the animal/crop cycle belongs to that farm.
3. Acquire a transaction-scoped advisory lock per farm + production entity + product + unit (or row lock on an inventory balance table) to serialize competing sales.
4. Compute current available stock from authoritative typed inventory movements, including adjustments; reject a sale that would make stock negative. Legacy untyped records must not be counted.
5. Insert stock deduction and financial sale in the same transaction. Enforce unique transaction reference and return the original result on identical retries; reject conflicting reuse.
6. Keep the existing RLS rules effective; avoid SECURITY DEFINER unless permission checks are explicitly audited.
7. Record the financial sale as **payment unconfirmed**. Payment capture and settlement are separate operations.

## Schema prerequisite
The current `animal_records` sync schema stores inventory metadata inside an encoded `detail` string. Before implementing the RPC, migrate to explicit columns (or an inventory movements table) for `product_key`, `unit`, `movement_type`, `sale_reference` and production-entity identifiers, with a backfill and compatibility strategy. Verify the actual production schema, ownership and farm-membership RLS first. Do not guess table or policy names.

## Client rollout
Keep offline sales in the local journal with an explicit **pending server acceptance** status. On reconnect, send each transaction through the RPC, handle idempotent retries, and surface rejected oversells for manual reconciliation. Do not independently upsert stock/finance rows for RPC-managed sales. Only retire local journal entries after server acceptance and a successful pull.

## Tests required
Concurrent sales for the same stock; repeated identical and conflicting references; unauthorized farm; cross-farm and cross-entity isolation; interrupted network response after server commit; negative-stock prevention; offline replay; old encoded records.
