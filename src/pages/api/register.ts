// src/pages/api/register.ts
import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import pkg from 'pg';
const {Pool} = pkg;
export const prerender = false;

// Configura las conexiones a tus bases de datos usando variables de entorno
const poolLS = new Pool({
  connectionString: process.env.DATABASE_URL_LS,
});

const poolMS = new Pool({
  connectionString: process.env.DATABASE_URL_MS,
});

export const post: APIRoute = async ({ request }) => {
  try {
    // Parsear los datos del formulario
    const formData = await request.formData();
    const modo = formData.get('modo')?.toString();
    if (modo !== 'REGISTRO') {
      return new Response('Modo no soportado', { status: 400 });
    }

    let username = formData.get('user')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    // Sanitizar el nombre de usuario: eliminar caracteres no alfanuméricos
    username = username.replace(/[^A-Za-z0-9]/g, '');

    // Validar longitud del nombre de usuario
    if (username.length <= 2 || username.length >= 20) {
      return new Response(
        JSON.stringify({ error: true, error_msg: "El nombre de usuario no es válido" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generar hash MD5 de la contraseña
    const md5Password = createHash('md5').update(password).digest('hex');

    // Conectarse a ambas bases de datos
    const clientLS = await poolLS.connect();
    const clientMS = await poolMS.connect();

    try {
      // Verificar si ya existe el usuario o correo en la base LS
      const resUsernameLS = await clientLS.query(
        'SELECT * FROM accounts WHERE username = $1',
        [username.toLowerCase()]
      );
      const resEmailLS = await clientLS.query(
        'SELECT * FROM accounts WHERE email = $1',
        [email]
      );

      // Verificar si ya existe el usuario en la base MS
      const resUserMS = await clientMS.query(
        'SELECT * FROM tb_user WHERE mid = $1',
        [username.toLowerCase()]
      );

      if ((resUsernameLS.rowCount ?? 0) > 0 || (resEmailLS.rowCount ?? 0) > 0 || (resUserMS.rowCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: true, error_msg: "Ya existe un usuario o correo registrado" }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Obtener el siguiente id disponible en la tabla accounts
      const resCount = await clientLS.query('SELECT COUNT(*) FROM accounts');
      let next_id = parseInt(resCount.rows[0].count, 10) + 1;

      // Asegurar que next_id sea único
      let resExists = await clientLS.query('SELECT * FROM accounts WHERE id = $1', [next_id]);
      while ((resExists.rowCount ?? 0) > 0) {
        next_id++;
        resExists = await clientLS.query('SELECT * FROM accounts WHERE id = $1', [next_id]);
      }

      // Insertar el nuevo usuario en la tabla accounts (LS)
      await clientLS.query(
        'INSERT INTO accounts (id, username, password, realname, email) VALUES ($1, $2, $3, $2, $4)',
        [next_id, username.toLowerCase(), md5Password, email]
      );

      // Insertar el nuevo usuario en la tabla tb_user (MS)
      await clientMS.query(
        'INSERT INTO tb_user (mid, password, pwd, bonus) VALUES ($1, $2, $2, $3)',
        [username.toLowerCase(), md5Password, '0']
      );

      // Registro exitoso: redirigir a /login
      return new Response(
        JSON.stringify({ success: true, message: "Usuario registrado con éxito" }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      // Liberar las conexiones
      clientLS.release();
      clientMS.release();
    }
  } catch (error) {
    console.error('Error en el registro:', error);
    return new Response(
      JSON.stringify({ error: true, error_msg: "Error en el registro" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
