# Audit UI/UX Kasir Putraguci — 5 Nov 2026

Format: lokasi → masalah → dampak → solusi → prioritas. **[Terlihat]** = dibuktikan screenshot/ukuran, **[Diuji]** = diuji otomatis di browser, **[Dugaan]** = belum terverifikasi.

## Temuan (diurutkan menurut dampak)

| # | Lokasi | Masalah | Dampak | Solusi | Prio | Bukti |
|---|---|---|---|---|---|---|
| 1 | Kasir, HP & tablet portrait (≤860px) | Keranjang & tombol Bayar ditaruh di bawah seluruh katalog | Kasir harus scroll jauh untuk melihat total/membayar; rawan lupa item | Bar ringkasan (jumlah item + total) menempel di bawah, membuka lembar Pesanan layar penuh | Tinggi | Terlihat |
| 2 | Semua layar, setiap ketukan | `render()` membangun ulang HTML sehingga posisi scroll katalog/keranjang/halaman berpotensi kembali ke atas | Kasir kehilangan posisi setiap menambah item | Posisi scroll disimpan per wadah (`data-keep`) dan dipulihkan bila layar sama | Tinggi | Diuji (scrollTop 176 → 176) |
| 3 | Header HP | Lima tab terpotong ("Menu |") tanpa petunjuk; pita data contoh + pita transaksi memakan 80px | Navigasi tidak terlihat; ruang kerja sempit | Navigasi bawah 5 ikon+label (<860px); header ringkas berisi judul layar; status data contoh jadi chip | Tinggi | Terlihat |
| 4 | Riwayat, tombol "Kirim WhatsApp" | Teks putih di atas peach | Kontras 1,5:1, tidak terbaca | Tombol sekunder putih/tinta | Tinggi | Dihitung |
| 5 | Riwayat & Peringkat Menu | Nama pesanan/menu dipotong "Paket H…" tanpa akses nama lengkap; HP menyembunyikan kolom cara bayar & resi | Kasir tidak bisa mengenali transaksi | Nama 2 baris + `title`; di HP baris jadi kartu ringkas berisi jam, cara bayar, status resi | Tinggi | Terlihat (49 elemen terpotong → 0–1) |
| 6 | Menu Laris | Scroll bersarang (halaman + daftar `max-height:560px`); panel kanan sempat menimpa | Dua scrollbar, isi tersembunyi | Satu scroll halaman; 10 teratas + "Lihat semua N menu" | Tinggi | Terlihat |
| 7 | Peringkat Menu | Header kolom tidak sejajar data, label "UNTUNG" ambigu, warna batang (pink/ungu/lavender) tanpa makna | Salah baca: dikira laba bersih | `<table>` semantik; "Untung kotor/porsi" + definisi; batang satu warna dengan skala sama; kolom Kelompok berteks (★ Bintang, ! Evaluasi) | Tinggi | Terlihat |
| 8 | Input & tombol sekunder | Garis tepi #EBC9A8 di atas putih | 1,56:1 (< 3:1 untuk batas kontrol) | Token `--control` #9C7A5E (3,92:1) | Sedang | Dihitung |
| 9 | Saran: ikon coral | Glyph putih di atas coral | 2,6:1 | Glyph tinta di atas coral (5,42:1) | Sedang | Dihitung |
| 10 | Status | Beberapa status hanya warna (bar peringkat, "cocok"/"selisih", batang akhir pekan) | Tidak terbaca bagi buta warna | Semua status diberi teks/ikon (✓, !, ★, legenda grafik) | Sedang | Terlihat |
| 11 | Peran warna | Tab aktif & pilihan memakai tinta; pink dipakai untuk akhir pekan; purple, pink, coral muncul acak | Prioritas tidak jelas | Purple = aksi utama/aktif; peach = latar; coral = perhatian; pink = penekanan data (kembalian, jam ramai, ★) | Sedang | Terlihat |
| 12 | Tablet landscape 1024 | Rail kategori + katalog + keranjang 3 kolom sempit | Katalog 3 kolom sempit | <1180px: kategori jadi baris chip di atas katalog | Sedang | Terlihat |
| 13 | Label | Label kapital + letter-spacing di banyak tempat | Lambat dibaca saat bekerja lama | Label sentence case 13px/600 | Rendah | Terlihat |
| 14 | Golden ratio | Proporsi 1,618 dipaksakan, panel diregangkan menutupi isi | Panel kosong/tertimpa | Kolom berdasarkan isi (3fr : 2fr, min 320px), tinggi ikut isi | Sedang | Terlihat |
| 15 | Bayar di layar sempit | Rincian tagihan di atas cara bayar | Aksi bayar jauh | Panel cara bayar didahulukan (total ditampilkan di sampingnya) | Sedang | Terlihat |
| 16 | Modal | Fokus bisa keluar modal; fokus tidak kembali | Pengguna keyboard tersesat | Jebakan fokus Tab/Shift+Tab, Esc menutup, fokus kembali ke pemicu | Sedang | Diuji |
| 17 | HP 360px | Halaman lebar 368px (header min-content) | Scroll horizontal | Kolom grid `minmax(0,1fr)`, judul elipsis | Sedang | Diuji (8px → 0) |
| 18 | Kartu menu tanpa foto | Blok warna 84px tanpa informasi | Membuang ruang | Blok 72px berisi inisial menu; foto tetap bisa diganti | Rendah | Terlihat |
| 19 | Keyboard layar HP | Bar bawah bisa menutupi input | — | `interactive-widget=resizes-content`; belum diuji di perangkat | — | Dugaan |

