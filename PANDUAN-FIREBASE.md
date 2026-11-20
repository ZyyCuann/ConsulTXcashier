# Menyalakan database toko (Firebase) — ±10 menit, sekali saja

Setelah ini, semua HP yang memakai **kode toko** yang sama melihat menu, foto, harga, transaksi,
uang keluar, dan laporan yang sama. Aplikasi tetap jalan saat sinyal hilang; perubahan dikirim
otomatis begitu ada internet.

## 1. Buat project Firebase
1. Buka https://console.firebase.google.com dan login dengan akun Google toko.
2. **Add project / Buat project** → beri nama, misalnya `kasir-putraguci`. Google Analytics boleh dimatikan.

## 2. Nyalakan 2 fitur
**a. Login anonim**
- Menu kiri **Build → Authentication** → **Get started**.
- Tab **Sign-in method** → pilih **Anonymous** → **Enable** → Save.

**b. Database Firestore**
- Menu kiri **Build → Firestore Database** → **Create database**.
- Lokasi: pilih **asia-southeast2 (Jakarta)**.
- Mode: pilih **production mode**.
- Setelah jadi, buka tab **Rules**, hapus isinya, tempel ini, lalu **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /toko/{kode}/{koleksi}/{id} {
      allow read, write: if request.auth != null
                         && kode.matches('PG-[A-Z0-9]{4}-[A-Z0-9]{4}');
    }
  }
}
```
Artinya: hanya aplikasi yang tahu kode toko yang bisa membaca/menulis data toko itu, dan
daftar semua toko tidak bisa diintip.

## 3. Ambil konfigurasi & tempel ke aplikasi
1. Klik ikon ⚙ **Project settings** → bagian **Your apps** → klik ikon **Web `</>`**.
2. Nama app bebas (mis. `kasir`). **Jangan** centang Firebase Hosting → **Register app**.
3. Muncul kode berisi `const firebaseConfig = { apiKey: "...", ... }`.
4. Buka file **`firebase-config.js`** di folder aplikasi, ganti semua isian `ISI_...` dengan
   nilai dari langkah 3 (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
   `apiKey` ini memang boleh terlihat publik; yang menjaga data adalah Rules di langkah 2b.

## 4. Upload ulang ke Netlify
Seret folder `kasir-putraguci-pwa` ke https://app.netlify.com/drop (atau ke project Netlify
yang sudah ada: **Deploys → drag & drop**). Pakai alamat yang **sama** seperti sebelumnya
supaya data lama di HP tidak tertinggal.

## 5. Sambungkan HP
**HP pertama (yang sudah berisi menu & foto Anda):**
buka aplikasi → muncul layar *Hubungkan ke database toko* → **Buat toko baru**.
Semua data di HP itu (menu, foto, transaksi, pengaturan) diunggah, lalu muncul **kode toko**
seperti `PG-8HNJ-3D9H`.

> Kalau layar itu tidak muncul (karena dulu pernah memilih "Pakai di HP ini saja"):
> Profil → **Data & cadangan** → **Hubungkan ke database toko**.

**HP lain:** di HP pertama buka Profil → Data & cadangan → **Kirim ke HP lain via WhatsApp**.
Di HP lain, buka link itu → kode sudah terisi → **Gabung ke toko**.
Atau buka aplikasi biasa lalu ketik kodenya.

Selesai. Di header ada tanda status: **✓ Tersinkron**, **↻ Menyinkron**, atau **○ Offline**
(data aman di HP, dikirim saat ada sinyal).

## Yang perlu diketahui
- **Kode toko = kunci.** Siapa pun yang tahu kode bisa membuka data toko. Berikan hanya ke
  karyawan. PIN pemilik tetap berlaku untuk menu, harga, dan hapus data.
- **HP baru butuh internet sekali** saat pertama gabung. Setelah itu boleh offline.
- **Dua HP mengubah hal yang sama bersamaan** (mis. harga menu yang sama): yang terakhir
  tersimpan yang dipakai. Transaksi tidak pernah saling menimpa.
- **Nomor pesanan**: bila dua HP sama-sama offline dan mencatat bersamaan, nomor (A-012)
  bisa kembar. Transaksinya tetap tersimpan terpisah dan total tetap benar.
- **Biaya**: paket gratis Firebase (Spark) cukup untuk warung: 50.000 baca & 20.000 tulis per
  hari, 1 GB data. Transaksi disimpan per hari supaya hemat kuota.
- **Cadangan .json** tetap bisa dipakai sebagai arsip. *Pulihkan* di mode database akan
  mengganti data **di semua HP**.

## Kalau ada masalah
| Tanda | Penyebab umum |
|---|---|
| "Database menolak akses" | Anonymous belum di-Enable, atau Rules belum di-Publish |
| Layar sambung tidak muncul sama sekali | `firebase-config.js` masih berisi `ISI_...`, atau belum upload ulang |
| "Kode toko tidak ditemukan" | Salah ketik kode, atau HP pertama belum selesai *Buat toko baru* |
| Status lama di "Menyinkron" | Sinyal lemah; data tetap aman di HP |
