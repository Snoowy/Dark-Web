// src/pages/api/register.js
import pkg from 'pg';
const {Pool} = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';
export const prerender = false;
dotenv.config();

const poolLS = new Pool({
  connectionString: process.env.DB_LS_CONNECTION
});

const poolMS = new Pool({
  connectionString: process.env.DB_MS_CONNECTION
});

export async function POST({ request }) {  // Asegurar el uso correcto de Astro API
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: true, error_msg: "Método no permitido" }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const user = formData.get('user');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!user || !email || !password || !confirmPassword) {
      return new Response(JSON.stringify({ error: true, error_msg: "Todos los campos son obligatorios" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const username = user.replace(/[^A-Za-z0-9]/g, '');
    if (username.length < 3 || username.length > 19) {
      return new Response(JSON.stringify({ error: true, error_msg: "El nombre de usuario no es válido" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: true, error_msg: "Las contraseñas no coinciden" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const usernameLower = username.toLowerCase();

    const userCheckLS = await poolLS.query(
      'SELECT 1 FROM accounts WHERE username = $1 OR email = $2',
      [usernameLower, email]
    );
    const userCheckMS = await poolMS.query(
      'SELECT 1 FROM tb_user WHERE mid = $1',
      [usernameLower]
    );

    if (userCheckLS.rowCount > 0 || userCheckMS.rowCount > 0) {
      return new Response(JSON.stringify({ error: true, error_msg: "Ya existe un usuario o correo registrado" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const md5Password = crypto.createHash('md5').update(password).digest('hex');

    await poolLS.query(
      'INSERT INTO accounts (username, password, realname, email) VALUES ($1, $2, $1, $3)',
      [usernameLower, md5Password, email]
    );

    await poolMS.query(
      'INSERT INTO tb_user (mid, password, pwd, bonus) VALUES ($1, $2, $2, 0)',
      [usernameLower, md5Password]
    );

    return new Response(JSON.stringify({ error: false, message: "Registro exitoso" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en el registro:', error);
    return new Response(JSON.stringify({ error: true, error_msg: "Error del servidor" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
