const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Koneksi ke Supabase via Database URL Environment Variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Otomatis buat tabel users jika belum ada
const initDb = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      fullname VARCHAR(100),
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      balance NUMERIC DEFAULT 0,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(queryText);
    console.log("Database & Tabel Users Siap!");
  } catch (err) {
    console.error("Gagal koneksi database:", err);
  }
};
initDb();

// Endpoint Test Healthcheck
app.get('/', (req, res) => {
  res.send('Server MIFX Crypto Berjalan Normal!');
});

// Endpoint Registrasi User
app.post('/api/auth/register', async (req, res) => {
  const { fullname, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (fullname, email, password) VALUES ($1, $2, $3) RETURNING id, fullname, email, balance',
      [fullname, email, hashedPassword]
    );
    res.status(201).json({ message: "Registrasi berhasil!", user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: "Email sudah terdaftar atau data tidak valid." });
  }
});

// Endpoint Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Email tidak ditemukan!" });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Kata sandi salah!" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'mifx_secret', { expiresIn: '1d' });
    res.json({ message: "Login berhasil!", token, user: { id: user.id, fullname: user.fullname, balance: user.balance } });
  } catch (err) {
    res.status(500).json({ error: "Terjadi kesalahan server." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server MIFX berjalan di port ${PORT}`));
