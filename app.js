/* Kasir Putraguci — PWA
 * Semua data tersimpan di perangkat (IndexedDB). Waktu mengikuti Asia/Jakarta.
 * Pergantian hari: hari lama ditutup & disimpan otomatis, hari baru dibuka.
 */
'use strict';

/* =========================================================
   1. UTILITAS: format, waktu, terbilang
   ========================================================= */
const TZ = 'Asia/Jakarta';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => (n < 0 ? '-Rp' : 'Rp') + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const rpPlain = n => rp(n).replace('Rp', '');
function rps(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  const dec = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  if (a >= 1e6) return `${s}Rp${dec(a / 1e6)} jt`;
  if (a >= 1e3) return `${s}Rp${Math.round(a / 1e3)} rb`;
  return `${s}Rp${a}`;
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function terbilang(n) {
  n = Math.floor(Math.abs(n));
  if (!n) return 'nol';
  const t = x => {
    if (x < 12) return SAT[x];
    if (x < 20) return `${SAT[x - 10]} belas`;
    if (x < 100) return `${SAT[Math.floor(x / 10)]} puluh ${t(x % 10)}`;
    if (x < 200) return `seratus ${t(x - 100)}`;
    if (x < 1000) return `${SAT[Math.floor(x / 100)]} ratus ${t(x % 100)}`;
    if (x < 2000) return `seribu ${t(x - 1000)}`;
    if (x < 1e6) return `${t(Math.floor(x / 1000))} ribu ${t(x % 1000)}`;
    if (x < 1e9) return `${t(Math.floor(x / 1e6))} juta ${t(x % 1e6)}`;
    return `${t(Math.floor(x / 1e9))} miliar ${t(x % 1e9)}`;
  };
  return t(n).replace(/\s+/g, ' ').trim();
}

const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function jkt(d = new Date()) {
  const p = {};
  for (const x of fmtParts.formatToParts(d)) p[x.type] = x.value;
  const hh = p.hour === '24' ? '00' : p.hour;
  return { tanggal: `${p.year}-${p.month}-${p.day}`, jam: +hh, menit: +p.minute, hh, mm: p.minute, ss: p.second };
}
const isoNow = () => { const j = jkt(); return `${j.tanggal}T${j.hh}:${j.mm}:${j.ss}+07:00`; };
const noon = t => new Date(t + 'T12:00:00+07:00');
function addDays(t, n) { const d = noon(t); d.setUTCDate(d.getUTCDate() + n); return jkt(d).tanggal; }
const dow = t => noon(t).getUTCDay();
const fmtHari = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtTglPendek = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fmtBulan = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, month: 'long', year: 'numeric' });
const hariPanjang = t => fmtHari.format(noon(t));
const hariPendek = t => fmtTglPendek.format(noon(t));
const namaBulan = b => fmtBulan.format(noon(b + '-15'));
const jamDari = w => parseInt(w.slice(11, 13), 10);
const jamMenit = w => w.slice(11, 16).replace(':', '.');

/* =========================================================
   2. LOGIKA BISNIS (fungsi murni)
   ========================================================= */
const PECAHAN = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];
function pecahKembalian(k) {
  const out = []; let s = k;
  for (const p of PECAHAN) { const j = Math.floor(s / p); if (j) { out.push([p, j]); s -= j * p; } }
  return out;
}
const labelPecahan = arr => arr.map(([p, j]) => `${j} × ${p >= 1000 ? p / 1000 + 'rb' : p}`).join(' · ');
function hitungPembayaran(total, dibayar) {
  const cukup = dibayar >= total;
  const kembalian = cukup ? dibayar - total : 0;
  return {
    cukup, kurang: cukup ? 0 : total - dibayar, kembalian,
    pecahan: labelPecahan(pecahKembalian(kembalian)),
    kalimat: !dibayar ? '' : cukup ? (kembalian ? `Terima ${terbilang(dibayar)}, kembali ${terbilang(kembalian)}.` : `Terima ${terbilang(dibayar)}, uang pas.`) : `Uang kurang ${rp(total - dibayar)}`
  };
}
function tombolUangCepat(total) {
  const k = new Set([total]);
  for (const st of [10000, 50000, 100000]) { const v = Math.ceil(total / st) * st; if (v > total) k.add(v); }
  if (k.size < 4) k.add(Math.ceil(total / 100000) * 100000 + 50000);
  if (k.size < 4) k.add(Math.ceil(total / 100000) * 100000 + 100000);
  return [...k].sort((a, b) => a - b).slice(0, 4);
}
function bagiPatungan(total, orang) {
  const dasar = Math.floor(total / orang / 500) * 500;
  const arr = Array(orang).fill(dasar);
  arr[0] += total - dasar * orang;
  return arr;
}
function validasi(metode, total, dibayar, c) {
  const a = [];
  if (total <= 0) a.push('Keranjang kosong');
  if (metode === 'tunai') {
    if (dibayar < total) a.push('Masukkan uang yang diterima');
    else if (dibayar > total && !c.disebut) a.push('Centang: kembalian sudah disebut');
  }
  if (metode === 'qris' && !(c.toko && c.nominal && c.berhasil)) a.push('Selesaikan 3 cek QRIS');
  if (metode === 'patungan' && !c.patungan) a.push('Centang: semua bagian sudah dibayar');
  return a;
}
const isRamai = (jam, jadwal) => jadwal.some(([a, b]) => jam >= a && jam < b);

const lunas = arr => arr.filter(t => t.status === 'lunas');
function ringkasHari(txs, tanggal) {
  const t = lunas(txs).filter(x => x.tanggal === tanggal);
  const total = t.reduce((s, x) => s + x.total, 0);
  const tunai = t.filter(x => x.metode === 'tunai').reduce((s, x) => s + x.total, 0);
  const porsi = t.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);
  return { tx: t, total, tunai, qris: total - tunai, jumlah: t.length, porsi, rata: t.length ? Math.round(total / t.length) : 0 };
}
function rankingMenu(txs, dari, sampai) {
  const m = new Map();
  for (const t of lunas(txs)) {
    if (t.tanggal < dari || t.tanggal > sampai) continue;
    for (const i of t.items) {
      const r = m.get(i.menuId) || { menuId: i.menuId, nama: i.nama, porsi: 0, omzet: 0, untung: 0 };
      r.porsi += i.qty; r.omzet += i.harga * i.qty; r.untung += (i.harga - i.modal) * i.qty;
      m.set(i.menuId, r);
    }
  }
  return [...m.values()].map(r => ({ ...r, upp: r.porsi ? Math.round(r.untung / r.porsi) : 0 })).sort((a, b) => b.porsi - a.porsi);
}
function petaMenu(rank) {
  if (!rank.length) return [];
  const tp = rank.reduce((s, r) => s + r.porsi, 0);
  const ambLaku = (tp / rank.length) * 0.7;
  const ambUntung = rank.reduce((s, r) => s + r.untung, 0) / tp;
  return rank.map(r => {
    const laku = r.porsi >= ambLaku, tinggi = r.upp >= ambUntung;
    return { ...r, kuadran: laku && tinggi ? 'bintang' : laku ? 'penarik' : tinggi ? 'teka' : 'evaluasi' };
  });
}
function saranMenu(peta) {
  const s = [];
  const b = peta.find(p => p.kuadran === 'bintang');
  if (b) s.push(['↑', 'var(--pink)', 'var(--purple-t)', b.nama, `paling laku & untungnya tinggi (${b.porsi} porsi). Jaga stoknya di jam ramai.`]);
  const e = [...peta].reverse().find(p => p.kuadran === 'evaluasi');
  if (e) s.push(['↓', 'var(--coral)', '#fff', e.nama, `cuma ${e.porsi} porsi. Masak separuh atau masukkan ke paket.`]);
  const k = peta.find(p => p.kuadran === 'teka');
  if (k) s.push(['★', 'var(--purple)', 'var(--peach-t)', k.nama, `untung ${rp(k.upp)}/porsi tapi jarang dibeli. Tawarkan ke pelanggan.`]);
  const p = peta.find(x => x.kuadran === 'penarik');
  if (s.length < 3 && p) s.push(['•', 'var(--ink)', '#fff', p.nama, `laku tapi untung tipis. Pertimbangkan naik Rp1.000.`]);
  return s.slice(0, 3);
}
const KAT_KELUAR = { ayam_daging: ['Ayam & daging', '#8540DD'], sayur_bumbu: ['Sayur & bumbu', '#FF766F'], beras: ['Beras', '#FFC994'], gas_listrik: ['Gas & listrik', '#C9A6EE'], gaji: ['Gaji karyawan', '#3B1A5C'], lain: ['Lain-lain', '#E0307A'] };
function labaBulan(txs, keluar, bulan) {
  const t = lunas(txs).filter(x => x.tanggal.startsWith(bulan));
  const k = keluar.filter(x => x.tanggal.startsWith(bulan));
  const masuk = t.reduce((s, x) => s + x.total, 0);
  const kel = k.reduce((s, x) => s + x.nominal, 0);
  const [y, m] = bulan.split('-').map(Number);
  const nh = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const perHari = Array.from({ length: nh }, (_, i) => {
    const d = `${bulan}-${String(i + 1).padStart(2, '0')}`;
    const ms = t.filter(x => x.tanggal === d).reduce((s, x) => s + x.total, 0);
    const kl = k.filter(x => x.tanggal === d).reduce((s, x) => s + x.nominal, 0);
    const w = dow(d);
    return { d, untung: ms - kl, ada: ms > 0 || kl > 0, wk: w === 0 || w === 6 };
  });
  const perKat = Object.keys(KAT_KELUAR).map(c => ({ c, n: k.filter(x => x.kategori === c).reduce((s, x) => s + x.nominal, 0) })).filter(x => x.n).sort((a, b) => b.n - a.n);
  const hariAda = perHari.filter(h => h.ada).length;
  return { masuk, kel, untung: masuk - kel, margin: pct(masuk - kel, masuk), jumlah: t.length, perHari, perKat, rata: hariAda ? Math.round((masuk - kel) / hariAda) : 0, keluarList: k };
}
function cekHargaAyam(patokan, terbaru, potong, ambang) {
  const naik = patokan ? (terbaru - patokan) / patokan : 0;
  return { lama: Math.round(patokan / potong), baru: Math.round(terbaru / potong), naikPotong: Math.round((terbaru - patokan) / potong), persen: Math.round(naik * 1000) / 10, tinjau: naik >= ambang };
}
function resiTeks(t, set, salinan) {
  const W = 32, g = '-'.repeat(W);
  const kn = (a, b) => { a = String(a); b = String(b); return a + ' '.repeat(Math.max(1, W - a.length - b.length)) + b; };
  const tg = s => { s = String(s).slice(0, W); return ' '.repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s; };
  const [y, m, d] = t.tanggal.split('-');
  const lines = [
    tg(set.namaToko.toUpperCase()),
    ...(set.alamat ? [tg(set.alamat)] : []),
    ...(set.wa ? [tg('WA ' + set.wa)] : []),
    tg(`${d}/${m}/${y} ${jamMenit(t.waktu).replace('.', ':')}`),
    ...(salinan ? [tg(`** ${salinan} **`)] : []),
    g,
    kn(`No. ${t.nomor}`, t.meja ? `Meja ${t.meja}` : JENIS[t.jenis]),
    kn('Kasir', t.kasir || '-'),
    g,
    ...t.items.flatMap(i => [i.nama.slice(0, W), kn(`  ${i.qty} x ${rpPlain(i.harga)}`, rpPlain(i.harga * i.qty))]),
    g,
    kn('TOTAL', rpPlain(t.total)),
    kn(t.metode === 'tunai' ? 'Tunai' : t.metode === 'qris' ? 'QRIS' : 'Patungan', rpPlain(t.dibayar)),
    ...(t.kembalian ? [kn('Kembali', rpPlain(t.kembalian))] : []),
    ...(t.catatan ? [g, ('Catatan: ' + t.catatan).slice(0, W)] : []),
    ...(t.status === 'batal' ? [g, tg('*** DIBATALKAN ***')] : []),
    g,
    tg(set.kakiResi || 'Terima kasih')
  ];
  return lines.join('\n');
}
const ringkasIsi = t => t.items.map(i => (i.qty > 1 ? `${i.nama} × ${i.qty}` : i.nama)).join(' + ');

/* =========================================================
   3. DATA AWAL
   ========================================================= */
