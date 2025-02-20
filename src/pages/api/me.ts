  // src/pages/api/me.ts
import type { APIRoute } from "astro";
import jwt from "jsonwebtoken";

export const get: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get("token")?.value;
    if (!token) {
      return new Response(JSON.stringify({ user: null }), { status: 200 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "clave-secreta");
    return new Response(JSON.stringify({ user: decoded }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ user: null }), { status: 200 });
  }
};
