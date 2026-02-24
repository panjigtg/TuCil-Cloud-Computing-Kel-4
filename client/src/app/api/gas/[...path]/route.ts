import { NextRequest, NextResponse } from "next/server";

const GAS_BASE_URL = process.env.NEXT_PUBLIC_GAS_BASE_URL ?? "";

/**
 * GAS routing: query parameter `?path=presence/qr/generate`
 * POST body: JSON payload (tanpa field path)
 * GAS selalu 302 redirect — handle manual.
 */

async function followGasRedirect(response: Response): Promise<string> {
  if ([301, 302, 307].includes(response.status)) {
    const location = response.headers.get("location");
    if (location) {
      const res = await fetch(location, { redirect: "follow" });
      return await res.text();
    }
  }
  return await response.text();
}

function parseJsonResponse(text: string) {
  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { ok: false, error: `GAS returned non-JSON: ${text.substring(0, 300)}` },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // GAS expects path WITHOUT leading slash: "presence/status"
  const gasPath = path.join("/");

  // Forward all query params + add path
  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set("path", gasPath);
  const url = `${GAS_BASE_URL}?${searchParams.toString()}`;

  console.log("[GAS Proxy] GET", url);
  try {
    const res = await fetch(url, { redirect: "manual" });
    const text = await followGasRedirect(res);
    console.log("[GAS Proxy] Response:", text.substring(0, 300));
    return parseJsonResponse(text);
  } catch (err) {
    console.error("[GAS Proxy] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Proxy error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const gasPath = path.join("/");
  const body = await request.text();

  // Path as query param, body as-is (no path injected)
  const url = `${GAS_BASE_URL}?path=${encodeURIComponent(gasPath)}`;

  console.log("[GAS Proxy] POST", url, body);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      redirect: "manual",
    });
    const text = await followGasRedirect(res);
    console.log("[GAS Proxy] Response:", text.substring(0, 300));
    return parseJsonResponse(text);
  } catch (err) {
    console.error("[GAS Proxy] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Proxy error" },
      { status: 500 }
    );
  }
}
