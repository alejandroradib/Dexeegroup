/** Fake GoTrue: the /auth/v1 endpoints @supabase/auth-js calls in this app, backed by auth.users. */

import {
  checkPassword,
  createUser,
  deleteUser,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  issueSession,
  listUsers,
  revokeSession,
  toUserJson,
  updateUser,
  type UpdateUserInput,
  type UserRow,
} from "./auth-users";
import { authError, bearerToken, obj, readJson, sendEmpty, sendJson, str } from "./http";
import { verifyJwt } from "./jwt";

import type { IncomingMessage, ServerResponse } from "node:http";

const MIN_PASSWORD = 6;

async function currentUser(req: IncomingMessage): Promise<UserRow | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const claims = verifyJwt(token);
  if (!claims || claims.role !== "authenticated" || typeof claims.sub !== "string") return null;
  return findUserById(claims.sub);
}

function isServiceRole(req: IncomingMessage): boolean {
  const token = bearerToken(req);
  const claims = token ? verifyJwt(token) : null;
  return claims?.role === "service_role";
}

function sessionId(req: IncomingMessage): string | null {
  const token = bearerToken(req);
  const claims = token ? verifyJwt(token) : null;
  return typeof claims?.session_id === "string" ? claims.session_id : null;
}

async function handleToken(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const body = await readJson(req);
  const grant = url.searchParams.get("grant_type");
  if (grant === "password") {
    const email = str(body.email);
    const password = str(body.password);
    if (!email || !password)
      return authError(res, 400, "validation_failed", "email and password are required");
    const user = await findUserByEmail(email);
    if (!user || !checkPassword(password, user.encrypted_password)) {
      return authError(res, 400, "invalid_credentials", "Invalid login credentials");
    }
    if (user.banned_until && user.banned_until.getTime() > Date.now()) {
      return authError(res, 403, "user_banned", "User is banned");
    }
    return sendJson(res, 200, await issueSession(user));
  }
  if (grant === "refresh_token") {
    const refresh = str(body.refresh_token);
    const stored = refresh ? await findRefreshToken(refresh) : null;
    const user = stored ? await findUserById(stored.user_id) : null;
    if (!stored || !user)
      return authError(
        res,
        400,
        "refresh_token_not_found",
        "Invalid Refresh Token: Refresh Token Not Found",
      );
    return sendJson(res, 200, await issueSession(user, stored.session_id));
  }
  return authError(
    res,
    400,
    "unsupported_grant_type",
    `grant_type ${grant ?? "(none)"} is not supported by the demo auth server`,
  );
}

async function handleSignup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  const email = str(body.email);
  const password = str(body.password);
  if (!email || !password)
    return authError(res, 400, "validation_failed", "email and password are required");
  if (password.length < MIN_PASSWORD)
    return authError(
      res,
      422,
      "weak_password",
      `Password should be at least ${MIN_PASSWORD} characters`,
    );
  if (await findUserByEmail(email))
    return authError(res, 422, "user_already_exists", "User already registered");
  const user = await createUser({
    email,
    password,
    confirmed: true,
    userMetadata: obj(body.data) ?? {},
  });
  return sendJson(res, 200, await issueSession(user));
}

async function handleUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const user = await currentUser(req);
  if (!user) return authError(res, 401, "bad_jwt", "invalid claim: missing sub claim");
  if (req.method === "GET") return sendJson(res, 200, await toUserJson(user));
  if (req.method === "PUT") {
    const body = await readJson(req);
    const password = str(body.password);
    if (password !== undefined && password.length < MIN_PASSWORD) {
      return authError(
        res,
        422,
        "weak_password",
        `Password should be at least ${MIN_PASSWORD} characters`,
      );
    }
    const updated = await updateUser(user.id, {
      password,
      email: str(body.email),
      userMetadata: obj(body.data),
    });
    return sendJson(res, 200, updated ? await toUserJson(updated) : {});
  }
  return authError(res, 405, "method_not_allowed", "method not allowed");
}

function adminInput(body: Record<string, unknown>): UpdateUserInput {
  return {
    password: str(body.password),
    email: str(body.email),
    userMetadata: obj(body.user_metadata),
    appMetadata: obj(body.app_metadata),
    banDuration: str(body.ban_duration),
    emailConfirm: body.email_confirm === true,
  };
}

