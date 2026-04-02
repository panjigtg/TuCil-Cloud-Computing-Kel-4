import { NextRequest, NextResponse } from "next/server";

/**
 * Dynamic GAS Proxy — forward request ke GAS URL manapun.
 * Ini dipakai untuk cross-GAS check-in ke kelompok lain.
 *
 * Body: { gas_url: string, path: string, method: "GET" | "POST", payload?: object }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gas_url, path, method, payload, query } = body;

    if (!gas_url) {
      return NextResponse.json(
        { ok: false, error: "gas_url is required" },
        { status: 400 }
      );
    }

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "path is required" },
        { status: 400 }
      );
    }

    // Build the GAS URL
    const params = new URLSearchParams({ path });
    if (query && typeof query === "object") {
      Object.entries(query).forEach(([k, v]) => {
        params.set(k, String(v));
      });
    }
    const url = `${gas_url}?${params.toString()}`;

    console.log(`[GAS Proxy Dynamic] ${method || "POST"} ${url}`);

    let res: Response;

    if (method === "GET") {
      res = await fetch(url, { redirect: "manual" });
    } else {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload || {}),
        redirect: "manual",
      });
    }

    const text = await followGasRedirect(res);
    console.log("[GAS Proxy Dynamic] Response:", text.substring(0, 300));
    return parseJsonResponse(text);
  } catch (err) {
    console.error("[GAS Proxy Dynamic] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Proxy error" },
      { status: 500 }
    );
  }
}
