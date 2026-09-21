/** Team invitations expire (audit C7): a leaked link must stop working on its own. */
export const INVITE_TTL_DAYS = 7;

export function inviteExpiryFrom(now: Date = new Date()): string {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 3600 * 1000).toISOString();
}

/** Usable = never accepted and not past its expiry. Legacy rows without an expiry are refused. */
export function inviteIsUsable(
  invite: { accepted_at: string | null; invite_expires_at: string | null },
  now: Date = new Date(),
): boolean {
  if (invite.accepted_at) return false;
  if (!invite.invite_expires_at) return false;
  return new Date(invite.invite_expires_at).getTime() > now.getTime();
}
