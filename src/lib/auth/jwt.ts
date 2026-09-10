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
 * Signing secret: env-configured, >=16 chars. In production a missing/short
 * secret refuses to boot instead of silently signing forgeable tokens with a
 * well-known fallback.
 */
const JWT_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (>=16 chars) in production — refusing to sign tokens with a fallback.");
  }
  return "nexura-os-dev-secret-change-in-prod";
})();
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
export function generateAccessToken(user: AuthUser, claims?: { jti?: string; staffCode?: string; department?: string; hospitalId?: string; breakGlass?: boolean; linkedPatientId?: string | null }): string {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      name: user.name,
      ...(claims || {}),
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.id,
      type: "refresh",
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/* ---------- Service / product tokens (portal sessions, integrations) ---------- */
/** Sign a scoped service token (e.g. `scope:"portal"`) — never accepted as an nx session. */
export function signServiceToken(payload: Record<string, unknown>, expiresIn: string | number): string {
  return jwt.sign({ ...payload, scope: "service" }, JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/** Verify a service token; rejects tokens without the service scope (cannot be an access token). */
export function verifyServiceToken<T extends object>(token: string): (T & { scope: string }) | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as (T & { scope?: string });
    return decoded && decoded.scope === "service" ? (decoded as T & { scope: string }) : null;
  } catch {
    return null;
  }
}

/* ---------- Token Verification ---------- */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
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

/* ---------- Rate Limiting (in-memory, per-IP) ---------- */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);

  return { allowed, remaining, resetAt: entry.resetTime };
}

export function getRateLimitHeaders(remaining: number, resetAt: number) {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil((resetAt - Date.now()) / 1000)),
  };
}
