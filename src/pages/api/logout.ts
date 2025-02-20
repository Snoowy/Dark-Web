// src/pages/api/logout.ts
import type { APIRoute } from "astro";

export const post: APIRoute = async ({ cookies }) => {
  cookies.delete("token", { path: "/" });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
