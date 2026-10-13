import type { ZodIssue } from "zod"
import i18n from "@/lib/i18n"

// The shared schemas carry French messages: the sign-in pages word the issue
// themselves, from the field and the kind of problem.
export const authIssueMessage = (issue: ZodIssue) => {
  const kind = issue.code === "too_small" ? "required" : "invalid"
  return i18n.t(`auth:validation.${String(issue.path[0])}.${kind}`, { defaultValue: issue.message })
}
