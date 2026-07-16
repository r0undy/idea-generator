import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildPrdMarkdown,
  toStringArray,
  toTableArray,
  type PrdIdea,
} from "@/lib/prd/generate";

/**
 * PRD download Route Handler: GET /api/ideas/[id]/prd
 *
 * Returns a Kiro-style product spec (markdown) for a single catalog idea as a
 * file download (`prd.md`). Requires an authenticated session; `project_ideas`
 * is authenticated-select under RLS (see 20250101000001_gacha_rls.sql), so the
 * session-aware client is used. Retired ideas are still downloadable (a user
 * may open one from their history), so no `is_active` filter is applied here.
 *
 * Responses: 200 with the markdown, 401 when unauthenticated, 404 when the
 * idea does not exist, 500 on an unexpected query error.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("project_ideas")
    .select("title, tagline, description, rarity_tier, features, data_model, stretch_goals")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "internal" }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "not-found" }, { status: 404 });
  }

  const idea: PrdIdea = {
    title: data.title,
    tagline: data.tagline ?? "",
    description: data.description,
    rarityTier: data.rarity_tier,
    features: toStringArray(data.features),
    dataModel: toTableArray(data.data_model),
    stretchGoals: toStringArray(data.stretch_goals),
  };

  const markdown = buildPrdMarkdown(idea);

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="prd.md"',
      "Cache-Control": "no-store",
    },
  });
}
