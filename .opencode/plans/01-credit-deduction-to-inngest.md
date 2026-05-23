# Plan: Move credit deduction + regenerate into Inngest

## Goals
1. Remove credit deduction from action layer (`postFileIds`, `regenerateDescription`)
2. Move deduction inside Inngest `step.run` DB transaction (atomic with save)
3. Convert `regenerateDescription` from sync AI call to async Inngest event
4. Fix batch polling: keep old data visible during regenerate, swap in-place on completion

## Event payload

```ts
// Before
{ fileId: string, descriptionId: string }

// After
{ fileId: string, descriptionId: string, userId: string, cost: number, mode: "generate" | "regenerate" }
```

## Files changed

### `src/inngest/describe-image.ts`
Restructure into steps:
1. `step.ai.wrap` — OpenAI call (cached on retry)
2. `step.run` — atomic DB transaction: FOR UPDATE lock, deduct + audit, save AI result
   - if `mode === "generate"`: batch-completion check, fetch titles if complete
3. (conditional) `step.ai.wrap` — batch title
4. (conditional) `step.run` — insert batch row

### `src/actions/postFileIds.ts`
- Remove `deductCredits` import + call
- Update `sendEvent()` payload with `userId`, `cost`, `mode: "generate"`
- Keep rollback (DB cleanup + UploadThing delete) unchanged

### `src/actions/updateDescription.ts`
- `regenerateDescription`: replace sync AI call + deduction + DB update with ownership check + event dispatch
- `updateDescription` (edit): unchanged

### `src/components/ImageDescriptions.svelte`
- Add `pollRegenerate(descId)`: calls `getBatch(batchId)` on 5s timer, updates `descriptions` in-place, no spinner gate
- `regenerate()`: dispatch event → call `pollRegenerate(id)`
- Old data stays visible during regeneration — no skeleton states

## Not doing
- Per-card skeleton for regenerate
- New `checkDescriptionStatus` action
- `formatTokens` extraction (separate concern)
- DB types split (separate concern)
