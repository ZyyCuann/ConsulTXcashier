# Kasir Putraguci (PWA)

Aplikasi kasir tablet untuk RM. Padang Putraguci. Jalan offline, data tersimpan di tablet,
jam mengikuti WIB, dan hari ditutup & dibuka otomatis pukul 00.00.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Tampilan & gaya (palet peach–coral–pink–ungu, Poppins) |
| `app.js` | Semua logika: kasir, pembayaran, resi, laporan, siklus hari, penyimpanan |
| `sw.js` | Service worker supaya bisa dipakai tanpa internet |
| `manifest.webmanifest` + `icon-*.png` | Supaya bisa di-install ke layar utama |

## Cara online-kan (gratis, ±2 menit)
**Netlify Drop (paling mudah)**
1. Buka https://app.netlify.com/drop
2. Seret folder ini (`kasir-putraguci-pwa`) ke halaman itu.
3. Dapat alamat seperti `https://nama-acak.netlify.app` — itu alamat aplikasinya.

**GitHub Pages (alternatif)**: unggah isi folder ke repo baru → Settings → Pages → Deploy from branch `main` / root.

> PWA wajib dibuka lewat **https** (bukan dibuka langsung dari file) agar bisa di-install & offline.

## Cara install di tablet
1. Buka alamat tadi di **Chrome** (Android) / **Safari** (iPad).
2. Chrome: ⋮ → **Instal aplikasi**. Safari: Bagikan → **Tambah ke Layar Utama**.
3. Buka dari ikon **Kasir PG**. Setelah sekali dibuka, internet boleh mati.

## Logika hari (real-time)
- Jam di header berjalan per detik (zona Asia/Jakarta).
- Tiap menit, saat aplikasi dibuka, dan saat tablet bangun dari layar mati, aplikasi mengecek tanggal.
- Bila tanggal berganti: hari lama **ditutup otomatis & disimpan** (total, tunai, QRIS, transaksi, porsi),
  hari baru **dibuka**, keranjang dikosongkan, nomor pesanan kembali ke **A-001**, dan muncul ringkasan hari kemarin.
- Bila tablet mati semalaman, penutupan dikerjakan saat aplikasi dibuka berikutnya.
- **Tutup hari manual** (layar Hari Ini) mencatat hasil hitung laci, selisih, dan sisa ayam. Penutupan manual
  tidak ditimpa penutupan otomatis. Tombol **Buka lagi** tersedia bila masih ada pembeli.

## Pertama kali dibuka
Aplikasi otomatis berisi **data contoh 30 hari** supaya laporan langsung terisi untuk demo.
Hapus di **Profil (logo PG) → Data & cadangan → Hapus data contoh** sebelum dipakai sungguhan.

## Wajib dilakukan sebelum uji coba
- Ganti **PIN pemilik** (awal `1234`) di Profil → Kasir & PIN.
- Isi **alamat & WA toko**, **modal awal laci**, dan cek **modal per porsi** tiap menu bersama Ibu Yuli.
- Cadangkan data rutin (Profil → Data & cadangan → Cadangkan) ke Google Drive.

## Catatan
- Cetak resi memakai dialog cetak perangkat (printer thermal 58 mm yang terhubung ke tablet).
- Kirim resi WhatsApp membuka aplikasi WhatsApp dengan teks resi siap kirim.
- Data hanya ada di tablet tersebut; tidak tersinkron ke perangkat lain.
