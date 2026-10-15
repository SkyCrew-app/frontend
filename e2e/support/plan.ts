// The plan of the API under test, as given to it (`stack.sh` passes SKYCREW_PLAN on). Without
// it the API has the default plan, which includes instruction.
export const instructionInPlan = (process.env.SKYCREW_PLAN ?? "").trim().toLowerCase() !== "club"