async function handleAdminUsers(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  id: string | undefined,
): Promise<void> {
  if (!isServiceRole(req)) return authError(res, 401, "not_admin", "User not allowed");
  if (!id) {
    if (req.method === "GET") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const perPage = Number(url.searchParams.get("per_page") ?? "50");
      const { users, total } = await listUsers(page, perPage);
      return sendJson(
        res,
        200,
        { users: await Promise.all(users.map(toUserJson)), aud: "authenticated" },
        { "x-total-count": String(total) },
      );
    }
    if (req.method === "POST") {
      const body = await readJson(req);
      const email = str(body.email);
      if (!email) return authError(res, 400, "validation_failed", "email is required");
      if (await findUserByEmail(email))
        return authError(
          res,
          422,
          "email_exists",
          "A user with this email address has already been registered",
        );
      const user = await createUser({
        email,
        password: str(body.password) ?? null,
        confirmed: body.email_confirm === true,
        userMetadata: obj(body.user_metadata) ?? {},
      });
      return sendJson(res, 200, await toUserJson(user));
    }
    return authError(res, 405, "method_not_allowed", "method not allowed");
  }
  const user = await findUserById(id);
  if (!user) return authError(res, 404, "user_not_found", "User not found");
  if (req.method === "GET") return sendJson(res, 200, await toUserJson(user));
  if (req.method === "PUT") {
    const updated = await updateUser(id, adminInput(await readJson(req)));
    return sendJson(res, 200, updated ? await toUserJson(updated) : {});
  }
  if (req.method === "DELETE") {
    await deleteUser(id);
    return sendJson(res, 200, {});
  }
  return authError(res, 405, "method_not_allowed", "method not allowed");
}

async function handleInvite(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isServiceRole(req)) return authError(res, 401, "not_admin", "User not allowed");
  const body = await readJson(req);
  const email = str(body.email);
  if (!email) return authError(res, 400, "validation_failed", "email is required");
  if (await findUserByEmail(email))
    return authError(
      res,
      422,
      "email_exists",
      "A user with this email address has already been registered",
    );
  const user = await createUser({
    email,
    password: null,
    confirmed: false,
    invited: true,
    userMetadata: obj(body.data) ?? {},
  });
  return sendJson(res, 200, await toUserJson(user));
}

/** Routes /auth/v1/<rest>. Returns false when the path is unknown. */
export async function handleAuth(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  rest: string,
): Promise<boolean> {
  const segments = rest.split("/").filter(Boolean);
  const [head, second, third] = segments;
  const method = req.method ?? "GET";

  if (head === "token" && method === "POST") return handleToken(req, res, url).then(() => true);
  if (head === "signup" && method === "POST") return handleSignup(req, res).then(() => true);
  if (head === "user" && segments.length === 1) return handleUser(req, res).then(() => true);
  if (head === "logout" && method === "POST") {
    const sid = sessionId(req);
    if (sid) await revokeSession(sid);
    sendEmpty(res, 204);
    return true;
  }
  if (
    (head === "recover" || head === "resend" || head === "magiclink" || head === "otp") &&
    method === "POST"
  ) {
    await readJson(req);
    sendJson(res, 200, {});
    return true;
  }
  if (head === "settings" && method === "GET") {
    sendJson(res, 200, {
      external: { email: true, phone: false, anonymous_users: false },
      disable_signup: false,
      mailer_autoconfirm: true,
      phone_autoconfirm: false,
      sms_provider: "",
      saml_enabled: false,
    });
    return true;
  }
  if (head === "health" && method === "GET") {
    sendJson(res, 200, {
      version: "demo",
      name: "GoTrue (demo)",
      description: "Fake GoTrue backed by local Postgres",
    });
    return true;
  }
  if (head === "admin" && second === "users" && segments.length <= 3) {
    await handleAdminUsers(req, res, url, third);
    return true;
  }
  if (head === "invite" && method === "POST") return handleInvite(req, res).then(() => true);
  if (head === "admin" && second === "generate_link") {
    authError(res, 501, "not_implemented", "generate_link is not available in the demo stack");
    return true;
  }
  return false;
}
