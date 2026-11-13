import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ServiceError } from "./services";

export const SESSION_COOKIE = "myos_studio_session";

export function json(data: unknown, status = 200, token?: string): NextResponse {
  const response = NextResponse.json(data, { status });
  if (token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 14,
    });
  }
  return response;
}

export function fail(error: unknown): NextResponse {
  if (error instanceof ServiceError) return json({ error: error.code }, error.status);
  console.error("studio_request_failed");
  return json({ error: "server_error" }, 500);
}

export async function sessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}
