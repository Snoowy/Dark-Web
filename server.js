import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import registerRouter from './register.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para permitir CORS (ajusta según tus necesidades)
app.use(cors());

// Middleware para parsear datos del body en JSON y URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usa el router de registro
app.use(registerRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
