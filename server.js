const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// PORT Server Railway
const PORT = process.env.PORT || 3000;

// Database Sementara (In-Memory Database)
// Untuk produksi, hubungkan ke PostgreSQL / MongoDB di Railway
const usersDb = {};

// CONFIGURATION PENGIRIM EMAIL (mifxpt@gmail.com)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mifxpt@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'KODE_16_KARAKTER_APP_PASSWORD' // Masukkan App Password dari Google
  }
});

// Fungsi Mengirim Email Verifikasi
async function sendVerificationEmail(targetEmail, verificationToken) {
  const verifyLink = `https://mifx-backend-production.up.railway.app/api/auth/verify?token=${verificationToken}&email=${encodeURIComponent(targetEmail)}`;

  const mailOptions = {
    from: '"MIFX Crypto Broker" <mifxpt@gmail.com>',
    to: targetEmail,
    subject: 'Verifikasi Akun MIFX Crypto Broker Anda',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0b0e14; color: #ffffff; border-radius: 8px;">
        <h2 style="color: #22c55e;">Selamat Datang di MIFX Crypto Broker!</h2>
        <p style="color: #d1d5db;">Terima kasih telah mendaftar. Silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda agar dapat mulai berinvestasi dan trading:</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000000; font-weight: bold; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verifikasi Akun Saya</a>
        <p style="font-size: 12px; color: #9ca3af;">Atau salin tautan berikut ke browser Anda:<br><a href="${verifyLink}" style="color: #3b82f6;">${verifyLink}</a></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// 1. ENDPOINT REGISTER
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi!' });
  }

  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Simpan data user dengan status is_verified = false
  usersDb[email.toLowerCase()] = {
    email: email.toLowerCase(),
    password: password,
    balance: 0,
    is_verified: false,
    verify_token: token
  };

  try {
    await sendVerificationEmail(email, token);
    res.status(200).json({ 
      message: 'Registrasi berhasil! Email verifikasi telah dikirim dari mifxpt@gmail.com. Silakan periksa inbox kamu.' 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Gagal mengirim email verifikasi. Periksa App Password Gmail.' });
  }
});

// 2. ENDPOINT VERIFIKASI EMAIL VIA LINK
app.get('/api/auth/verify', (req, res) => {
  const { token, email } = req.query;
  const user = usersDb[email?.toLowerCase()];

  if (user && user.verify_token === token) {
    user.is_verified = true;
    res.send(`
      <div style="text-align: center; font-family: sans-serif; padding: 50px; background: #0b0e14; color: #fff; height: 100vh;">
        <h1 style="color: #22c55e;">Verifikasi Berhasil!</h1>
        <p>Email kamu (${email}) telah terverifikasi. Silakan kembali ke website MIFX Crypto untuk login.</p>
      </div>
    `);
  } else {
    res.status(400).send('Token verifikasi tidak valid atau telah kadaluarsa.');
  }
});

// 3. ENDPOINT LOGIN (HANYA BISA JIKA IS_VERIFIED === TRUE)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = usersDb[email?.toLowerCase()];

  if (!user || user.password !== password) {
    return res.status(400).json({ message: 'Email atau password salah!' });
  }

  if (!user.is_verified) {
    return res.status(401).json({ message: 'Email kamu belum diverifikasi! Silakan cek inbox email kamu terlebih dahulu.' });
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
