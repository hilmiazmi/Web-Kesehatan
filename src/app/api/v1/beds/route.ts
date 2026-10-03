import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { loadBeds } from "@/server/db/repo/beds";

export const dynamic = "force-dynamic";

export function GET(): Promise<NextResponse> {
  return handle(async () => ok(await denganSnapshot((db) => loadBeds(db), "/beds")));
}