const KATEGORI = [['lauk', 'Lauk Utama'], ['pendamping', 'Pendamping'], ['paket', 'Paket'], ['nasi', 'Nasi'], ['minuman', 'Minuman']];
const TONE = { lauk: ['#FFC994', '#FF9A8F', '#F5B0CC', '#D4BDF3'], pendamping: ['#FFE3C8'], paket: ['#E6D8F5'], nasi: ['#FFF4E8'], minuman: ['#FCE1EC'] };
const JENIS = { makan: 'Makan sini', bungkus: 'Bungkus', nasibox: 'Nasi box' };
const MENU0 = [
  ['rendang', 'Rendang Daging', 'lauk', 22000, 11000], ['ayam-pop', 'Ayam Pop', 'lauk', 18000, 9000],
  ['ayam-gulai', 'Ayam Gulai', 'lauk', 18000, 12000], ['ayam-bakar', 'Ayam Bakar', 'lauk', 20000, 10000],
  ['dendeng', 'Dendeng Balado', 'lauk', 22000, 11000], ['tunjang', 'Gulai Tunjang', 'lauk', 20000, 10000],
  ['paru', 'Paru Goreng', 'lauk', 15000, 9000], ['otak', 'Gulai Otak', 'lauk', 15000, 10000],
  ['telur-balado', 'Telur Balado', 'pendamping', 8000, 4000], ['perkedel', 'Perkedel Kentang', 'pendamping', 5000, 2500],
  ['daun-singkong', 'Gulai Daun Singkong', 'pendamping', 4000, 1500], ['sambal-ijo', 'Sambal Ijo (tambah)', 'pendamping', 3000, 1000],
  ['paket-pop', 'Paket Ayam Pop', 'paket', 28000, 13000], ['paket-rendang', 'Paket Rendang', 'paket', 32000, 15000], ['paket-hemat', 'Paket Hemat Telur', 'paket', 15000, 7000],
  ['nasi', 'Nasi Putih', 'nasi', 6000, 2000],
  ['es-teh', 'Es Teh Manis', 'minuman', 5000, 1500], ['teh-tawar', 'Teh Tawar', 'minuman', 3000, 800], ['es-jeruk', 'Es Jeruk', 'minuman', 7000, 3000],
  ['air', 'Air Mineral', 'minuman', 4000, 2500], ['kopi', 'Kopi Hitam', 'minuman', 5000, 2000]
].map(([id, nama, kat, harga, modal]) => ({ id, nama, kat, harga, modal, aktif: true, diubah: null }));
const SET0 = {
  namaToko: 'RM. Padang Putraguci', alamat: '', wa: '', pemilik: 'Ibu Yuli', kasir: 'Ibu Yuli',
  jamBuka: 10, jamTutup: 21, modalAwal: 300000, ramai: [[12, 14], [18, 20]], ambang: 0.1, potong: 8,
  ayamPatokan: 35000, kakiResi: 'Terima kasih, salamaik makan!', pin: '1234'
};

/* =========================================================
   4. PENYIMPANAN (IndexedDB)
   ========================================================= */
