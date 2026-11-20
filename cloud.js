/* Sinkron Firebase Firestore untuk Kasir Putraguci.
 * Semua HP yang memakai KODE TOKO yang sama membaca & menulis ke database yang sama.
 * Tetap jalan offline: perubahan disimpan dulu di HP, lalu dikirim saat ada sinyal.
 *
 * Struktur data di Firestore (semua di bawah toko/{KODE}/):
 *   meta/{kunci}     { j: JSON }          pengaturan, bahan, biaya, status hari, dll.
 *   menu/{id}        { j: JSON }          satu dokumen per menu (foto ikut di sini)
 *   txd/{tanggal}    { t: { id: JSON } }  transaksi dikelompokkan per hari (hemat kuota baca)
 *   keluar/{id}      { j: JSON }          uang keluar
 *   hari/{tanggal}   { j: JSON }          ringkasan tutup hari
 */
const V = '11.0.2';
const CFG = window.FIREBASE_CONFIG;
const KOLEKSI = ['meta', 'menu', 'txd', 'keluar', 'hari'];

function siap(api) {
  window.__cloud = api;
  window.dispatchEvent(new Event('cloud-ready'));
}

if (!CFG || !CFG.apiKey || /ISI_/.test(CFG.apiKey)) {
  siap(null); // Firebase belum diatur: aplikasi berjalan seperti dulu (data hanya di HP ini)
} else {
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    ]);
    const app = initializeApp(CFG);
    const auth = A.getAuth(app);
    const db = F.initializeFirestore(app, {
      localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
    });

    // Login anonim: tiap HP otomatis dapat identitas, tanpa email/password.
    const authSiap = new Promise((res) => {
      const stop = A.onAuthStateChanged(auth, (u) => { stop(); res(u); });
    });
    async function pastikanLogin() {
      const u = await authSiap;
      if (u || auth.currentUser) return auth.currentUser || u;
      return (await A.signInAnonymously(auth)).user;
    }

    const ref = (kode, c, id) => F.doc(db, 'toko', kode, c, id);

    siap({
      /** Cek ke server apakah kode toko ada (butuh internet). */
      async ada(kode) {
        await pastikanLogin();
        const s = await F.getDocFromServer(ref(kode, 'meta', 'dimulai'));
        return s.exists();
      },
      /** Pasang pendengar realtime untuk semua koleksi toko. */
      async hubungkan(kode, onSnap, onError) {
        try { await pastikanLogin(); } catch (e) { /* offline: pakai sesi tersimpan */ }
        KOLEKSI.forEach((c) => {
          F.onSnapshot(F.collection(db, 'toko', kode, c), (snap) => {
            onSnap(c, snap.docChanges().map((ch) => ({ type: ch.type, id: ch.doc.id, data: ch.doc.data() })), snap.metadata.fromCache);
          }, (err) => onError && onError(c, err));
        });
      },
      /** Tulis sekumpulan perubahan. ops: {c,id,j} | {c,id,del:true} | {c:'txd',id,f,j} | {c:'txd',id,f,del:true} */
      tulis(kode, ops) {
        const jalan = [];
        for (let i = 0; i < ops.length; i += 400) {
          const b = F.writeBatch(db);
          ops.slice(i, i + 400).forEach((o) => {
            const r = ref(kode, o.c, o.id);
            if (o.c === 'txd') b.set(r, { t: { [o.f]: o.del ? F.deleteField() : o.j } }, { merge: true });
            else if (o.del) b.delete(r);
            else b.set(r, { j: o.j });
          });
          jalan.push(b.commit());
        }
        return Promise.all(jalan);
      },
    });
  } catch (e) {
    console.warn('Firebase gagal dimuat', e);
    siap({ gagal: String(e && e.message || e) });
  }
}
