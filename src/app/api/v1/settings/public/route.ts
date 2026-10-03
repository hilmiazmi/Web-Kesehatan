import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { loadSettings } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export function GET(): Promise<NextResponse> {
  return handle(async () => ok(await denganSnapshot((db) => loadSettings(db), "settings__public")));
}
