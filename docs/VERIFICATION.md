# Status verifikasi — 2 Oktober 2026

## Lulus

- 18 pengujian lokal: domain, persistensi run, validasi rencana Astra, alur delegasi, pelestarian hasil parsial saat gagal, bukti respons OpenAI, penanganan error API, handshake/session/SSE MCP, penolakan tool tidak dikenal, dan guard origin/ukuran body, serta route API end-to-end dengan provider tiruan dan pencegahan replay. Tambahan versi 1.2 mencakup allowlist Graphify read-only, function call loop OpenAI, validasi path/digest proposal, materialisasi berkas, argumen isolasi Docker, dan delegasi mode kode.
- Pemeriksaan sintaks/transpilasi seluruh file TypeScript di src.
- Pemeriksaan tipe bagian non-3D termasuk seluruh integrasi baru, menggunakan dependensi yang tersedia dari cache lokal. Scene diganti fixture bertipe pada salinan sementara khusus pemeriksaan; fixture tidak masuk project distribusi.

Tes provider memakai mocked fetch, bukan respons OpenAI atau Graphify live. ID fixture bukan bukti panggilan provider nyata.

## Belum terverifikasi

- OpenAI live: OPENAI_API_KEY belum tersedia di lingkungan ini.
- Graphify live: endpoint https://api.graphify.com/mcp belum berhasil dijangkau/diverifikasi.
- npm install, typecheck project penuh termasuk 3D, build produksi dan pengujian browser desktop/mobile: registry npm tidak dapat dijangkau (DNS ENOTFOUND) dan dependensi 3D tidak ada di cache.

- Tes kode dalam Docker: percobaan nyata menemukan engine tidak aktif; tidak ada tes agent yang berhasil dieksekusi.
- Script regresi Playwright tersedia tetapi belum dijalankan. Tidak ada screenshot runtime atau klaim kesesuaian visual yang terverifikasi.

## Uji setelah konfigurasi lokal

1. npm install, npm test, npm run typecheck, npm run build.
2. Isi .env.local dan restart. Periksa status OpenAI dari Integrations.
3. Buat tugas kecil non-contoh untuk Astra; jalankan sekali, periksa assignment, ID respons, output tiap agent dan status perlu review. Uji juga tugas langsung ke satu worker.
4. Nonaktifkan worker, pastikan Astra tidak menugaskannya. Uji key salah/kuota habis dan pastikan tidak tampil sukses.
5. Refresh saat run berlangsung. Restart server di tengah run untuk memeriksa status interrupted; jangan langsung mengulang request yang hasil provider-nya belum jelas.
6. Periksa Graphify; cocokkan tool/schema hasil server. Tinjau argumen dan jalankan hanya tindakan yang Anda pilih. Pastikan error tool ditampilkan sebagai error.
7. Pastikan library kosong dan animasi tidak dipakai sebagai bukti aktivitas AI.
8. Periksa kamera, Step inside, klik ruangan/agent, pause/audio, mobile dan fallback WebGL.

9. Aktifkan Docker dan pull node:22-alpine. Jalankan tugas mode kode, tinjau berkas, simpan, lalu jalankan tes. Periksa log proses dan status sebenarnya.
10. Tinjau tool Graphify read-only, isi allowlist, restart, dan uji satu tugas dengan tool aktif. Periksa event tool dan bukti respons.
11. Jalankan npm run doctor, npm run verify, serta npm run test:browser dengan server aktif.
