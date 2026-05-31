# Panduan Integrasi Google Workspace (Production) & Sinkronisasi Database

Dokumen ini menjelaskan langkah-langkah yang diperlukan untuk mematikan mode simulasi/demo dan menghubungkan **Google Calendar**, **Gmail**, dan **Google Drive** secara riil menggunakan akun Google aktif di lingkungan production (produksi).

---

## 1. Konfigurasi Google Cloud Console

Untuk menggunakan integrasi Google di domain production Anda, Anda harus memperbarui pengaturan OAuth Client ID di **Google Cloud Console**:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih project Google Cloud yang Anda gunakan.
3. Masuk ke menu **APIs & Services** > **Credentials**.
4. Klik ikon edit pada **OAuth 2.0 Client IDs** yang Anda gunakan.
5. Di bagian **Authorized JavaScript origins**, tambahkan URL production Anda:
   - `https://nama-domain-anda.com`
   - `https://alamat-app.vercel.app` (Jika menggunakan Vercel)
6. Di bagian **Authorized redirect URIs**, tambahkan callback URI jika menggunakan login server-side NextAuth:
   - `https://nama-domain-anda.com/api/auth/callback/google`
7. Klik **Save**.

> [!IMPORTANT]
> Google Identity Services (GIS) tokenClient membutuhkan otorisasi asal (Origins) yang tepat. Jika asal tidak cocok dengan URL yang diakses oleh browser, GIS akan menolak otentikasi.

---

## 2. OAuth Consent Screen (Layar Persetujuan)

Agar pengguna lain (atau akun uji coba) dapat terhubung tanpa melihat peringatan keamanan "App not verified":

1. Masuk ke **APIs & Services** > **OAuth consent screen**.
2. Pastikan Anda menambahkan scopes berikut:
   - `.../auth/calendar.events` (Mengelola agenda di Kalender)
   - `.../auth/gmail.send` (Mengirim email atas nama pengguna)
   - `.../auth/gmail.readonly` (Membaca status email jika diperlukan)
   - `.../auth/drive.file` (Membuat berkas baru di Google Drive)
3. Jika status publikasi adalah **Testing**, pastikan Anda mendaftarkan email Google yang ingin digunakan untuk pengujian ke daftar **Test Users**.

---

## 3. Variabel Lingkungan (Environment Variables)

Saat mendeploy aplikasi ke platform hosting Anda (seperti Vercel, Netlify, atau VPS), pastikan variabel lingkungan berikut telah ditambahkan di panel konfigurasi:

| Nama Variabel | Deskripsi |
| :--- | :--- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Client ID dari Google Cloud Console (wajib berawalan `NEXT_PUBLIC_` agar dapat dibaca di sisi browser). |
| `GOOGLE_CLIENT_SECRET` | Client Secret rahasia untuk autentikasi server-side. |
| `DATABASE_URL` | Koneksi database PostgreSQL utama (Supabase). |
| `DIRECT_URL` | Koneksi langsung PostgreSQL Supabase (untuk migrasi Prisma). |
| `GEMINI_API_KEY` | API Key Gemini resmi dari Google AI Studio. |

---

## 4. Cara Pengujian Alur Riil

1. Akses aplikasi Anda via HTTPS (misal: `https://nama-domain-anda.com`).
2. Masuk ke halaman **Workspace** / **Integrasi**.
3. Klik tombol **Hubungkan Google**.
4. Pop-up Google Account Chooser akan muncul secara riil meminta izin otorisasi untuk Calendar, Gmail, dan Drive.
5. Setelah terhubung, coba lakukan ekspor agenda promosi ke Kalender atau kirim email notifikasi — data akan langsung masuk ke akun Google Anda, bukan lagi simulasi demo.
