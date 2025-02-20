// src/pages/api/login.ts
import type { APIRoute } from "astro";
import { Client } from "pg";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const post: APIRoute = async ({ request, cookies }) => {
  try {
    const { account, password } = await request.json();
    if (!account || !password) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
    }
    
    // Calcula el hash MD5 del password
    const hash = crypto.createHash("md5").update(password).digest("hex");

    // Conexión a la base de datos (asegúrate de configurar la variable DATABASE_URL o adapta la conexión)
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "postgres://usuario:contraseña@localhost:5432/gf_ms",
    });
    await client.connect();

    // Consulta parametrizada usando "mid" como account
    const res = await client.query(
      "SELECT mid, pvalues, bonus, password FROM tb_user WHERE mid = $1",
      [account]
    );
    await client.end();

    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });
    }

    const user = res.rows[0];
    // Valida el hash recibido con el almacenado en la base (se asume que "password" guarda el MD5)
    if (user.password !== hash) {
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401 });
    }

    // Genera un token JWT (configura JWT_SECRET en tus variables de entorno)
    const token = jwt.sign(
      { mid: user.mid, pvalues: user.pvalues, bonus: user.bonus },
      process.env.JWT_SECRET || "clave-secreta",
      { expiresIn: "1h" }
    );

    // Guarda el token en una cookie httpOnly
    cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 3600,
    });

    return new Response(
      JSON.stringify({ success: true, user: { mid: user.mid, pvalues: user.pvalues, bonus: user.bonus } }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};
