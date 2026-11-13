/** Confidential answers are not written to browser storage unless a person chooses it. */
export const LOCAL_DRAFT_POLICY = {
  autoSave: false,
  requiresExplicitAction: true,
  storageKeyPrefix: "myos-studio-explicit-draft:",
} as const;
