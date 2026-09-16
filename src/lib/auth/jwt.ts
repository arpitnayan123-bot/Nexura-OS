import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

/* ============================================================
   NEXURA OS — AUTH LIBRARY
   Production-grade JWT authentication with RBAC.

   Features:
   - Password hashing (bcrypt, 12 rounds)
   - JWT access tokens (15 min expiry)
   - JWT refresh tokens (30 days expiry)
   - Role-based access control (RBAC)
   - Request verification middleware
   - Rate limiting (in-memory, per-IP)
   ============================================================ */

/**
 * Signing secret: env-configured, >=16 chars — resolved LAZILY on the first
 * sign/verify call, never at module evaluation (vercel-deploy-2).
 *
 * Why lazy: `next build` imports every route module in production mode to
 * collect page data — WITHOUT runtime secrets — so a module-eval throw killed
 * builds that were actually fine. Nothing is ever signed during a build, so
 * deferring resolution to first use loses no security: in production the
 * first sign/verify still refuses to run without a real secret (same error,
 * same fail-fast), and instrumentation's assertProductionEnv aborts a
 * misconfigured production boot before any traffic is served.
 */
let cachedSecret: string | null = null;
export function jwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) {
    cachedSecret = s;
    return s;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (>=16 chars) in production — refusing to sign tokens with a fallback.");
  }
  cachedSecret = "nexura-os-dev-secret-change-in-prod";
  return cachedSecret;
}
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";

/* ---------- Types ---------- */
export type Role = "doctor" | "nurse" | "admin" | "receptionist" | "lab" | "pharmacist" | "patient" | "super_admin";

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: Role;
  department?: string;
  hospitalId?: string;
  avatar?: string;
}

export interface DecodedToken {
  userId: string;
  role: Role;
  name: string;
  iat: number;
  exp: number;
}

/* ---------- Password Hashing ---------- */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ---------- Token Generation ---------- */
export function generateAccessToken(user: AuthUser, claims?: { jti?: string; staffCode?: string; department?: string; hospitalId?: string; breakGlass?: boolean; linkedPatientId?: string | null }, expiresIn: string = ACCESS_TOKEN_EXPIRY): string {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      name: user.name,
      ...(claims || {}),
    },
    jwtSecret(),
    { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] }
  );
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.id,
      type: "refresh",
    },
    jwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/* ---------- Service / product tokens (portal sessions, integrations) ---------- */
/** Sign a scoped service token (e.g. `scope:"portal"`) — never accepted as an nx session. */
export function signServiceToken(payload: Record<string, unknown>, expiresIn: string | number): string {
  return jwt.sign({ ...payload, scope: "service" }, jwtSecret(), {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/** Verify a service token; rejects tokens without the service scope (cannot be an access token). */
export function verifyServiceToken<T extends object>(token: string): (T & { scope: string }) | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as (T & { scope?: string });
    return decoded && decoded.scope === "service" ? (decoded as T & { scope: string }) : null;
  } catch {
    return null;
  }
}

/* ---------- Token Verification ---------- */
/** Verify an ACCESS token. Rejects tokens of a different token family —
 *  a 30-day `type:"refresh"` token or a `scope:"service"` integration token
 *  must never authenticate as an access identity (historically they did). */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as DecodedToken & { type?: string; scope?: string };
    if (decoded.type === "refresh" || decoded.scope === "service") return null;
    return decoded;
  } catch {
    return null;
  }
}

/* ---------- Session Management ---------- */
export function setSessionCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  // Access token — httpOnly, short-lived
  res.cookies.set("nexura_access", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 minutes
    path: "/",
  });

  // Refresh token — httpOnly, long-lived
  res.cookies.set("nexura_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.delete("nexura_access");
  res.cookies.delete("nexura_refresh");
}

/* ---------- Request Authentication ---------- */
export function getAuthUser(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieToken = req.cookies.get("nexura_access")?.value;
  const token = bearerToken || cookieToken;

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  return {
    id: decoded.userId,
    role: decoded.role,
    name: decoded.name,
  };
}

/* ---------- Role-Based Access Control ---------- */
export function hasPermission(userRole: Role, requiredRoles: Role[]): boolean {
  if (userRole === "super_admin") return true;
  return requiredRoles.includes(userRole);
}

export function requireAuth(requiredRoles?: Role[]) {
  return (req: NextRequest): { user: AuthUser | null; error?: NextResponse } => {
    const user = getAuthUser(req);

    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        ),
      };
    }

    if (requiredRoles && !hasPermission(user.role, requiredRoles)) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "Forbidden", message: "Insufficient permissions" },
          { status: 403 }
        ),
      };
    }

    return { user };
  };
}

/* ---------- Rate Limiting ----------
   Moved to the Redis-backed distributed limiter (src/lib/rate-limit.ts)
   — per-process Maps cannot bound a horizontally scaled deployment
   (stateless-1). getRateLimitHeaders stays here: it is pure formatting. */

export function getRateLimitHeaders(remaining: number, resetAt: number) {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil((resetAt - Date.now()) / 1000)),
  };
}
