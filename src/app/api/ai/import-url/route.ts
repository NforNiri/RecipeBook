import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/db/server";
import { parseSchemaOrg } from "@/lib/ai/schema-org";
import { extractRecipeFromHtml } from "@/lib/ai/gemini";
import { runAiJob } from "@/lib/ai/jobs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Input validation ──────────────────────────────────────────────────
  let url: string;
  try {
    const body = await req.json();
    url = body?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
    }
    new URL(url); // throws if malformed
  } catch {
    return NextResponse.json({ error: "Invalid request body or URL" }, { status: 400 });
  }

  // ── Fetch HTML ─────────────────────────────────────────────────────────
  let html: string;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[import-url] fetch failed: HTTP ${res.status} for ${url}`);
      return NextResponse.json(
        { error: `Could not fetch this page (HTTP ${res.status}). The site may be blocking automated access — try copying the recipe text manually.` },
        { status: 422 }
      );
    }
    html = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error(`[import-url] fetch threw: ${message} for ${url}`);
    return NextResponse.json(
      { error: `Failed to reach that URL: ${message}` },
      { status: 422 }
    );
  }

  // ── Schema.org fast path ──────────────────────────────────────────────
  const schemaResult = parseSchemaOrg(html);
  if (schemaResult) {
    // Populate source provenance and return immediately — no AI call needed.
    schemaResult.sourceType = "url";
    schemaResult.sourceValue = url;
    return NextResponse.json(schemaResult);
  }

  // ── Gemini fallback ───────────────────────────────────────────────────
  try {
    const result = await runAiJob({
      userId: user.id,
      jobType: "url_import",
      input: { url },
      fn: () => extractRecipeFromHtml(html),
    });

    if (!result) {
      console.error(`[import-url] Gemini returned null for ${url}`);
      return NextResponse.json(
        { error: "Could not extract a recipe from this page. The page may not contain a recipe, or it may be in an unsupported format." },
        { status: 422 }
      );
    }

    result.sourceType = "url";
    result.sourceValue = url;
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI extraction failed";
    console.error(`[import-url] extraction error for ${url}:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
