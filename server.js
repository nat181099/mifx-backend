const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// PORT Server Railway
const PORT = process.env.PORT || 3000;

// Database Sementara (In-Memory Database)
const usersDb = {};

// 1. ENDPOINT REGISTER (OTOMATIS LANGSUNG AKTIF / VERIFIED)
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi!' });
  }

  // Simpan data user langsung dengan status is_verified = true
  usersDb[email.toLowerCase()] = {
    email: email.toLowerCase(),
    password: password,
    balance: 0,
    is_verified: true,
    verify_token: null
  };

  return res.status(200).json({ 
    message: 'Registrasi berhasil! Akun Anda telah aktif, silakan login.',
    user: { email: email.toLowerCase(), balance: 0 }
  });
});

// 2. ENDPOINT VERIFIKASI (CADANGAN)
app.get('/api/auth/verify', (req, res) => {
  res.send(`
    <div style="text-align: center; font-family: sans-serif; padding: 50px; background: #0b0e14; color: #fff; height: 100vh;">
      <h1 style="color: #22c55e;">Akun Sudah Aktif!</h1>
      <p>Silakan kembali ke website MIFX Crypto untuk login.</p>
    </div>
  `);
});

// 3. ENDPOINT LOGIN
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = usersDb[email?.toLowerCase()];

  if (!user || user.password !== password) {
    return res.status(400).json({ message: 'Email atau password salah!' });
  }

  res.status(200).json({
    message: 'Login berhasil',
    user: { email: user.email, balance: user.balance }
  });
});

// 4. ENDPOINT ADMIN UPDATE SALDO PELANGGAN
app.post('/api/admin/update-balance', (req, res) => {
  const { email, amount, type } = req.body;
  const user = usersDb[email?.toLowerCase()];

  if (!user) {
    return res.status(404).json({ message: 'Pengguna dengan email tersebut tidak ditemukan di database.' });
  }

  if (type === 'add') {
    user.balance += parseFloat(amount);
  } else if (type === 'subtract') {
    user.balance = Math.max(0, user.balance - parseFloat(amount));
  }

  res.status(200).json({ 
    message: 'Saldo berhasil diperbarui', 
    newBalance: user.balance 
  });
});

app.listen(PORT, () => {
  console.log(`Server MIFX Backend berjalan di port ${PORT}`);
});
