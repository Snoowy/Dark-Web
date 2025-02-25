import express from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Configura los pools de conexión a las dos bases de datos
const poolLS = new Pool({
  connectionString: process.env.DB_LS_CONNECTION
});

const poolMS = new Pool({
  connectionString: process.env.DB_MS_CONNECTION
});

// Endpoint de registro
router.post('/register', async (req, res) => {
  try {
    // Obtiene los datos enviados desde el formulario
    const { user, email, password, confirmPassword } = req.body;
    
    // Sanitiza el nombre de usuario (solo caracteres alfanuméricos)
    const username = user.replace(/[^A-Za-z0-9]/g, '');
    if (username.length < 3 || username.length > 19) {
      return res.status(400).json({ error: true, error_msg: "El nombre de usuario no es válido" });
    }
    
    // Verifica que las contraseñas coincidan
    if (password !== confirmPassword) {
      return res.status(400).json({ error: true, error_msg: "Las contraseñas no coinciden" });
    }
    
    const usernameLower = username.toLowerCase();
    
    // Verifica si ya existe el usuario o correo en las bases de datos "ls" y "ms"
    const userCheckLS = await poolLS.query(
      'SELECT * FROM accounts WHERE username = $1 OR email = $2',
      [usernameLower, email]
    );
    const userCheckMS = await poolMS.query(
      'SELECT * FROM tb_user WHERE mid = $1',
      [usernameLower]
    );
    
    if (userCheckLS.rows.length > 0 || userCheckMS.rows.length > 0) {
      return res.status(400).json({ error: true, error_msg: "Ya existe un usuario o correo registrado" });
    }
    
    // Genera el hash MD5 de la contraseña
    const md5Password = crypto.createHash('md5').update(password).digest('hex');
    
    // Inserta en la tabla "accounts" (se asume que realname se iguala a username)
    const queryAccounts = `
      INSERT INTO accounts (username, password, realname, email)
      VALUES ($1, $2, $1, $3)
    `;
    await poolLS.query(queryAccounts, [usernameLower, md5Password, email]);
    
    // Inserta en la tabla "tb_user"
    const queryTBUser = `
      INSERT INTO tb_user (mid, password, pwd, bonus)
      VALUES ($1, $2, $2, '0')
    `;
    await poolMS.query(queryTBUser, [usernameLower, md5Password]);
    
    return res.status(200).json({ error: false, message: "Registro exitoso" });
    
  } catch (error) {
    console.error('Error en el registro:', error);
    return res.status(500).json({ error: true, error_msg: "Error del servidor" });
  }
});

export default router;
