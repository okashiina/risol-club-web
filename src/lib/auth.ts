import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "risol-club-session";

function readSellerEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (process.env.VERCEL_ENV) {
    throw new Error(`${name} must be configured on Vercel deployments.`);
  }

  return fallback;
}

function getSecret() {
  return readSellerEnv("SELLER_SESSION_SECRET", "risol-club-dev-secret");
}

function getSellerEmail() {
  return readSellerEnv("SELLER_EMAIL", "owner@risolclub.local");
}

function getSellerPassword() {
  return readSellerEnv("SELLER_PASSWORD", "risolclub123");
}

function sign(email: string) {
  return createHmac("sha256", getSecret()).update(email).digest("hex");
}

function encodeEmail(email: string) {
  return Buffer.from(email, "utf8").toString("base64url");
}

function decodeEmail(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createToken(email: string) {
  return `${encodeEmail(email)}.${sign(email)}`;
}

function verifyToken(token: string) {
  const separatorIndex = token.lastIndexOf(".");

  if (separatorIndex === -1) {
    return false;
  }

  const encodedEmail = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!encodedEmail || !signature) {
    return false;
  }

  let email: string;

  try {
    email = decodeEmail(encodedEmail);
  } catch {
    return false;
  }

  if (!email) {
    return false;
  }

  const expected = Buffer.from(sign(email));
  const actual = Buffer.from(signature);

  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export async function loginSeller(email: string, password: string) {
  const isValid =
    email.toLowerCase() === getSellerEmail().toLowerCase() &&
    password === getSellerPassword();

  if (!isValid) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return true;
}

export async function logoutSeller() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isSellerAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  return session ? verifyToken(session) : false;
}

export async function requireSellerSession() {
  const authenticated = await isSellerAuthenticated();
  if (!authenticated) {
    redirect("/seller/login");
  }
}