## Keputusan desain singkat
- **Layout**: Kasir = katalog | keranjang dengan scroll terpisah (total & Bayar selalu terlihat). Laporan & pengaturan = satu scroll halaman. Kolom laporan 3fr : 2fr; di bawah 1100px menjadi satu kolom.
- **Breakpoint dari titik rusak isi**: 1180px (rail kategori → chip), 1100px (laporan 1 kolom, detail Riwayat jadi lembar), 860px (navigasi bawah, keranjang jadi bar + lembar), 600px (tabel peringkat jadi baris ringkas).
- **Spacing**: token 4/8/12/16/24/32; margin halaman 24 → 20 → 16px; jarak dalam kelompok < antarkelompok.
- **Scroll**: tidak ada penyembunyian scrollbar global; hanya katalog & keranjang yang diberi scrollbar tipis + `scrollbar-gutter` di perangkat mouse, agar tidak menimpa nominal.
- **Tipografi**: Poppins dipertahankan; skala 12–13 / 14–15 / 18 / 22 / 28–34px; angka tabular & rata kanan.

## Pengujian yang sudah dijalankan (Chromium/Playwright, simulasi ukuran)
- 360×800, 390×844, 768×1024, 1024×768, 1280×720, 1440×900: tanpa scroll horizontal di semua layar.
- Zoom 200% disimulasikan dengan viewport 640×360: tanpa scroll horizontal.
- Alur: tambah menu → ubah jumlah → bayar tunai (keyboard), QRIS (3 cek), patungan → resi → riwayat → detail; Selesai terkunci sampai SOP terpenuhi.
- Pergantian hari 23.58 → 00.00: hari ditutup & disimpan, nomor kembali A-001; data bertahan setelah muat ulang.
- Kontras dihitung dengan rumus WCAG (lihat tabel di atas).
- Jebakan fokus modal & Esc.

## Belum terverifikasi
- Keyboard layar & safe area pada perangkat fisik (iPad/Android).
- Pembaca layar (TalkBack/VoiceOver).
- Cetak ke printer thermal fisik.
- Mode offline setelah instalasi nyata (service worker sudah diuji jalan di localhost, bukan di perangkat).
