/**
 * Password for the local seed accounts (Fase J, 0.2). The repository never carries it: the seed
 * creates the accounts with a password nobody knows, and the operator sets this one locally.
 */
export const SEED_PASSWORD_MIN_LENGTH = 12;

export function readSeedPassword(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env.SEED_PASSWORD?.trim();
  if (!value) return undefined;
  if (value.length < SEED_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `SEED_PASSWORD must have at least ${SEED_PASSWORD_MIN_LENGTH} characters; seed accounts keep an unknown password otherwise.`,
    );
  }
  return value;
}