let idb = null;
function openDB() {
  return new Promise(res => {
    try {
      const r = indexedDB.open('kasir-putraguci', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('tx', { keyPath: 'id' });
        d.createObjectStore('keluar', { keyPath: 'id' });
        d.createObjectStore('hari', { keyPath: 'tanggal' });
        d.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
const store = (n, m) => idb.transaction(n, m).objectStore(n);
const dbAll = n => new Promise(res => { if (!idb) return res([]); const q = store(n, 'readonly').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); });
function dbPutMany(n, arr) {
  return new Promise(res => {
    if (!idb || !arr.length) return res(true);
    const t = idb.transaction(n, 'readwrite'); const s = t.objectStore(n);
    arr.forEach(v => s.put(v));
    t.oncomplete = () => res(true);
    t.onerror = () => { toast('Gagal menyimpan ke perangkat. Cek ruang penyimpanan.'); res(false); };
  });
}
const dbPut = (n, v) => dbPutMany(n, [v]);
function dbDelMany(n, keys) {
  return new Promise(res => {
    if (!idb || !keys.length) return res();
    const t = idb.transaction(n, 'readwrite'); const s = t.objectStore(n);
    keys.forEach(k => s.delete(k)); t.oncomplete = () => res(); t.onerror = () => res();
  });
}
const saveMeta = (k, v) => dbPut('meta', { k, v });

/* =========================================================
   5. STATE
   ========================================================= */
const S = {
  menu: [], tx: [], keluar: [], hari: [], set: { ...SET0 }, hargaAyam: [], aktif: null, contoh: false,
  view: 'kasir', kat: 'lauk', cari: '',
  cart: { items: [], jenis: 'makan', meja: '', catatan: '' },
  bayar: { metode: 'tunai', input: '', cek: {}, orang: 2 },
  resiId: null, lastId: null,
  rw: { tgl: null, metode: 'semua', cari: '', sel: null },
  laris: 7, bulan: null, profilTab: 'toko', clockMin: -1
};

/* data contoh 30 hari supaya laporan langsung terisi saat demo */
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buatContoh() {
  const r = rng(47), now = jkt(), today = now.tanggal;
  const M = id => S.menu.find(m => m.id === id);
  const pick = arr => { const tot = arr.reduce((s, x) => s + x[1], 0); let v = r() * tot; for (const [id, w] of arr) { v -= w; if (v <= 0) return id; } return arr[0][0]; };
  const LAUK = [['ayam-pop', 30], ['rendang', 26], ['ayam-bakar', 20], ['ayam-gulai', 13], ['tunjang', 11], ['dendeng', 8], ['paru', 6], ['otak', 3]];
  const PEND = [['telur-balado', 5], ['perkedel', 6], ['daun-singkong', 4], ['sambal-ijo', 2]];
  const MIN = [['es-teh', 10], ['teh-tawar', 5], ['es-jeruk', 4], ['air', 4], ['kopi', 2]];
  const PAK = [['paket-pop', 5], ['paket-rendang', 3], ['paket-hemat', 3]];
  const W = { 10: .05, 11: .08, 12: .18, 13: .16, 14: .07, 15: .04, 16: .04, 17: .06, 18: .13, 19: .12, 20: .07 };
  const txs = [], kel = [], hari = [];
  for (let back = 30; back >= 0; back--) {
    const d = addDays(today, -back); const w = dow(d); const f = (w === 0 || w === 6 ? 1.25 : 1) * (0.85 + r() * 0.3);
    let no = 0;
    for (let h = 10; h <= 20; h++) {
      if (back === 0 && h > now.jam) break;
      const n = Math.round(80 * f * W[h]);
      const menitList = Array.from({ length: n }, () => Math.floor(r() * 60)).sort((a, b) => a - b);
      for (const mnt of menitList) {
        if (back === 0 && h === now.jam && mnt > now.menit) continue;
        const items = new Map(); const add = (id, q = 1) => items.set(id, (items.get(id) || 0) + q);
        if (r() < 0.3) add(pick(PAK), r() < .2 ? 2 : 1);
        else { const orang = r() < .7 ? 1 : 2; add('nasi', orang); for (let o = 0; o < orang; o++) add(pick(LAUK)); if (r() < .45) add(pick(PEND)); }
        if (r() < .6) add(pick(MIN), r() < .3 ? 2 : 1);
        if (r() < .03) { add('nasi', 8); add('ayam-pop', 8); }
        const its = [...items].map(([id, qty]) => { const m = M(id); return { menuId: id, nama: m.nama, harga: m.harga, modal: m.modal, qty }; });
        const total = its.reduce((s, i) => s + i.harga * i.qty, 0);
        const metode = r() < .44 ? 'qris' : 'tunai';
        const dibayar = metode === 'qris' ? total : tombolUangCepat(total)[Math.floor(r() * 3)];
        no++;
        const ss = String(Math.floor(r() * 60)).padStart(2, '0');
        txs.push({
          id: `c-${d}-${no}`, nomor: `A-${String(no).padStart(3, '0')}`, tanggal: d, waktu: `${d}T${String(h).padStart(2, '0')}:${String(mnt).padStart(2, '0')}:${ss}+07:00`,
          jenis: its.some(i => i.qty >= 8) ? 'nasibox' : r() < .3 ? 'bungkus' : 'makan', meja: '', catatan: '', items: its, total, metode, dibayar, kembalian: dibayar - total,
          qrisDicek: metode === 'qris', resi: ['cetak', 'wa', 'tidak', 'tidak'][Math.floor(r() * 4)], status: 'lunas', kasir: 'Ibu Yuli', contoh: true
        });
      }
    }
    const kk = (kat, n, cat) => kel.push({ id: `c-${d}-${kat}`, tanggal: d, kategori: kat, nominal: Math.round(n / 1000) * 1000, catatan: cat, contoh: true });
    kk('ayam_daging', 620000 * f + r() * 80000, 'Belanja pasar');
    kk('sayur_bumbu', 230000 * f + r() * 60000, 'Belanja pasar');
    if (w === 1 || w === 4) kk('beras', 480000, 'Beras 1 karung');
    if (w === 3) kk('gas_listrik', 330000, 'Gas 3 tabung');
    if (w === 6) kk('gaji', 2100000, 'Gaji mingguan 3 karyawan');
    if (back > 0) {
      const rs = ringkasHari(txs, d);
      hari.push({ tanggal: d, status: 'otomatis', dibuka: `${d}T09:45:00+07:00`, ditutup: `${d}T21:05:00+07:00`, modalAwal: 300000, total: rs.total, tunai: rs.tunai, qris: rs.qris, jumlah: rs.jumlah, porsi: rs.porsi, hasilHitung: 300000 + rs.tunai, selisih: 0, sisaAyam: 2 + Math.floor(r() * 7), contoh: true });
    }
  }
  return { txs, kel, hari };
}

/* =========================================================
   6. SIKLUS HARI (real-time)
   ========================================================= */
const hariIni = () => S.aktif?.tanggal || jkt().tanggal;
const nomorBerikut = () => `A-${String(S.tx.filter(t => t.tanggal === hariIni()).length + 1).padStart(3, '0')}`;

async function tutupHariOtomatis(tanggal) {
  const ada = S.hari.find(h => h.tanggal === tanggal);
  if (ada && ada.status === 'tutup') return; // sudah ditutup manual
  const rs = ringkasHari(S.tx, tanggal);
  const rec = { tanggal, status: 'otomatis', dibuka: S.aktif?.dibuka || null, ditutup: isoNow(), modalAwal: S.aktif?.modalAwal ?? S.set.modalAwal, total: rs.total, tunai: rs.tunai, qris: rs.qris, jumlah: rs.jumlah, porsi: rs.porsi, hasilHitung: null, selisih: null, sisaAyam: null };
  S.hari = S.hari.filter(h => h.tanggal !== tanggal).concat(rec);
  await dbPut('hari', rec);
}
async function bukaHari(tanggal) {
  S.aktif = { tanggal, dibuka: isoNow(), modalAwal: S.set.modalAwal, status: 'buka' };
  await saveMeta('aktif', S.aktif);
}
let cekBusy = false;
async function cekPergantianHari(awal = false) {
  if (cekBusy) return; cekBusy = true;
  try {
    const today = jkt().tanggal;
    if (!S.aktif) { await bukaHari(today); }
    else if (S.aktif.tanggal !== today) {
      const kemarin = S.aktif.tanggal;
      await tutupHariOtomatis(kemarin);
      await bukaHari(today);
      S.cart = { items: [], jenis: 'makan', meja: '', catatan: '' };
      resetBayar();
      if (['bayar', 'resi'].includes(S.view)) S.view = 'kasir';
      S.rw.tgl = today; S.rw.sel = null;
      const rs = ringkasHari(S.tx, kemarin);
      showModal(`<h2>Hari baru sudah dibuka</h2>
        <p class="muted" style="margin:0">${esc(hariPanjang(kemarin))} sudah ditutup dan disimpan otomatis.</p>
        <div class="panel" style="background:var(--bg);padding:16px;gap:8px">
          <div class="row"><span>Uang masuk</span><b class="num">${rp(rs.total)}</b></div>
          <div class="row"><span>Transaksi</span><b class="num">${rs.jumlah}</b></div>
          <div class="row"><span>Uang laci belum dihitung</span><b class="num">${rp(S.set.modalAwal + rs.tunai)}</b></div>
        </div>
        <p class="small muted" style="margin:0">Nomor pesanan mulai lagi dari A-001 untuk ${esc(hariPanjang(today))}.</p>
        <button class="btn pri" data-a="close">Mulai jualan</button>`);
      render();
    } else if (awal) { /* hari sama, lanjut */ }
  } finally { cekBusy = false; }
}

/* =========================================================
   7. UI HELPERS
   ========================================================= */
let toastT = null;
function toast(msg) {
  const el = $('#toast'); el.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(toastT); toastT = setTimeout(() => (el.innerHTML = ''), 2800);
}
let modalReturn = null;
function showModal(html, wide) {
  modalReturn = document.activeElement;
  $('#modal').innerHTML = `<div class="modal" data-a="bg"><div class="box ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  const f = $('#modal input:not([type=hidden]),#modal select') || $('#modal .box'); if (f) f.focus();
}
function closeModal() { $('#modal').innerHTML = ''; if (modalReturn && document.contains(modalReturn)) modalReturn.focus(); modalReturn = null; }
function go(v) { S.view = v; S.cartOpen = false; try { history.replaceState(null, '', '#' + v); } catch (e) {} render(); }
const menuById = id => S.menu.find(m => m.id === id);
const cartTotal = () => S.cart.items.reduce((s, i) => { const m = menuById(i.id); return s + (m ? m.harga * i.qty : 0); }, 0);
const cartQty = () => S.cart.items.reduce((s, i) => s + i.qty, 0);
const inisial = n => n.split(/\s+/).filter(w => /[A-Za-z]/.test(w[0])).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const tone = () => 'var(--peach-t)';
function terlarisIds() { const t = hariIni(); return new Set(rankingMenu(S.tx, addDays(t, -6), t).filter(r => menuById(r.menuId)?.kat === 'lauk').slice(0, 3).map(r => r.menuId)); }
function resetBayar() { S.bayar = { metode: 'tunai', input: '', cek: {}, orang: 2 }; }
const narrow = w => window.matchMedia(`(max-width:${w}px)`).matches;
const metodeLabel = m => (m === 'tunai' ? 'Tunai' : m === 'qris' ? 'QRIS' : 'Patungan');
const ICON = {
  kasir: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  hari: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  laris: '<path d="M5 19V11M12 19V5M19 19v-6"/>',
  untung: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  riwayat: '<path d="M7 4h10v16l-2.5-1.5L12 20l-2.5-1.5L7 20z"/><path d="M10 9h4M10 13h4"/>',
  bag: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 016 0"/>'
};
const svg = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

/* =========================================================
   8. RENDER
   ========================================================= */
const TABS = [['kasir', 'Kasir'], ['hari', 'Hari Ini'], ['laris', 'Menu Laris'], ['untung', 'Untung'], ['riwayat', 'Riwayat']];
const JUDUL = { kasir: 'Kasir', bayar: 'Pembayaran', resi: 'Resi', hari: 'Hari Ini', laris: 'Menu Laris', untung: 'Untung', riwayat: 'Riwayat', profil: 'Profil toko' };
function renderHeader() {
  const j = jkt();
  const ramai = isRamai(j.jam, S.set.ramai);
  const tabOn = S.view === 'bayar' || S.view === 'resi' ? 'kasir' : S.view;
  $('#hdr').innerHTML = `
    <button class="logo ${S.view === 'profil' ? 'on' : ''}" data-a="go" data-v="profil" aria-label="Profil toko dan pengaturan">PG</button>
    <span class="title-m">${JUDUL[S.view] || ''}</span>
    <nav class="tabs" aria-label="Menu utama">${TABS.map(([v, l]) => `<button class="tab ${tabOn === v ? 'on' : ''}" data-a="go" data-v="${v}" ${tabOn === v ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>
    <div class="hdr-r">
      ${S.contoh ? `<button class="chip warn" data-a="profilTab" data-v="data" title="Berisi data contoh 30 hari. Kelola di Profil → Data">! <span class="hide-m">Data </span>contoh</button>` : ''}
      ${ramai ? '<span class="chip info" title="Jam ramai">● <span class="hide-m">Jam </span>ramai</span>' : ''}
      ${S.aktif?.status === 'tutup' ? '<span class="chip mute">Toko tutup</span>' : ''}
      <div class="clock" aria-label="Waktu sekarang"><b id="clk">${j.hh}.${j.mm}</b><span>${esc(hariPanjang(j.tanggal))}</span></div>
    </div>`;
  $('#bnav').innerHTML = TABS.map(([v, l]) => `<button class="${tabOn === v ? 'on' : ''}" data-a="go" data-v="${v}" ${tabOn === v ? 'aria-current="page"' : ''}>${svg(v)}<span>${l}</span></button>`).join('');
}
function renderStrip() {
  let h = '';
  if (S.view === 'kasir') {
    const last = S.tx.find(t => t.id === S.lastId);
    const rs = ringkasHari(S.tx, hariIni());
    h = `<button class="strip" data-a="go" data-v="hari">
      ${last ? `<b>✓ ${esc(last.nomor)} tersimpan · ${rp(last.total)} ${metodeLabel(last.metode)}</b>` : `<b>Hari dibuka ${S.aktif?.dibuka ? jamMenit(S.aktif.dibuka) : ''} WIB</b>`}
      <span class="num">Hari ini ${rs.jumlah} transaksi · ${rp(rs.total)}</span><span class="go">Lihat Hari Ini →</span></button>`;
  }
  $('#strip').innerHTML = h;
}
function renderCartbar() {
  const show = S.view === 'kasir' && S.cart.items.length && !S.cartOpen;
  $('#cartbar').innerHTML = show ? `<button data-a="openCart" aria-label="Lihat pesanan, ${cartQty()} item, total ${rp(cartTotal())}">${svg('bag', 20)}<span>${cartQty()} item · Lihat pesanan</span><b>${rp(cartTotal())}</b></button>` : '';
  document.body.classList.toggle('hascart', !!show);
}
function render() {
  const a = document.activeElement; const fid = a && a.id; const sel = a && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
  const same = S.lastView === S.view;
  const keep = {}; document.querySelectorAll('[data-keep]').forEach(e => (keep[e.dataset.keep] = e.scrollTop));
  document.body.classList.toggle('focus', S.view === 'bayar' || S.view === 'resi');
  renderHeader(); renderStrip();
  const V = { kasir: vKasir, bayar: vBayar, resi: vResi, hari: vHari, laris: vLaris, untung: vUntung, riwayat: vRiwayat, profil: vProfil }[S.view] || vKasir;
  $('#view').innerHTML = V();
  renderCartbar();
  if (same) document.querySelectorAll('[data-keep]').forEach(e => { if (keep[e.dataset.keep] != null) e.scrollTop = keep[e.dataset.keep]; });
  S.lastView = S.view;
  if (fid) { const e = document.getElementById(fid); if (e) { e.focus({ preventScroll: true }); if (sel && e.setSelectionRange) try { e.setSelectionRange(sel[0], sel[1]); } catch (x) {} } }
}

/* ---------- 1. KASIR ---------- */
function vKasir() {
  const q = S.cari.trim().toLowerCase();
  const aktif = S.menu.filter(m => m.aktif);
  const list = q ? aktif.filter(m => m.nama.toLowerCase().includes(q)) : aktif.filter(m => m.kat === S.kat);
  const top = terlarisIds(); const today = hariIni();
  const cards = list.map(m => {
    const inCart = S.cart.items.find(x => x.id === m.id);
    const baru = m.diubah && m.diubah >= addDays(today, -7);
    const tag = baru ? '<span class="tag warn">Harga baru</span>' : top.has(m.id) ? '<span class="tag">★ Terlaris</span>' : '';
    return `<button class="mcard ${inCart ? 'on' : ''}" data-a="add" data-id="${m.id}" title="${esc(m.nama)} · ${rp(m.harga)}" aria-label="Tambah ${esc(m.nama)}, ${rp(m.harga)}${inCart ? `, sudah ${inCart.qty} di pesanan` : ''}">
      <span class="pic" ${m.foto ? `style="background-image:url(${m.foto})"` : ''}>${m.foto ? '' : `<span class="ini" aria-hidden="true">${inisial(m.nama)}</span>`}${tag}${inCart ? `<span class="q">${inCart.qty}</span>` : ''}</span>
      <span class="info"><span class="nm clamp2">${esc(m.nama)}</span><span class="hg">${rp(m.harga)}</span></span></button>`;
  }).join('');
  const total = cartTotal();
  const rows = S.cart.items.map(it => {
    const m = menuById(it.id); if (!m) return '';
    return `<div class="crow"><div class="nm"><b class="clamp2" title="${esc(m.nama)}">${esc(m.nama)}</b><span class="small muted num">@ ${rp(m.harga)}</span></div>
      <div class="stepper"><button class="qb" data-a="dec" data-id="${m.id}" aria-label="Kurangi ${esc(m.nama)}">−</button><b aria-live="polite">${it.qty}</b><button class="qb p" data-a="add" data-id="${m.id}" aria-label="Tambah ${esc(m.nama)}">+</button></div>
      <b class="r num">${rp(m.harga * it.qty)}</b></div>`;
  }).join('');
  const tutup = S.aktif?.status === 'tutup';
  return `<div class="kasir">
    ${tutup ? `<div class="closed"><h1>Hari ini sudah ditutup</h1><p style="color:var(--on-dark)">Kas ${esc(hariPanjang(hariIni()))} sudah dihitung dan disimpan.<br>Hari baru dibuka otomatis pukul 00.00 WIB.</p>
      <div class="row"><button class="btn ondark" data-a="go" data-v="hari">Lihat ringkasan</button><button class="btn pri" data-a="bukaLagi">Buka lagi hari ini</button></div></div>` : ''}
    <nav class="kat" aria-label="Kategori menu">${KATEGORI.map(([k, l]) => `<button class="${!q && S.kat === k ? 'on' : ''}" data-a="kat" data-v="${k}" ${!q && S.kat === k ? 'aria-current="true"' : ''}>${l}<span>${aktif.filter(m => m.kat === k).length}</span></button>`).join('')}</nav>
    <section class="catalog" data-keep="cat" aria-label="Daftar menu">
      <div class="cat-h"><h1>${q ? `Hasil “${esc(S.cari)}”` : KATEGORI.find(k => k[0] === S.kat)[1]}</h1>
        <label class="cari"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="cari" type="search" data-i="cari" value="${esc(S.cari)}" placeholder="Cari semua menu" aria-label="Cari menu" autocomplete="off"></label></div>
      ${list.length ? `<div class="mgrid">${cards}</div>` : `<div class="empty"><b>Tidak ada menu “${esc(S.cari)}”.</b><span>Periksa ejaan, atau tambahkan menu di Profil → Menu &amp; harga.</span></div>`}
    </section>
    <aside class="cart ${S.cartOpen ? 'open' : ''}" aria-label="Pesanan" ${S.cartOpen ? 'role="dialog" aria-modal="true"' : ''}>
      <div class="cart-h">
        <div class="row"><h2>Pesanan ${nomorBerikut()}</h2><button class="btn sm cart-close" data-a="closeCart">Tutup</button></div>
        <div class="seg" role="group" aria-label="Jenis pesanan">${Object.entries(JENIS).map(([k, l]) => `<button class="${S.cart.jenis === k ? 'on' : ''}" data-a="jenis" data-v="${k}" aria-pressed="${S.cart.jenis === k}">${l}</button>`).join('')}</div>
        <div class="row" style="gap:var(--s2)"><label class="sr" for="meja">Nomor meja</label><input id="meja" class="inp" data-i="meja" value="${esc(S.cart.meja)}" placeholder="No. meja (opsional)" style="min-height:44px;font-size:14px"></div>
      </div>
      <div class="cart-b" data-keep="cart">${rows || '<div class="empty"><b>Belum ada pesanan</b><span>Ketuk menu untuk menambahkannya ke sini.</span></div>'}
        <label class="sr" for="catatan">Catatan pesanan</label><input id="catatan" class="inp" data-i="catatan" value="${esc(S.cart.catatan)}" placeholder="+ Catatan, cth: kuah dipisah" style="margin:var(--s3) 0;min-height:44px;font-size:14px;border-style:dashed"></div>
      <div class="cart-f">
        <div class="row small"><span class="muted">${cartQty()} item</span>${S.cart.items.length ? '<button class="btn ghost sm" data-a="kosongkan">Kosongkan</button>' : ''}</div>
        <button class="paybtn" data-a="keBayar" ${total && !tutup ? '' : 'disabled'}><span>Bayar</span><b>${rp(total)}</b></button>
      </div>
    </aside></div>`;
}

/* ---------- 2. BAYAR ---------- */
function vBayar() {
  const total = cartTotal();
  if (!total) { S.view = 'kasir'; return vKasir(); }
  const b = S.bayar; const dib = b.metode === 'tunai' ? parseInt(b.input || '0', 10) : total;
  const p = hitungPembayaran(total, dib);
  const err = validasi(b.metode, total, dib, b.cek);
  const items = S.cart.items.map(it => { const m = menuById(it.id); return `<div class="bill-row"><span class="qbox">${it.qty}×</span><span style="min-width:0"><b class="clamp2" style="font-weight:600">${esc(m.nama)}</b><span class="small muted num">@ ${rp(m.harga)}</span></span><b class="num">${rp(m.harga * it.qty)}</b></div>`; }).join('');
  const ck = (k, l) => `<label class="ck"><input type="checkbox" id="ck-${k}" data-a="cek" data-v="${k}" ${b.cek[k] ? 'checked' : ''}>${l}</label>`;
  let body = '';
  if (b.metode === 'tunai') {
    const st = !dib ? 'idle' : p.cukup ? '' : 'bad';
    body = `<div class="paygrid"><div class="stack" style="gap:var(--s3)">
      <div class="recv"><span class="label">Uang diterima</span><b>${rp(dib)}</b></div>
      <div class="quick" role="group" aria-label="Nominal cepat">${tombolUangCepat(total).map(v => `<button class="${dib === v ? 'on' : ''}" data-a="cepat" data-v="${v}" aria-pressed="${dib === v}">${v === total ? 'Uang pas' : rp(v)}</button>`).join('')}</div>
      <div class="change ${st}" aria-live="polite"><span class="label" style="color:inherit">${st === 'bad' ? '! Uang kurang' : 'Kembalian'}</span>
        <b>${rp(st === 'bad' ? p.kurang : p.kembalian)}</b>
        ${p.cukup && dib ? `<span>Ucapkan: “${esc(p.kalimat)}”</span>${p.kembalian ? `<span class="small">Pecahan: ${p.pecahan}</span>` : ''}` : `<span class="small">${st === 'bad' ? 'Tambah nominal atau pilih tombol cepat.' : 'Ketik nominal atau pilih tombol cepat.'}</span>`}</div>
    </div><div class="numpad" role="group" aria-label="Papan angka">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map(k => `<button data-a="key" data-v="${k}" aria-label="${k === '⌫' ? 'Hapus satu angka' : k}">${k}</button>`).join('')}</div></div>
    ${dib > total ? ck('disebut', 'Kembalian sudah disebut &amp; diserahkan') : ''}`;
  } else if (b.metode === 'qris') {
    body = `<p class="muted">Minta pelanggan scan QRIS di meja kasir. Notifikasi kadang tidak berbunyi, jadi cek layar HP pelanggan sebelum ia pergi:</p>
      <div>${ck('toko', `Nama toko benar: ${esc(S.set.namaToko)}`)}${ck('nominal', `Nominal tepat ${rp(total)}`)}${ck('berhasil', 'Status “Berhasil” di HP pelanggan')}</div>
      <p class="note">Semua QRIS dicocokkan lagi dengan riwayat merchant saat Tutup Hari.</p>`;
  } else {
    const bagi = bagiPatungan(total, b.orang);
    body = `<div class="row"><b>Dibagi untuk</b><div class="stepper"><button class="qb" data-a="orang" data-v="-1" aria-label="Kurangi jumlah orang">−</button><b style="font-size:22px;min-width:40px">${b.orang}</b><button class="qb p" data-a="orang" data-v="1" aria-label="Tambah jumlah orang">+</button><span class="muted">orang</span></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--s2)">${bagi.map((v, i) => `<div style="background:var(--bg);border-radius:var(--r-md);padding:var(--s3) var(--s4)"><span class="small muted">Orang ${i + 1}</span><br><b class="num" style="font-size:18px">${rp(v)}</b></div>`).join('')}</div>
      <p class="note">Tiap orang boleh bayar tunai atau QRIS. Sisa pembulatan masuk ke orang pertama.</p>
      ${ck('patungan', 'Semua bagian sudah dibayar')}`;
  }
  return `<div class="page" data-keep="page-bayar"><div class="cols side">
    <section class="panel">
      <div class="ph"><button class="btn sm" data-a="go" data-v="kasir">← Ubah pesanan</button><span class="chip info">${nomorBerikut()}${S.cart.meja ? ' · Meja ' + esc(S.cart.meja) : ''} · ${JENIS[S.cart.jenis]}</span></div>
      <h2>Rincian tagihan</h2>
      <div class="bill">${items}</div>
      ${S.cart.catatan ? `<p class="note">Catatan: ${esc(S.cart.catatan)}</p>` : ''}
      <div class="total-bar"><span>Total · ${cartQty()} item</span><b>${rp(total)}</b></div>
    </section>
    <section class="panel order-first">
      <div class="row"><h2>Cara bayar</h2><b class="num" style="font-size:18px">${rp(total)}</b></div>
      <div class="seg" role="group" aria-label="Cara bayar">${[['tunai', 'Tunai'], ['qris', 'QRIS'], ['patungan', 'Patungan']].map(([k, l]) => `<button style="min-height:48px;font-size:15px" class="${b.metode === k ? 'on' : ''}" data-a="metode" data-v="${k}" aria-pressed="${b.metode === k}">${l}</button>`).join('')}</div>
      ${body}
      <div class="payfoot">
        ${err[0] ? `<span class="msg-err" role="status"><span aria-hidden="true">!</span>${esc(err[0])}</span>` : '<span class="msg-ok" role="status">✓ Siap disimpan</span>'}
        <button class="btn" data-a="simpan" data-v="resi" ${err.length ? 'disabled' : ''}>Simpan &amp; resi</button>
        <button class="btn pri big" data-a="simpan" data-v="kasir" ${err.length ? 'disabled' : ''} style="min-width:160px">Selesai</button>
      </div>
    </section></div></div>`;
}

/* ---------- 3. RESI ---------- */
function vResi() {
  const t = S.tx.find(x => x.id === S.resiId);
  if (!t) return `<div class="page"><div class="empty"><b>Resi tidak ditemukan.</b><button class="btn pri" data-a="go" data-v="kasir">Kembali ke Kasir</button></div></div>`;
  const opts = [['cetak', '⎙', 'Cetak resi', 'Printer thermal 58 mm'], ['wa', 'WA', 'Kirim WhatsApp', 'Resi digital ke nomor pelanggan'], ['rangkap', '⧉', 'Nota rangkap', 'Salinan pelanggan + arsip toko'], ['tidak', '—', 'Tanpa resi', 'Tetap tercatat di Riwayat']];
  return `<div class="page" data-keep="page-resi"><div class="cols side">
    <section class="panel dark">
      <div class="ph"><h2>Resi ${esc(t.nomor)}</h2><span class="chip ok">✓ Lunas</span></div>
      <div class="paper">${esc(resiTeks(t, S.set))}</div>
    </section>
    <div class="stack order-first">
      <section class="panel">
        <div class="ph"><h2>Kirim resi ke pelanggan</h2><span class="small muted">Pilih salah satu</span></div>
        <div class="opts" role="group" aria-label="Pilihan resi">${opts.map(([k, ic, tl, d]) => `<button class="opt ${t.resi === k ? 'on' : ''}" data-a="resi" data-v="${k}" aria-pressed="${t.resi === k}"><span class="ic" aria-hidden="true">${ic}</span><b>${tl}${t.resi === k ? ' ✓' : ''}</b><span class="small muted">${d}</span></button>`).join('')}</div>
      </section>
      <section class="panel">
        <button class="btn pri big" data-a="go" data-v="kasir">Pesanan berikutnya (${nomorBerikut()}) →</button>
        <p class="small muted">${esc(t.nomor)} · ${jamMenit(t.waktu)} · ${t.metode === 'tunai' ? 'Tunai, kembali ' + rp(t.kembalian) : metodeLabel(t.metode)}. Sudah tercatat di
          <button class="btn ghost sm" style="min-height:32px;padding:0 4px" data-a="lihatRiwayat" data-v="${t.id}">Riwayat</button>,
          <button class="btn ghost sm" style="min-height:32px;padding:0 4px" data-a="go" data-v="hari">Hari Ini</button>, dan
          <button class="btn ghost sm" style="min-height:32px;padding:0 4px" data-a="go" data-v="laris">Menu Laris</button>.</p>
      </section>
    </div></div></div>`;
}

/* ---------- 4. HARI INI ---------- */
function vHari() {
  const t = hariIni(); const rs = ringkasHari(S.tx, t);
  const lalu = ringkasHari(S.tx, addDays(t, -7));
  const delta = lalu.total ? Math.round(((rs.total - lalu.total) / lalu.total) * 100) : null;
  const perJam = []; for (let h = S.set.jamBuka; h < S.set.jamTutup; h++) perJam.push({ h, v: rs.tx.filter(x => jamDari(x.waktu) === h).reduce((s, x) => s + x.total, 0), ramai: isRamai(h, S.set.ramai) });
  const max = Math.max(1, ...perJam.map(p => p.v));
  const ramaiPct = pct(perJam.filter(p => p.ramai).reduce((s, p) => s + p.v, 0), rs.total);
  const nowH = jkt().jam;
  const modal = S.aktif?.modalAwal ?? S.set.modalAwal;
  const seharusnya = modal + rs.tunai;
  const rec = S.hari.find(h => h.tanggal === t);
  const hitung = S.hitungLaci ?? (rec?.hasilHitung != null ? String(rec.hasilHitung) : '');
  const hasil = hitung === '' ? null : parseInt(hitung, 10) || 0;
  const sel = hasil == null ? null : hasil - seharusnya;
  const qrisN = rs.tx.filter(x => x.metode === 'qris').length;
  const lalus = [...S.hari].filter(h => h.tanggal < t).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 3);
  const pT = pct(rs.tunai, rs.total);
  return `<div class="page" data-keep="page-hari">
    <div class="ph"><h1>${esc(hariPanjang(t))}</h1><span class="chip ${S.aktif?.status === 'tutup' ? 'mute' : 'ok'}">${S.aktif?.status === 'tutup' ? '■ Toko tutup' : '● Buka sejak ' + (S.aktif?.dibuka ? jamMenit(S.aktif.dibuka) : '-')}</span></div>
    <div class="kpis">
      <div class="kpi main"><span class="label">Uang masuk</span><span class="v">${rp(rs.total)}</span><span class="small">${delta == null ? 'Belum ada pembanding' : `${delta >= 0 ? '▲ naik' : '▼ turun'} ${Math.abs(delta)}% dari ${hariPendek(addDays(t, -7))}`}</span></div>
      <div class="kpi"><span class="label">Transaksi</span><span class="v">${rs.jumlah}</span><span class="small muted">rata-rata ${rp(rs.rata)}</span></div>
      <div class="kpi"><span class="label">Porsi terjual</span><span class="v">${rs.porsi}</span><span class="small muted">semua item</span></div>
      <div class="kpi"><span class="label">Tunai di laci (seharusnya)</span><span class="v">${rp(seharusnya)}</span><span class="small muted">modal ${rps(modal)} + tunai</span></div>
    </div>
    <div class="cols">
      <section class="panel">
        <div class="ph"><h2>Penjualan per jam</h2><div class="legend"><span><i style="background:var(--pink)"></i>Jam ramai</span><span><i style="background:var(--peach)"></i>Jam biasa</span></div></div>
        <div class="chart"><div class="bars" role="img" aria-label="Penjualan per jam hari ini dalam ribu rupiah">${perJam.map(p => `<div class="b"><span>${p.v ? Math.round(p.v / 1000) : ''}</span><i style="height:${Math.round((p.v / max) * 86)}%;${p.ramai ? 'background:var(--pink);' : ''}${p.h === nowH ? 'outline:2px solid var(--ink);outline-offset:1px' : ''}"></i></div>`).join('')}</div>
        <div class="axis">${perJam.map(p => `<span style="${p.h === nowH ? 'color:var(--ink);font-weight:700' : ''}">${p.h}${p.h === nowH ? '•' : ''}</span>`).join('')}</div></div>
        <p class="note">${rs.total ? `Angka di atas batang dalam ribu rupiah. Jam ramai (${S.set.ramai.map(([a, b]) => `${a}–${b}`).join(' & ')}) menyumbang ${ramaiPct}% penjualan hari ini. Jam sekarang ditandai •.` : 'Belum ada penjualan hari ini. Grafik terisi otomatis setiap transaksi selesai.'}</p>
      </section>
      <div class="stack">
        <section class="panel">
          <div class="ph"><h2>Tutup hari</h2><span class="small muted">Hitung uang di laci</span></div>
          <div class="kv"><span>Modal awal laci</span><span>${rp(modal)}</span></div>
          <div class="kv"><span>+ Penjualan tunai</span><span>${rp(rs.tunai)}</span></div>
          <div class="kv" style="font-weight:700;border-top:1px solid var(--line);padding-top:var(--s2)"><span>Seharusnya di laci</span><span>${rp(seharusnya)}</span></div>
          <div class="formgrid">
            <label class="field">Hasil hitung uang laci<input id="laci" inputmode="numeric" data-i="laci" value="${esc(hitung)}" placeholder="cth: ${seharusnya}"></label>
            <label class="field">Sisa ayam (potong)<input id="sisaAyam" inputmode="numeric" data-i="sisaAyam" value="${esc(S.sisaAyam ?? rec?.sisaAyam ?? '')}" placeholder="0"></label>
          </div>
          <p class="note ${sel != null && sel !== 0 ? 'warn' : ''}" role="status">${sel == null ? 'Isi hasil hitung laci untuk melihat selisih.' : sel === 0 ? '✓ Selisih Rp0 · kas cocok' : `! Selisih ${sel > 0 ? 'lebih' : 'kurang'} ${rp(Math.abs(sel))}. Cek ulang kembalian & QRIS.`}</p>
          ${S.aktif?.status === 'tutup' ? '<button class="btn" data-a="bukaLagi">Buka lagi hari ini</button>' : `<button class="btn pri" data-a="tutupHari" ${hasil == null ? 'disabled' : ''}>Tutup hari & simpan</button>`}
        </section>
        <section class="panel">
          <div class="ph"><h2>Tunai vs QRIS</h2><span class="small muted">${qrisN} transaksi QRIS</span></div>
          <div class="split" role="img" aria-label="Tunai ${pT} persen, QRIS ${rs.total ? 100 - pT : 0} persen"><i style="width:${pT}%;background:var(--ink)"></i><i style="width:${rs.total ? 100 - pT : 0}%;background:var(--coral)"></i></div>
          <div class="kv small"><span><b>Tunai ${pT}%</b> · ${rp(rs.tunai)}</span><span><b>QRIS ${rs.total ? 100 - pT : 0}%</b> · ${rp(rs.qris)}</span></div>
          <h3 style="margin-top:var(--s2)">Hari sebelumnya</h3>
          ${lalus.length ? lalus.map(h => { const ok = h.status === 'tutup' ? h.selisih === 0 : h.hasilHitung != null; return `<button class="row small" style="border:0;background:var(--bg);border-radius:var(--r-sm);padding:var(--s2) var(--s3);min-height:44px;text-align:left" data-a="bukaTgl" data-v="${h.tanggal}"><span style="flex:1">${esc(hariPendek(h.tanggal))}</span><span class="num">${rp(h.total)}</span><span class="chip ${h.status === 'tutup' ? (h.selisih === 0 ? 'ok' : 'warn') : ok ? 'ok' : 'mute'}">${h.status === 'tutup' ? (h.selisih === 0 ? '✓ cocok' : '! selisih ' + rps(h.selisih)) : ok ? '✓ cocok' : 'otomatis'}</span></button>`; }).join('') : '<p class="small muted">Belum ada hari yang ditutup.</p>'}
        </section>
      </div>
    </div></div>`;
}

/* ---------- 5. MENU LARIS ---------- */
const KUADRAN = { bintang: ['★ Bintang', 'ok'], penarik: ['Penarik', 'mute'], teka: ['? Teka-teki', 'info'], evaluasi: ['! Evaluasi', 'warn'] };
function vLaris() {
  const t = hariIni(); const dari = addDays(t, -(S.laris - 1));
  const rank = rankingMenu(S.tx, dari, t);
  const peta = petaMenu(rank); const kq = Object.fromEntries(peta.map(p => [p.menuId, p.kuadran]));
  const max = Math.max(1, ...rank.map(r => r.porsi));
  const shown = S.larisAll ? rank : rank.slice(0, 10);
  const q = k => peta.filter(p => p.kuadran === k).map(p => esc(p.nama));
  const box = (k, judul, ket, bg) => { const l = q(k); return `<div style="background:${bg}"><span class="qt">${judul}</span><span class="small muted">${ket}</span><span class="ls">${l.length ? l.slice(0, 4).join(', ') + (l.length > 4 ? ` +${l.length - 4} lagi` : '') : '—'}</span></div>`; };
  const saran = saranMenu(peta);
  const periode = S.laris === 1 ? `hari ini (${hariPendek(t)})` : `${S.laris} hari terakhir (${hariPendek(dari)} – ${hariPendek(t)})`;
  return `<div class="page" data-keep="page-laris">
    <div class="ph"><div><h1>Menu Laris</h1><p class="small muted">Periode: ${esc(periode)}</p></div>
      <div class="seg" role="group" aria-label="Periode" style="min-width:280px">${[[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari']].map(([v, l]) => `<button class="${S.laris === v ? 'on' : ''}" data-a="laris" data-v="${v}" aria-pressed="${S.laris === v}">${l}</button>`).join('')}</div></div>
    <div class="cols">
      <section class="panel">
        <div class="ph"><h2>Peringkat menu</h2><span class="small muted">${rank.length} menu terjual</span></div>
        ${rank.length ? `<table class="data rank"><thead><tr><th scope="col">#</th><th scope="col">Menu</th><th scope="col">Porsi</th><th scope="col" class="r">Untung kotor/porsi</th><th scope="col" class="r">Total untung kotor</th><th scope="col" class="r">Kelompok</th></tr></thead><tbody>
          ${shown.map((r, i) => `<tr><td class="rk-no">${i + 1}</td><td class="rk-nm"><span class="clamp2" title="${esc(r.nama)}">${esc(r.nama)}</span></td>
            <td class="rk-p"><span class="rk-bar"><i style="width:${Math.max(2, Math.round((r.porsi / max) * 100))}px"></i><b>${r.porsi}</b></span></td>
            <td class="rk-u r num">${rp(r.upp)}</td><td class="rk-t r num">${rp(r.untung)}</td><td class="rk-q r"><span class="chip ${KUADRAN[kq[r.menuId]][1]}">${KUADRAN[kq[r.menuId]][0]}</span></td></tr>`).join('')}
        </tbody></table>
        ${rank.length > 10 ? `<button class="btn sm" data-a="larisAll">${S.larisAll ? 'Tampilkan 10 teratas' : `Lihat semua ${rank.length} menu`}</button>` : ''}
        <p class="note">Panjang batang = porsi terjual, dibandingkan dengan menu terlaris di periode ini. Untung kotor = harga jual − modal bahan per porsi, belum dikurangi gaji, gas, dan biaya lain (lihat Untung).</p>`
        : '<div class="empty"><b>Belum ada penjualan di periode ini.</b><span>Peringkat terisi otomatis dari transaksi.</span></div>'}
      </section>
      <div class="stack">
        <section class="panel">
          <div class="ph"><h2>Peta menu</h2><span class="small muted">laku × untung per porsi</span></div>
          ${peta.length ? `<div class="quad">
            ${box('bintang', '★ Bintang', 'Laku & untung tinggi', 'var(--pink-t)')}
            ${box('teka', '? Teka-teki', 'Untung tinggi, jarang dibeli', 'var(--purple-t)')}
            ${box('penarik', 'Penarik', 'Laku, untung tipis', 'var(--bg)')}
            ${box('evaluasi', '! Evaluasi', 'Jarang dibeli, untung tipis', 'var(--coral-t)')}
          </div><p class="small muted">Laku = porsi ≥ 70% rata-rata menu. Untung tinggi = untung kotor/porsi ≥ rata-rata. Dihitung ulang otomatis dari transaksi periode ini.</p>` : '<p class="small muted">Peta muncul setelah ada penjualan.</p>'}
        </section>
        <section class="panel">
          <div class="ph"><h2>Saran periode ini</h2><span class="small muted">${saran.length} saran</span></div>
          ${saran.length ? saran.map(([ic, c, , n, tx]) => `<div class="msg"><span class="ic" aria-hidden="true" style="background:${c};color:${c === 'var(--coral)' ? 'var(--ink)' : '#fff'}">${ic}</span><span><b>${esc(n)}</b> ${esc(tx)}</span></div>`).join('') : '<p class="small muted">Saran muncul setelah ada penjualan.</p>'}
        </section>
      </div>
    </div></div>`;
}

/* ---------- 6. UNTUNG ---------- */
function vUntung() {
  const bulan = S.bulan || hariIni().slice(0, 7);
  const L = labaBulan(S.tx, S.keluar, bulan);
  const max = Math.max(1, ...L.perHari.map(h => h.untung));
  const terbaru = S.hargaAyam.length ? S.hargaAyam[S.hargaAyam.length - 1].harga : S.set.ayamPatokan;
  const H = cekHargaAyam(S.set.ayamPatokan, terbaru, S.set.potong, S.set.ambang);
  const avgPos = Math.max(0, Math.min(100, (L.rata / max) * 92));
  const today = hariIni();
  return `<div class="page" data-keep="page-untung">
    <div class="ph"><h1>Untung ${esc(namaBulan(bulan))}</h1>
      <div class="row" style="gap:var(--s2)"><button class="btn sm" data-a="bulan" data-v="-1" aria-label="Bulan sebelumnya">‹ Sebelumnya</button><button class="btn sm" data-a="bulan" data-v="1" ${bulan >= today.slice(0, 7) ? 'disabled' : ''} aria-label="Bulan berikutnya">Berikutnya ›</button><button class="btn pri sm" data-a="formKeluar">+ Uang keluar</button></div></div>
    <div class="kpis k3">
      <div class="kpi"><span class="label">Uang masuk</span><span class="v">${rps(L.masuk)}</span><span class="small muted">dari ${L.jumlah} transaksi</span></div>
      <div class="kpi"><span class="label">Uang keluar</span><span class="v">${rps(L.kel)}</span><span class="small muted">${L.keluarList.length} catatan belanja</span></div>
      <div class="kpi dark"><span class="label">Untung bersih (masuk − keluar)</span><span class="v">${rps(L.untung)}</span><span class="small muted">margin ${L.margin}% · rata-rata ${rps(L.rata)} per hari buka</span></div>
    </div>
    <div class="cols">
      <section class="panel">
        <div class="ph"><h2>Untung per hari</h2><div class="legend"><span><i style="background:var(--peach)"></i>Hari biasa</span><span><i style="background:var(--purple)"></i>Hari ini</span><span><i style="background:transparent;border-top:2px dashed var(--muted);border-radius:0;height:0"></i>Rata-rata</span></div></div>
        <div class="chart"><div class="bars dense" role="img" aria-label="Untung bersih per hari bulan ${esc(namaBulan(bulan))}">${L.rata > 0 ? `<div class="avg" style="bottom:${avgPos}%"><span>${rps(L.rata)}</span></div>` : ''}${L.perHari.map(h => `<div class="b" title="${h.d}: ${rp(h.untung)}"><i style="height:${h.untung > 0 ? Math.round((h.untung / max) * 92) : 0}%;${h.d === today ? 'background:var(--purple)' : ''}"></i></div>`).join('')}</div>
        <div class="axis"><span style="text-align:left">1</span><span>8</span><span>15</span><span>22</span><span style="text-align:right">${L.perHari.length}</span></div></div>
        <p class="note">Hari dengan belanja besar (beras, gas, gaji mingguan) bisa terlihat rendah atau kosong. Itu wajar karena untung dihitung per hari dari uang masuk dikurangi uang keluar hari itu.</p>
      </section>
      <div class="stack">
        <section class="panel">
          <div class="ph"><h2>Uang keluar ke mana?</h2></div>
          ${L.kel ? `<div class="split" role="img" aria-label="Komposisi uang keluar">${L.perKat.map(k => `<i style="width:${pct(k.n, L.kel)}%;background:${KAT_KELUAR[k.c][1]}"></i>`).join('')}</div>
          <table class="data"><tbody>${L.perKat.map(k => `<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;background:${KAT_KELUAR[k.c][1]}"></i>${KAT_KELUAR[k.c][0]}</td><td class="r muted">${pct(k.n, L.kel)}%</td><td class="r"><b>${rp(k.n)}</b></td></tr>`).join('')}</tbody></table>`
            : '<div class="empty"><b>Belum ada uang keluar bulan ini.</b><span>Catat belanja pasar, gas, dan gaji dengan tombol “+ Uang keluar”.</span></div>'}
        </section>
        <section class="panel" ${H.tinjau ? 'style="box-shadow:inset 0 0 0 2px var(--coral)"' : ''}>
          <div class="ph"><h2>Harga ayam</h2><button class="btn sm" data-a="formAyam">Perbarui harga</button></div>
          <div class="kv"><span>Patokan per ekor</span><span>${rp(S.set.ayamPatokan)}</span></div>
          <div class="kv" style="font-weight:700"><span>Harga terbaru</span><span>${rp(terbaru)}</span></div>
          <p class="note ${H.tinjau ? 'warn' : ''}">${H.tinjau ? `! Modal naik ${String(H.persen).replace('.', ',')}% (${rp(H.naikPotong)}/potong). Tinjau harga lauk ayam &amp; ganti sisipan kartu etalase.` : `✓ Modal ${rp(H.baru)}/potong. Belum melewati ambang ${Math.round(S.set.ambang * 100)}%.`}</p>
          ${H.tinjau ? '<button class="btn sm" data-a="jadikanPatokan">Harga menu sudah disesuaikan → jadikan patokan</button>' : ''}
        </section>
      </div>
    </div></div>`;
}

/* ---------- 7. RIWAYAT ---------- */
const RESI_LBL = { cetak: ['⎙ Dicetak', 'info'], wa: ['WA terkirim', 'ok'], rangkap: ['⧉ Rangkap', 'warn'], tidak: ['Tanpa resi', 'mute'] };
function rwDetail(sel) {
  if (!sel) return '<div class="empty" style="color:var(--on-dark)">Pilih transaksi untuk melihat resinya.</div>';
  return `<div class="ph"><h2>Detail ${esc(sel.nomor)}</h2><span class="chip ${sel.status === 'batal' ? 'warn' : 'ok'}">${sel.status === 'batal' ? '! Batal' : '✓ Lunas'}</span></div>
    <div class="paper">${esc(resiTeks(sel, S.set))}</div>
    ${sel.status === 'batal' ? `<p class="small muted">Alasan batal: ${esc(sel.alasanBatal || '-')}</p>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)">
      <button class="btn pri" data-a="cetakUlang" data-v="${sel.id}">Cetak ulang</button>
      <button class="btn" data-a="formWA" data-v="${sel.id}">Kirim WhatsApp</button>
    </div>
    ${sel.status === 'lunas' ? `<button class="btn sm ondark" data-a="formBatal" data-v="${sel.id}">Batalkan transaksi (perlu PIN pemilik)</button>` : ''}`;
}
function vRiwayat() {
  const tgl = S.rw.tgl || hariIni();
  const q = S.rw.cari.trim().toLowerCase();
  const semua = S.tx.filter(t => t.tanggal === tgl);
  const list = semua.filter(t => S.rw.metode === 'semua' || t.metode === S.rw.metode)
    .filter(t => !q || t.nomor.toLowerCase().includes(q) || t.items.some(i => i.nama.toLowerCase().includes(q)))
    .sort((a, b) => b.waktu.localeCompare(a.waktu));
  const sel = S.tx.find(t => t.id === S.rw.sel) || list[0];
  const rs = ringkasHari(S.tx, tgl);
  const rec = S.hari.find(h => h.tanggal === tgl);
  const chipR = t => t.status === 'batal' ? '<span class="chip warn">! Batal</span>' : `<span class="chip ${RESI_LBL[t.resi][1]}">${RESI_LBL[t.resi][0]}</span>`;
  return `<div class="page" data-keep="page-riwayat">
    <div class="ph"><div><h1>Riwayat</h1><p class="small muted">${esc(hariPanjang(tgl))} · ${rec ? (rec.status === 'tutup' ? 'ditutup manual' : 'ditutup otomatis') : tgl === hariIni() ? 'hari berjalan' : 'tidak ada catatan tutup'}</p></div>
      <div class="row" style="gap:var(--s2)"><button class="btn sm" data-a="rwTgl" data-v="-1" aria-label="Hari sebelumnya">‹</button>
        <label class="sr" for="rwTgl">Tanggal</label><input id="rwTgl" type="date" class="inp" style="min-height:40px;width:170px;font-size:14px" data-i="rwTgl" value="${tgl}" max="${hariIni()}">
        <button class="btn sm" data-a="rwTgl" data-v="1" aria-label="Hari berikutnya" ${tgl >= hariIni() ? 'disabled' : ''}>›</button></div></div>
    <div class="cols">
      <section class="panel">
        <div class="ph" style="align-items:stretch">
          <div class="seg" role="group" aria-label="Cara bayar" style="flex:1;min-width:260px">${[['semua', 'Semua'], ['tunai', 'Tunai'], ['qris', 'QRIS'], ['patungan', 'Patungan']].map(([k, l]) => `<button class="${S.rw.metode === k ? 'on' : ''}" data-a="rwMetode" data-v="${k}" aria-pressed="${S.rw.metode === k}">${l}</button>`).join('')}</div>
          <label class="sr" for="rwCari">Cari transaksi</label><input id="rwCari" type="search" class="inp" data-i="rwCari" value="${esc(S.rw.cari)}" placeholder="Cari no. resi atau menu" style="flex:1;min-width:200px;min-height:44px;font-size:14px">
        </div>
        <div class="tlist" role="list">
          <div class="tr h" aria-hidden="true"><span>No.</span><span>Jam</span><span>Pesanan</span><span>Bayar</span><span>Resi</span><span class="r">Total</span></div>
          ${list.length ? list.map(t => `<button class="tr ${sel && sel.id === t.id ? 'on' : ''} ${t.status === 'batal' ? 'batal' : ''}" role="listitem" data-a="rwPilih" data-v="${t.id}" aria-label="${esc(t.nomor)} pukul ${jamMenit(t.waktu)}, ${rp(t.total)}${t.status === 'batal' ? ', dibatalkan' : ''}">
            <b class="c-no">${esc(t.nomor)}</b><span class="c-jam muted num">${jamMenit(t.waktu)}</span><span class="isi clamp2" title="${esc(ringkasIsi(t))}">${esc(ringkasIsi(t))}</span>
            <span class="c-bayar small">${metodeLabel(t.metode)}</span><span class="c-resi">${chipR(t)}</span>
            <b class="tot r num">${rp(t.total)}</b>
            <span class="meta"><span class="chip mute">${jamMenit(t.waktu)}</span><span class="chip mute">${metodeLabel(t.metode)}</span>${chipR(t)}</span></button>`).join('')
            : `<div class="empty"><b>${semua.length ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi di tanggal ini.'}</b>${semua.length ? '<span>Ubah filter cara bayar atau kata pencarian.</span>' : ''}</div>`}
        </div>
        <div class="kv small" style="border-top:1px solid var(--line);padding-top:var(--s3)"><span class="muted">${list.length} dari ${semua.length} transaksi</span><b>Total lunas ${rp(rs.total)}</b></div>
      </section>
      <section class="panel dark sticky rw-detail" aria-label="Detail transaksi">${rwDetail(sel)}</section>
    </div></div>`;
}

/* ---------- 8. PROFIL ---------- */
function vProfil() {
  const s = S.set; const tab = S.profilTab;
  const tiles = [['toko', 'T', 'Info toko', 'Nama, alamat, WA, jam buka'], ['menu', 'Rp', 'Menu & harga', `${S.menu.filter(m => m.aktif).length} menu aktif · foto`], ['kasir', 'K', 'Kasir & PIN', `Kasir aktif: ${s.kasir}`], ['resi', '⎙', 'Resi & jam ramai', 'Teks resi, jam ramai, ambang harga'], ['data', '⇪', 'Data & cadangan', 'Ekspor CSV, backup, data contoh'], ['pasang', '↓', 'Pasang di tablet', 'Cara install & offline']];
  const f = (k, l, type = 'text', extra = '') => `<label class="field">${l}<input id="set-${k}" type="${type}" data-i="set" data-k="${k}" value="${esc(s[k])}" ${extra}></label>`;
  let body = '';
  if (tab === 'toko') body = `<h2>Info toko</h2><div class="formgrid">${f('namaToko', 'Nama toko')}${f('pemilik', 'Pemilik')}${f('alamat', 'Alamat (tampil di resi)')}${f('wa', 'No. WhatsApp toko', 'tel')}${f('jamBuka', 'Jam buka', 'number', 'min="0" max="23"')}${f('jamTutup', 'Jam tutup', 'number', 'min="1" max="24"')}${f('modalAwal', 'Modal awal laci (Rp)', 'number', 'min="0" step="1000"')}${f('ayamPatokan', 'Harga ayam patokan / ekor', 'number', 'min="0" step="500"')}</div><p class="small muted">Perubahan tersimpan otomatis.</p>`;
  if (tab === 'menu') body = `<div class="ph"><h2>Menu &amp; harga</h2><button class="btn sm pri" data-a="formMenu">+ Tambah menu</button></div>
    <p class="small muted">Ketuk kotak foto untuk memotret atau memilih foto lauk. Foto diperkecil otomatis dan disimpan di tablet. Modal per porsi dipakai untuk menghitung untung kotor per menu.</p>
    <div class="mrow h"><span>Foto</span><span>Menu</span><span>Harga jual</span><span>Modal/porsi</span><span>Aktif</span></div>
    ${KATEGORI.map(([k, l]) => `<h3 style="padding-top:var(--s3);color:var(--purple-d)">${l}</h3>` + S.menu.filter(m => m.kat === k).map(m => `<div class="mrow">
      <span style="display:flex;flex-direction:column;align-items:center;gap:2px"><label class="thumb" style="${m.foto ? `background-image:url(${m.foto});border-style:solid` : ''}" title="Ganti foto ${esc(m.nama)}">${m.foto ? '' : '+ Foto'}<input type="file" accept="image/*" data-i="menuFoto" data-id="${m.id}" hidden aria-label="Foto ${esc(m.nama)}"></label>${m.foto ? `<button class="linkbtn" data-a="hapusFoto" data-id="${m.id}">hapus</button>` : ''}</span>
      <span style="min-width:0"><b class="clamp2" style="font-weight:600" title="${esc(m.nama)}">${esc(m.nama)}</b>${m.diubah ? `<span class="small muted">harga diubah ${esc(hariPendek(m.diubah))}</span>` : ''}</span>
      <label><span class="sr">Harga ${esc(m.nama)}</span><input id="h-${m.id}" class="inp num" type="number" step="500" min="0" data-i="menuHarga" data-id="${m.id}" value="${m.harga}"></label>
      <label><span class="sr">Modal ${esc(m.nama)}</span><input id="m-${m.id}" class="inp num" type="number" step="500" min="0" data-i="menuModal" data-id="${m.id}" value="${m.modal}"></label>
      <button class="switch ${m.aktif ? 'on' : ''}" role="switch" aria-checked="${m.aktif}" data-a="menuAktif" data-id="${m.id}" aria-label="Tampilkan ${esc(m.nama)} di kasir"></button></div>`).join('')).join('')}`;
  if (tab === 'kasir') body = `<h2>Kasir &amp; PIN</h2><div class="formgrid">${f('kasir', 'Nama kasir yang sedang bertugas')}</div>
    <div class="note"><b>PIN pemilik</b> dipakai untuk membatalkan transaksi dan menghapus data. PIN awal 1234, segera ganti.</div><button class="btn" data-a="formPin">Ganti PIN pemilik</button>`;
  if (tab === 'resi') body = `<h2>Resi &amp; jam ramai</h2><div class="formgrid">${f('kakiResi', 'Teks kaki resi')}<label class="field">Jam ramai (cth: 12-14, 18-20)<input id="set-ramai" data-i="ramai" value="${esc(s.ramai.map(r => r.join('-')).join(', '))}"></label>
    <label class="field">Ambang peringatan harga (%)<input id="set-ambang" type="number" min="1" max="100" data-i="ambang" value="${Math.round(s.ambang * 100)}"></label>${f('potong', 'Potong ayam per ekor', 'number', 'min="1" max="16"')}</div>
    <h3>Contoh resi</h3><div class="paper">${esc(resiTeks({ nomor: 'A-001', tanggal: hariIni(), waktu: isoNow(), jenis: 'makan', meja: '1', kasir: s.kasir, items: [{ nama: 'Nasi Putih', harga: 6000, qty: 1 }, { nama: 'Ayam Pop', harga: 18000, qty: 1 }], total: 24000, metode: 'tunai', dibayar: 50000, kembalian: 26000, status: 'lunas' }, s))}</div>`;
  if (tab === 'data') {
    const first = S.tx.reduce((m, t) => (!m || t.tanggal < m ? t.tanggal : m), null);
    body = `<h2>Data &amp; cadangan</h2>
    <p class="note">${S.tx.length} transaksi · ${S.keluar.length} uang keluar · ${S.hari.length} hari ditutup${first ? ' · sejak ' + esc(hariPendek(first)) : ''}</p>
    <div class="tiles">
      <button class="tile" data-a="eksporCSV"><span class="ic">CSV</span><span><b>Ekspor transaksi</b><br><span class="small muted">Buka di Excel / Google Sheets</span></span></button>
      <button class="tile" data-a="backup"><span class="ic">⇪</span><span><b>Cadangkan semua data</b><br><span class="small muted">File .json, simpan di Drive</span></span></button>
      <label class="tile" style="cursor:pointer"><span class="ic">⇩</span><span><b>Pulihkan dari cadangan</b><br><span class="small muted">Pilih file .json</span></span><input id="restore" type="file" accept="application/json,.json" data-i="restore" hidden></label>
      ${S.contoh ? '<button class="tile" data-a="hapusContoh"><span class="ic" style="background:var(--coral-t);color:var(--coral-x)">✕</span><span><b>Hapus data contoh</b><br><span class="small muted">Mulai pakai data asli toko</span></span></button>' : '<button class="tile" data-a="isiContoh"><span class="ic">＋</span><span><b>Isi data contoh 30 hari</b><br><span class="small muted">Untuk demo presentasi</span></span></button>'}
    </div>
    <button class="btn sm" style="align-self:flex-start;color:var(--coral-x)" data-a="formReset">Hapus semua data (perlu PIN)</button>`;
  }
  if (tab === 'pasang') body = `<h2>Pasang di tablet</h2>
    <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:var(--s2);line-height:1.5">
      <li>Buka alamat aplikasi ini di <b>Chrome</b> (Android) atau <b>Safari</b> (iPad).</li>
      <li>Chrome: menu ⋮ → <b>Instal aplikasi</b>. Safari: Bagikan → <b>Tambah ke Layar Utama</b>.</li>
      <li>Buka dari ikon “Kasir PG”. Setelah dibuka sekali, aplikasi tetap jalan tanpa internet.</li>
      <li>Data tersimpan di tablet ini. Cadangkan rutin lewat <b>Data &amp; cadangan</b>.</li>
      <li>Biarkan jam tablet otomatis (zona WIB). Hari ditutup &amp; dibuka sendiri pukul 00.00.</li>
    </ol>
    <div class="kv note"><span>Siap offline</span><b>${'serviceWorker' in navigator && navigator.serviceWorker.controller ? '✓ Ya' : 'Muat ulang sekali saat online'}</b></div>
    <div class="kv note"><span>Penyimpanan</span><b>${idb ? (S.persist ? '✓ Permanen' : '✓ Di perangkat') : '! Tidak tersedia, data hilang saat ditutup'}</b></div>`;
  return `<div class="page" data-keep="page-profil"><div class="cols side">
    <div class="stack">
      <section class="panel dark">
        <div class="row" style="justify-content:flex-start;gap:var(--s4)"><div style="width:64px;height:64px;border-radius:var(--r-lg);background:var(--purple);box-shadow:0 0 0 3px var(--peach);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex:none">PG</div>
          <div style="min-width:0"><h2>${esc(s.namaToko)}</h2><span class="small muted">Pemilik: ${esc(s.pemilik)}</span></div></div>
        ${[['Alamat', s.alamat || 'Belum diisi'], ['WhatsApp', s.wa || 'Belum diisi'], ['Jam buka', `${s.jamBuka}.00 – ${s.jamTutup}.00`], ['Modal awal laci', rp(s.modalAwal)], ['Kasir bertugas', s.kasir], ['Hari aktif', `${hariPendek(hariIni())} · ${S.aktif?.status === 'tutup' ? 'tutup' : 'buka'}`]].map(([k, v]) => `<div class="kv small"><span class="muted">${k}</span><b style="text-align:right">${esc(v)}</b></div>`).join('')}
        <button class="btn ondark" data-a="go" data-v="hari">Tutup hari →</button>
      </section>
      <nav class="tiles" aria-label="Bagian pengaturan" style="grid-template-columns:minmax(0,1fr)">${tiles.map(([k, ic, t, d]) => `<button class="tile ${tab === k ? 'on' : ''}" data-a="profilTab" data-v="${k}" ${tab === k ? 'aria-current="true"' : ''}><span class="ic" aria-hidden="true">${ic}</span><span style="min-width:0"><b>${t}</b><br><span class="small muted">${esc(d)}</span></span></button>`).join('')}</nav>
    </div>
    <section class="panel" id="profil-body">${body}</section>
  </div></div>`;
}

/* =========================================================
   9. AKSI
   ========================================================= */
async function simpanTransaksi(lanjut) {
  const total = cartTotal(); const b = S.bayar;
  const dib = b.metode === 'tunai' ? parseInt(b.input || '0', 10) : total;
  if (validasi(b.metode, total, dib, b.cek).length) return;
  await cekPergantianHari();
  const t = {
    id: uid(), nomor: nomorBerikut(), tanggal: hariIni(), waktu: isoNow(), jenis: S.cart.jenis, meja: S.cart.meja.trim(), catatan: S.cart.catatan.trim(),
    items: S.cart.items.map(it => { const m = menuById(it.id); return { menuId: m.id, nama: m.nama, harga: m.harga, modal: m.modal, qty: it.qty }; }),
    total, metode: b.metode, dibayar: dib, kembalian: dib - total, qrisDicek: b.metode === 'qris', resi: 'tidak', status: 'lunas', kasir: S.set.kasir
  };
  S.tx.push(t); S.lastId = t.id;
  const ok = await dbPut('tx', t);
  S.cart = { items: [], jenis: 'makan', meja: '', catatan: '' }; resetBayar();
  if (lanjut === 'resi') { S.resiId = t.id; go('resi'); } else { go('kasir'); }
  toast(ok ? `${t.nomor} tersimpan · ${rp(t.total)}` : 'Transaksi belum tersimpan di perangkat');
}
function cetak(t, salinan2) {
  const pre = s => `<pre>${esc(s)}</pre>`;
  $('#print').innerHTML = salinan2 ? pre(resiTeks(t, S.set, 'SALINAN PELANGGAN')) + pre(resiTeks(t, S.set, 'ARSIP TOKO')) : pre(resiTeks(t, S.set));
  setTimeout(() => { try { window.print(); } catch (e) { toast('Perangkat ini tidak bisa membuka dialog cetak'); } }, 50);
}
function unduh(nama, isi, tipe) {
  const blob = new Blob([isi], { type: tipe }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
/* Perkecil foto ke maks 480px, potong persegi panjang 4:3, simpan sebagai JPEG ±40 KB */
function kecilkanFoto(file) {
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const W = 480, H = 360; const c = document.createElement('canvas'); c.width = W; c.height = H;
      const r = Math.max(W / img.width, H / img.height); const w = img.width * r, h = img.height * r;
      c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
    img.src = u;
  });
}
function cekPin(pin) { return String(pin) === String(S.set.pin); }
async function updateTx(t) { const i = S.tx.findIndex(x => x.id === t.id); S.tx[i] = t; await dbPut('tx', t); }
let saveSetT = null;
function saveSetSoon() { clearTimeout(saveSetT); saveSetT = setTimeout(() => saveMeta('set', S.set), 300); }
let saveMenuT = null;
function saveMenuSoon() { clearTimeout(saveMenuT); saveMenuT = setTimeout(() => saveMeta('menu', S.menu), 300); }

const A = {
  go: d => go(d.v),
  close: () => closeModal(),
  bg: (d, e) => { if (e.target.classList.contains('modal')) closeModal(); },
  kat: d => { S.kat = d.v; S.cari = ''; render(); },
  add: d => { const it = S.cart.items.find(x => x.id === d.id); if (it) it.qty++; else S.cart.items.push({ id: d.id, qty: 1 }); render(); },
  dec: d => { const it = S.cart.items.find(x => x.id === d.id); if (!it) return; it.qty--; if (it.qty <= 0) S.cart.items = S.cart.items.filter(x => x !== it); render(); },
  openCart: () => { S.cartOpen = true; render(); const c = $('.cart .cart-close'); if (c) c.focus(); },
  closeCart: () => { S.cartOpen = false; render(); const b = $('#cartbar button'); if (b) b.focus(); },
  larisAll: () => { S.larisAll = !S.larisAll; render(); },
  kosongkan: () => { S.cart.items = []; render(); },
  jenis: d => { S.cart.jenis = d.v; render(); },
  keBayar: () => { resetBayar(); go('bayar'); },
  metode: d => { S.bayar.metode = d.v; S.bayar.cek = {}; render(); },
  key: d => { let s = S.bayar.input; s = d.v === '⌫' ? s.slice(0, -1) : (s + d.v).replace(/^0+/, ''); if (s.length > 9) return; S.bayar.input = s; S.bayar.cek.disebut = false; render(); },
  cepat: d => { S.bayar.input = d.v; S.bayar.cek.disebut = false; render(); },
  cek: (d, e) => { S.bayar.cek[d.v] = e.target.checked; render(); },
  orang: d => { S.bayar.orang = Math.max(2, Math.min(12, S.bayar.orang + +d.v)); render(); },
  simpan: d => simpanTransaksi(d.v),
  resi: async d => {
    const t = S.tx.find(x => x.id === S.resiId); if (!t) return;
    t.resi = d.v; await updateTx(t); render();
    if (d.v === 'cetak') cetak(t);
    if (d.v === 'rangkap') cetak(t, true);
    if (d.v === 'wa') A.formWA({ v: t.id });
    if (d.v === 'tidak') toast('Tanpa resi · tetap tercatat di Riwayat');
  },
  lihatRiwayat: d => { const t = S.tx.find(x => x.id === d.v); S.rw = { tgl: t.tanggal, metode: 'semua', cari: '', sel: t.id }; go('riwayat'); },
  bukaTgl: d => { S.rw = { tgl: d.v, metode: 'semua', cari: '', sel: null }; go('riwayat'); },
  tutupHari: async () => {
    const t = hariIni(); const rs = ringkasHari(S.tx, t);
    const modal = S.aktif.modalAwal ?? S.set.modalAwal;
    const rec0 = S.hari.find(h => h.tanggal === t);
    const hasil = parseInt(S.hitungLaci ?? rec0?.hasilHitung ?? '', 10);
    if (isNaN(hasil)) return;
    const sisa = parseInt(S.sisaAyam ?? rec0?.sisaAyam ?? '', 10);
    const rec = { tanggal: t, status: 'tutup', dibuka: S.aktif.dibuka, ditutup: isoNow(), modalAwal: modal, total: rs.total, tunai: rs.tunai, qris: rs.qris, jumlah: rs.jumlah, porsi: rs.porsi, hasilHitung: hasil, selisih: hasil - (modal + rs.tunai), sisaAyam: isNaN(sisa) ? null : sisa };
    S.hari = S.hari.filter(h => h.tanggal !== t).concat(rec); await dbPut('hari', rec);
    S.aktif.status = 'tutup'; await saveMeta('aktif', S.aktif);
    S.hitungLaci = null; S.sisaAyam = null;
    toast(rec.selisih === 0 ? 'Hari ditutup · kas cocok' : `Hari ditutup · selisih ${rp(rec.selisih)}`); render();
  },
  bukaLagi: async () => { S.aktif.status = 'buka'; await saveMeta('aktif', S.aktif); toast('Toko dibuka lagi'); render(); },
  laris: d => { S.laris = +d.v; S.larisAll = false; render(); },
  bulan: d => { const b = S.bulan || hariIni().slice(0, 7); const [y, m] = b.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1 + +d.v, 1)); S.bulan = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`; render(); },
  formKeluar: () => showModal(`<h2>Catat uang keluar</h2>
    <label class="field">Kategori<select id="kKat">${Object.entries(KAT_KELUAR).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label class="field">Nominal (Rp)<input id="kNom" type="number" inputmode="numeric" min="0" step="1000" placeholder="650000"></label>
    <label class="field">Tanggal<input id="kTgl" type="date" value="${hariIni()}" max="${hariIni()}"></label>
    <label class="field">Catatan<input id="kCat" placeholder="cth: belanja pasar pagi"></label>
    <div class="row"><button class="btn" data-a="close">Batal</button><button class="btn pri" data-a="simpanKeluar">Simpan</button></div>`),
  simpanKeluar: async () => {
    const n = parseInt($('#kNom').value, 10); if (!(n > 0)) { toast('Isi nominal uang keluar'); return; }
    const k = { id: uid(), tanggal: $('#kTgl').value || hariIni(), kategori: $('#kKat').value, nominal: n, catatan: $('#kCat').value.trim() };
    S.keluar.push(k); await dbPut('keluar', k); closeModal(); toast(`Uang keluar ${rp(n)} tercatat`); render();
  },
  formAyam: () => showModal(`<h2>Harga ayam terbaru</h2><p class="small muted" style="margin:0">Patokan saat ini ${rp(S.set.ayamPatokan)} per ekor.</p>
    <label class="field">Harga per ekor hari ini (Rp)<input id="ayam" type="number" inputmode="numeric" step="500" min="0" value="${S.hargaAyam.length ? S.hargaAyam[S.hargaAyam.length - 1].harga : S.set.ayamPatokan}"></label>
    <div class="row"><button class="btn" data-a="close">Batal</button><button class="btn pri" data-a="simpanAyam">Simpan</button></div>`),
  simpanAyam: async () => { const v = parseInt($('#ayam').value, 10); if (!(v > 0)) return; S.hargaAyam.push({ tanggal: hariIni(), harga: v }); await saveMeta('hargaAyam', S.hargaAyam); closeModal(); render(); },
  jadikanPatokan: async () => { const v = S.hargaAyam[S.hargaAyam.length - 1].harga; S.set.ayamPatokan = v; await saveMeta('set', S.set); toast(`Patokan ayam sekarang ${rp(v)}`); render(); },
  rwTgl: d => { S.rw.tgl = addDays(S.rw.tgl || hariIni(), +d.v); S.rw.sel = null; render(); },
  rwMetode: d => { S.rw.metode = d.v; S.rw.sel = null; render(); },
  rwPilih: d => {
    S.rw.sel = d.v; render();
    if (narrow(1099)) { const t = S.tx.find(x => x.id === d.v); showModal(`<div class="panel dark" style="margin:calc(-1 * var(--s5));border-radius:20px">${rwDetail(t)}<button class="btn ondark" data-a="close">Tutup</button></div>`, true); }
  },
  cetakUlang: d => { const t = S.tx.find(x => x.id === d.v); if (t) cetak(t); },
  formWA: d => showModal(`<h2>Kirim resi lewat WhatsApp</h2>
    <label class="field">Nomor WhatsApp pelanggan<input id="waNo" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx"></label>
    <div class="row"><button class="btn" data-a="close">Batal</button><button class="btn pri" data-a="kirimWA" data-v="${d.v}">Buka WhatsApp</button></div>`),
  kirimWA: async d => {
    const t = S.tx.find(x => x.id === d.v); const no = $('#waNo').value.replace(/\D/g, '').replace(/^0/, '62');
    if (no.length < 9) { toast('Nomor WhatsApp belum lengkap'); return; }
    const url = `https://wa.me/${no}?text=${encodeURIComponent('```\n' + resiTeks(t, S.set) + '\n```')}`;
    window.open(url, '_blank', 'noopener');
    if (t.resi === 'tidak' || t.resi === 'cetak') { t.resi = 'wa'; await updateTx(t); }
    closeModal(); render();
  },
  formBatal: d => showModal(`<h2>Batalkan transaksi</h2><p class="small muted" style="margin:0">Transaksi tetap terlihat di Riwayat dengan tanda Batal, tetapi tidak dihitung di laporan.</p>
    <label class="field">Alasan<input id="bAlasan" placeholder="cth: salah input menu"></label>
    <label class="field">PIN pemilik<input id="bPin" type="password" inputmode="numeric" autocomplete="off"></label>
    <div class="row"><button class="btn" data-a="close">Kembali</button><button class="btn coral" data-a="batal" data-v="${d.v}">Batalkan transaksi</button></div>`),
  batal: async d => {
    if (!cekPin($('#bPin').value)) { toast('PIN pemilik salah'); return; }
    const al = $('#bAlasan').value.trim(); if (!al) { toast('Isi alasan pembatalan'); return; }
    const t = S.tx.find(x => x.id === d.v); t.status = 'batal'; t.alasanBatal = al; await updateTx(t);
    closeModal(); toast(`${t.nomor} dibatalkan`); render();
  },
  profilTab: d => { S.profilTab = d.v; if (S.view !== 'profil') go('profil'); else render(); if (narrow(1099)) { const b = document.getElementById('profil-body'); if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' }); } },
  hapusFoto: async d => { const m = menuById(d.id); delete m.foto; await saveMeta('menu', S.menu); toast(`Foto ${m.nama} dihapus`); render(); },
  menuAktif: d => { const m = menuById(d.id); m.aktif = !m.aktif; saveMenuSoon(); render(); },
  formMenu: () => showModal(`<h2>Tambah menu</h2>
    <label class="field">Nama menu<input id="nmNama" placeholder="cth: Ikan Bakar"></label>
    <label class="field">Kategori<select id="nmKat">${KATEGORI.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <div class="formgrid"><label class="field">Harga jual<input id="nmHarga" type="number" step="500" min="0"></label><label class="field">Modal/porsi<input id="nmModal" type="number" step="500" min="0"></label></div>
    <div class="row"><button class="btn" data-a="close">Batal</button><button class="btn pri" data-a="simpanMenu">Tambah</button></div>`),
  simpanMenu: async () => {
    const nama = $('#nmNama').value.trim(); const harga = parseInt($('#nmHarga').value, 10); const modal = parseInt($('#nmModal').value, 10) || 0;
    if (!nama || !(harga > 0)) { toast('Isi nama dan harga jual'); return; }
    S.menu.push({ id: uid(), nama, kat: $('#nmKat').value, harga, modal, aktif: true, diubah: hariIni() });
    await saveMeta('menu', S.menu); closeModal(); toast(`${nama} ditambahkan`); render();
  },
  formPin: () => showModal(`<h2>Ganti PIN pemilik</h2>
    <label class="field">PIN lama<input id="pinLama" type="password" inputmode="numeric" autocomplete="off"></label>
    <label class="field">PIN baru (4–6 angka)<input id="pinBaru" type="password" inputmode="numeric" autocomplete="off"></label>
    <div class="row"><button class="btn" data-a="close">Batal</button><button class="btn pri" data-a="simpanPin">Simpan PIN</button></div>`),
  simpanPin: async () => {
    if (!cekPin($('#pinLama').value)) { toast('PIN lama salah'); return; }
    const b = $('#pinBaru').value; if (!/^\d{4,6}$/.test(b)) { toast('PIN baru harus 4–6 angka'); return; }
    S.set.pin = b; await saveMeta('set', S.set); closeModal(); toast('PIN pemilik diganti');
  },
  eksporCSV: () => {
    const head = 'nomor,tanggal,jam,jenis,metode,total,dibayar,kembalian,resi,status,kasir,isi';
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    const rows = [...S.tx].sort((a, b) => a.waktu.localeCompare(b.waktu)).map(t => [t.nomor, t.tanggal, jamMenit(t.waktu), JENIS[t.jenis], t.metode, t.total, t.dibayar, t.kembalian, t.resi, t.status, q(t.kasir || ''), q(ringkasIsi(t))].join(','));
    unduh(`transaksi-putraguci-${hariIni()}.csv`, '﻿' + [head, ...rows].join('\n'), 'text/csv'); toast('File CSV diunduh');
  },
  backup: () => { unduh(`cadangan-putraguci-${hariIni()}.json`, JSON.stringify({ app: 'kasir-putraguci', versi: 1, dibuat: isoNow(), set: S.set, menu: S.menu, tx: S.tx, keluar: S.keluar, hari: S.hari, hargaAyam: S.hargaAyam, aktif: S.aktif }), 'application/json'); toast('Cadangan diunduh'); },
  hapusContoh: async () => {
    const tx = S.tx.filter(t => t.contoh).map(t => t.id), kl = S.keluar.filter(t => t.contoh).map(t => t.id), hr = S.hari.filter(t => t.contoh).map(t => t.tanggal);
    await dbDelMany('tx', tx); await dbDelMany('keluar', kl); await dbDelMany('hari', hr);
    S.tx = S.tx.filter(t => !t.contoh); S.keluar = S.keluar.filter(t => !t.contoh); S.hari = S.hari.filter(t => !t.contoh);
    S.contoh = false; await saveMeta('contoh', false); S.lastId = null; toast('Data contoh dihapus · siap pakai data asli'); render();
  },
  isiContoh: async () => {
    const c = buatContoh();
    const ids = new Set(S.tx.map(t => t.tanggal));
    const txs = c.txs.filter(t => !ids.has(t.tanggal)); const hari = c.hari.filter(h => !S.hari.some(x => x.tanggal === h.tanggal));
    S.tx.push(...txs); S.keluar.push(...c.kel); S.hari.push(...hari);
    await dbPutMany('tx', txs); await dbPutMany('keluar', c.kel); await dbPutMany('hari', hari);
    S.contoh = true; await saveMeta('contoh', true); toast(`${txs.length} transaksi contoh ditambahkan`); render();
  },
  formReset: () => showModal(`<h2>Hapus semua data?</h2><p class="small muted" style="margin:0">Semua transaksi, uang keluar, dan riwayat hari akan hilang dari tablet ini. Menu dan pengaturan tetap. Cadangkan dulu bila perlu.</p>
    <label class="field">PIN pemilik<input id="rPin" type="password" inputmode="numeric" autocomplete="off"></label>
    <div class="row"><button class="btn" data-a="close">Batal</button><button class="btn coral" data-a="reset">Hapus semua</button></div>`),
  reset: async () => {
    if (!cekPin($('#rPin').value)) { toast('PIN pemilik salah'); return; }
    await dbDelMany('tx', S.tx.map(t => t.id)); await dbDelMany('keluar', S.keluar.map(t => t.id)); await dbDelMany('hari', S.hari.map(h => h.tanggal));
    S.tx = []; S.keluar = []; S.hari = []; S.contoh = false; S.lastId = null; await saveMeta('contoh', false);
    closeModal(); toast('Semua data transaksi dihapus'); render();
  }
};

const I = {
  cari: v => { S.cari = v; render(); },
  meja: v => { S.cart.meja = v; },
  catatan: v => { S.cart.catatan = v; },
  laci: v => { S.hitungLaci = v.replace(/\D/g, ''); render(); },
  sisaAyam: v => { S.sisaAyam = v.replace(/\D/g, ''); },
  rwCari: v => { S.rw.cari = v; S.rw.sel = null; render(); },
  rwTgl: v => { if (v) { S.rw.tgl = v > hariIni() ? hariIni() : v; S.rw.sel = null; render(); } },
  set: (v, el) => { const k = el.dataset.k; S.set[k] = typeof SET0[k] === 'number' ? (parseInt(v, 10) || 0) : v; saveSetSoon(); renderHeader(); },
  ramai: v => { const r = v.split(',').map(x => x.trim().split('-').map(n => parseInt(n, 10))).filter(x => x.length === 2 && x.every(n => n >= 0 && n <= 24) && x[0] < x[1]); if (r.length) { S.set.ramai = r; saveSetSoon(); renderHeader(); } },
  ambang: v => { const n = parseInt(v, 10); if (n > 0) { S.set.ambang = n / 100; saveSetSoon(); } },
  menuHarga: (v, el) => { const m = menuById(el.dataset.id); const n = parseInt(v, 10); if (n >= 0 && n !== m.harga) { m.harga = n; m.diubah = hariIni(); saveMenuSoon(); } },
  menuFoto: async (v, el) => {
    const file = el.files && el.files[0]; const m = menuById(el.dataset.id); if (!file || !m) return;
    try {
      const url = await kecilkanFoto(file);
      m.foto = url; m.diubahFoto = hariIni(); await saveMeta('menu', S.menu); toast(`Foto ${m.nama} diganti`); render();
    } catch (e) { toast('Foto tidak bisa dibaca. Coba file JPG atau PNG.'); }
  },
  menuModal: (v, el) => { const m = menuById(el.dataset.id); const n = parseInt(v, 10); if (n >= 0) { m.modal = n; saveMenuSoon(); } },
  restore: async (v, el) => {
    const file = el.files && el.files[0]; if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (d.app !== 'kasir-putraguci') throw new Error('bukan file cadangan');
      S.set = { ...SET0, ...d.set }; S.menu = d.menu || S.menu; S.tx = d.tx || []; S.keluar = d.keluar || []; S.hari = d.hari || []; S.hargaAyam = d.hargaAyam || [];
      await dbDelMany('tx', (await dbAll('tx')).map(x => x.id)); await dbDelMany('keluar', (await dbAll('keluar')).map(x => x.id)); await dbDelMany('hari', (await dbAll('hari')).map(x => x.tanggal));
      await dbPutMany('tx', S.tx); await dbPutMany('keluar', S.keluar); await dbPutMany('hari', S.hari);
      await saveMeta('set', S.set); await saveMeta('menu', S.menu); await saveMeta('hargaAyam', S.hargaAyam);
      S.contoh = S.tx.some(t => t.contoh); await saveMeta('contoh', S.contoh);
      toast(`Cadangan dipulihkan · ${S.tx.length} transaksi`); render();
    } catch (e) { toast('File tidak bisa dibaca sebagai cadangan Kasir Putraguci'); }
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.dataset.a === 'bg' && el !== e.target) return;
  const fn = A[el.dataset.a]; if (fn) fn(el.dataset, e);
});
document.addEventListener('input', e => {
  const el = e.target; if (!el.dataset || !el.dataset.i || el.type === 'file') return;
  const fn = I[el.dataset.i]; if (fn) fn(el.value, el);
});
document.addEventListener('change', e => {
  const el = e.target; if (el.dataset && el.dataset.i && (el.type === 'file' || el.type === 'date')) { const fn = I[el.dataset.i]; if (fn) fn(el.value, el); }
  if (el.dataset && (el.dataset.i === 'menuHarga' || el.dataset.i === 'menuModal')) render();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal').innerHTML) { closeModal(); return; }
  if (e.key === 'Escape' && S.cartOpen) { A.closeCart(); return; }
  if (e.key === 'Tab' && $('#modal').innerHTML) {
    const f = [...$('#modal .box').querySelectorAll('button:not(:disabled),input,select,[href],[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
    if (f.length) { const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }
  if (S.view === 'bayar' && S.bayar.metode === 'tunai' && !$('#modal').innerHTML && !/INPUT|SELECT/.test(document.activeElement?.tagName || '')) {
    if (/^\d$/.test(e.key)) A.key({ v: e.key });
    if (e.key === 'Backspace') A.key({ v: '⌫' });
    if (e.key === 'Enter') simpanTransaksi('kasir');
  }
});

/* =========================================================
   10. JAM REAL-TIME & START
   ========================================================= */
function tick() {
  const j = jkt(); const c = $('#clk'); if (c) c.textContent = `${j.hh}.${j.mm}`;
  if (j.menit !== S.clockMin) { S.clockMin = j.menit; renderHeader(); cekPergantianHari(); }
}
async function start() {
  idb = await openDB();
  try { S.persist = await navigator.storage?.persist?.(); } catch (e) {}
  const meta = Object.fromEntries((await dbAll('meta')).map(x => [x.k, x.v]));
  S.set = { ...SET0, ...(meta.set || {}) };
  S.menu = meta.menu || MENU0.map(m => ({ ...m }));
  S.hargaAyam = meta.hargaAyam || [];
  S.aktif = meta.aktif || null;
  S.tx = await dbAll('tx'); S.keluar = await dbAll('keluar'); S.hari = await dbAll('hari');
  S.contoh = !!meta.contoh;
  if (!meta.menu) await saveMeta('menu', S.menu);
  if (!meta.set) await saveMeta('set', S.set);
  if (!meta.dimulai) {
    await saveMeta('dimulai', isoNow());
    if (!S.tx.length) { // pertama kali dibuka: isi data contoh untuk demo
      const c = buatContoh(); S.tx = c.txs; S.keluar = c.kel; S.hari = c.hari;
      S.hargaAyam = [{ tanggal: addDays(jkt().tanggal, -3), harga: 40000 }];
      await dbPutMany('tx', S.tx); await dbPutMany('keluar', S.keluar); await dbPutMany('hari', S.hari); await saveMeta('hargaAyam', S.hargaAyam);
      S.contoh = true; await saveMeta('contoh', true);
    }
  }
  const h = (location.hash || '').slice(1);
  if (['kasir', 'hari', 'laris', 'untung', 'riwayat', 'profil'].includes(h)) S.view = h;
  await cekPergantianHari(true);
  render();
  if (!idb) toast('Penyimpanan perangkat tidak tersedia: data hilang saat aplikasi ditutup');
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { cekPergantianHari(); render(); } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
start();

if (typeof module !== 'undefined') module.exports = { terbilang, hitungPembayaran, tombolUangCepat, bagiPatungan, validasi, rankingMenu, petaMenu, labaBulan, cekHargaAyam, ringkasHari, addDays, jkt };
