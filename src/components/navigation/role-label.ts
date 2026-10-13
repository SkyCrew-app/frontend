import i18n from "@/lib/i18n"

// Role names come from the API in French: they are the codes of the labels.
export const roleLabel = (role: string) => i18n.t(`nav:roles.${role}`, { defaultValue: role })
