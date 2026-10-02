# Astra Workspace 1.2

Kantor 3D cozy untuk **Agent** (supervisor), **Astra** (orchestrator), **Alpha** (analyst), **Rodeo** (developer), dan **Delta** (QA). Next.js + TypeScript + Tailwind + React Three Fiber. Model 3D berupa geometri lokal, mudah diganti.

## Menjalankan di VS Code

1. Install Node.js **22.18+** dan VS Code.
2. Ekstrak ZIP. Buka folder `astra-workspace` (yang berisi `package.json`) melalui File → Open Folder.
3. Di terminal VS Code:

```sh
npm install
npm run dev
```

Buka **http://127.0.0.1:3000** atau alamat yang tercetak di terminal. Port alternatif dipilih jika 3000 sedang dipakai. Server hanya mendengarkan localhost; ini aplikasi lokal satu pengguna, bukan layanan publik dengan autentikasi multiuser.

## Mengaktifkan OpenAI

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `OPENAI_API_KEY` dengan API key Anda secara lokal. Jangan masukkan key ke source atau chat.
3. Default model adalah `gpt-4.1`, dapat diganti lewat `OPENAI_MODEL`. Override per agent melalui `OPENAI_MODEL_ASTRA`, `OPENAI_MODEL_ALPHA`, `OPENAI_MODEL_RODEO`, `OPENAI_MODEL_DELTA`. Gunakan ID model Responses API yang tersedia pada akun Anda dan mendukung structured outputs untuk Astra.
4. Restart server setelah mengubah environment.
5. Di **Integrations**, klik **Periksa status**. Pemeriksaan ini memverifikasi akses model Astra melalui endpoint model; tidak mengklaim generasi sudah diuji.
6. Di **Tasks**, buat tugas non-contoh, pilih Astra sebagai pemilik, lalu klik **Jalankan dengan OpenAI**.

Permintaan tersebut mengirim judul dan brief ke OpenAI dan menggunakan saldo API akun Anda. Tanpa tool, maksimal empat permintaan per tugas Astra. Dengan Graphify aktif, maksimal tiga putaran per agent (12 permintaan untuk tim), dengan maksimal dua panggilan tool per agent. Batas output 6.000 token per permintaan, timeout 90 detik per panggilan; tidak ada retry otomatis yang dapat menggandakan biaya tanpa diketahui.

### Apa yang dilakukan tim

- Astra membuat rencana JSON dan membagikan assignment kepada worker aktif. Rencana diperiksa sebelum dipakai; nama agent asing, duplikat, dan agent nonaktif ditolak.
- Alpha menghasilkan analisis; Rodeo menghasilkan usulan kode; Delta melakukan review statis terhadap keluaran sebelumnya. Urutan dijaga Alpha → Rodeo → Delta bila ketiganya dibutuhkan.
- Tiap hasil menyimpan model, ID respons OpenAI, waktu penerimaan, dan output di server.
- Hasil tampil di **Tasks → Jalankan tim AI → riwayat run**. Status selesai berarti respons AI diterima, **bukan** kode sudah diterapkan atau tes telah lulus.
- Board manual tidak otomatis ditandai Done. Hasil AI perlu ditinjau oleh Anda.
- Agent tidak memiliki shell atau akses repository pribadi. Mode kode di bawah dapat menyimpan proposal dan menjalankan tes setelah Anda meninjau berkas. Tidak ada commit atau deployment otomatis. Edit kepribadian di kartu agent merupakan profil UI; instruksi eksekusi per peran berada di `orchestrator.ts`.

## Graphify MCP

Konfigurasi yang digunakan:

```dotenv
GRAPHIFY_MCP_URL=https://api.graphify.com/mcp
GRAPHIFY_MCP_TOKEN=
```

Token opsional adalah bearer token dari layanan Graphify bila diwajibkan. OpenAI key tidak pernah dipakai sebagai token Graphify.

Buka **Integrations → Graphify MCP → Periksa koneksi & daftar tool**. Client melakukan handshake MCP Streamable HTTP, mendukung respons JSON/SSE, session ID, serta pagination daftar tool. Nama dan schema tool dibaca dari server, bukan di-hardcode atau ditebak.

Untuk menjalankan tool: pilih tool, baca schema dan deskripsinya, isi argumen JSON, klik **Tinjau tindakan**, kemudian **Kirim tindakan ini**. Konfirmasi terikat ke nama dan argumen yang ditampilkan. Tool dapat mengubah data sesuai kemampuannya. Kegagalan tidak diulang otomatis; periksa keadaan layanan sebelum mengulangi tindakan yang hasilnya tidak diketahui.

Koneksi ke URL tersebut belum diverifikasi secara live di lingkungan pembuatan. Jika server memerlukan OAuth alih-alih bearer token, memakai transport lama SSE terpisah, atau versi protokol di luar yang didukung, konfigurasi lanjutan diperlukan; aplikasi menampilkan error sebenarnya, bukan status connected palsu.

### Tool Graphify untuk agent

Setelah discovery, tinjau tool dan isi `GRAPHIFY_AGENT_TOOLS` dengan nama persis tool yang Anda izinkan, dipisahkan koma. Restart server, lalu centang Graphify saat menjalankan tugas. Daftar kosong menolak aktivasi; hanya tool dengan metadata `readOnlyHint: true` dan tanpa `destructiveHint: true` yang diterima. Agent dapat memilih tool tersebut dalam batas dua panggilan per agent. Hasil tool diteruskan sebagai konteks ke OpenAI; aktifkan hanya untuk data yang boleh dikirim. Error dicatat, bukan diganti hasil contoh. Panggilan manual tetap tersedia melalui panel review.

## Rodeo menulis kode dan Delta menguji

1. Buat tugas untuk Astra, aktifkan Rodeo dan Delta, lalu centang mode kode. Karena belum ada repository target, keluaran dibatasi modul JavaScript mandiri dan tes Node tanpa dependensi pihak ketiga.
2. Tinjau setiap berkas proposal. Tombol **Simpan berkas yang ditinjau** menyimpan ke `.data/workspaces/<run-id>/`. Persetujuan terikat ke digest proposal; berkas yang berubah tidak ditimpa diam-diam.
3. Untuk menjalankan tes, aktifkan Docker Desktop atau OrbStack. Siapkan image sekali melalui terminal:

```sh
docker pull node:22-alpine
```

4. Pilih **Simpan & jalankan tes Docker**. Delta menghasilkan berkas `.test.mjs`; runner menjalankan `node --test` atas snapshot proposal, bukan perintah shell buatan model. Container tanpa jaringan, filesystem read-only, pengguna non-root, dengan batas sumber daya dan waktu 30 detik. Tidak memasang dependency atau meneruskan API key.
5. Status tes berasal dari proses: `passed`, `failed`, `timeout`, atau `unavailable`. Respons AI selesai tidak berarti tes lulus. Docker/image yang tidak tersedia tidak dianggap kegagalan assertion.

Mode ini belum mengedit repository proyek lain atau menjalankan test suite Next.js hasil agent. Folder output dapat dibuka di VS Code. Untuk hasil AI, verifikasi acceptance criteria sendiri sebelum memakainya.

## Knowledge library

**0 dokumen, belum ada sumber**, sesuai permintaan Anda. Buku dan layar di office tetap dekoratif. Tidak ada catatan fiktif yang dikirim sebagai konteks. Sumber dokumen dan mekanisme retrieval dapat ditambahkan setelah Anda memiliki bahan.

## Yang harus tetap berjalan

- Docker harus aktif hanya saat menjalankan tes kode agent.
- Terminal Next.js harus tetap berjalan. Tekan Ctrl+C untuk menghentikannya.
- Biarkan tab terbuka sampai eksekusi selesai agar hasil dan progres terpantau.
- Eksekusi dijalankan di dalam request server yang ditunggu hingga selesai, bukan worker persisten. Menutup tab tidak menjamin permintaan OpenAI yang terlanjur terkirim dibatalkan; restart server dapat memutus pencatatan hasil.
- Run yang masih queued/running tanpa executor aktif setelah restart ditandai gagal/terputus, bukan dilanjutkan otomatis. Status provider mungkin tidak diketahui; periksa sebelum menjalankan ulang.
- Hanya satu run AI berjalan pada satu proses server. Gunakan satu instance lokal, bukan cluster/serverless deployment.
- Animasi dan musik tetap dekoratif serta terpisah dari request AI.

## Kontrol office dan fitur lokal

Drag untuk rotasi, klik kanan + drag untuk pan, scroll/pinch untuk zoom. Toolbar juga menyediakan rotasi/zoom/reset, pilihan lantai, jeda animasi, label, audio, dan fullscreen. **Step inside** memakai WASD/tombol arah atau tombol mobile; Escape kembali. Partisi utama memiliki benturan sederhana, bukan fisika penuh.

Ruangan: IT Team, meeting dengan board pembagian tugas, kantor supervisor, cafeteria dan barista NPC, lounge dengan TV/sofa/meja/PS5, library, arcade/beanbags/tanaman, serta basement Astra. Klik karakter/ruangan atau gunakan alternatif tombol HTML. Reduced-motion dihormati. WebGL/hardware acceleration diperlukan untuk office; manajemen tugas tetap tersedia jika rendering 3D gagal.

Task board mendukung create/edit/delete/search/filter/assignment/status manual. Profil dapat diedit dan dinonaktifkan untuk assignment lokal. Activity mencatat tindakan pengguna; riwayat eksekusi AI terpisah di Tasks.

## Penyimpanan

- Profil, board, dan aktivitas pengguna: **localStorage**, browser dan origin yang sama.
- Run AI, output dan bukti provider: **`.data/runs/`**, lokal di server. Folder ini diabaikan Git dan tidak masuk ZIP distribusi.
- Proposal tersimpan: `.data/workspaces/`; snapshot tes: `.data/test-snapshots/`.
- Ekspor workspace JSON di UI hanya mencakup data localStorage. Untuk mencadangkan hasil AI, cadangkan `.data/runs/` secara terpisah.
- Tidak ada sinkronisasi antarperangkat, login multiuser, atau database bersama.

## Struktur penting

```text
src/app/api/integrations/route.ts    Status OpenAI
src/app/api/runs/route.ts            Jalankan tugas & baca riwayat
src/app/api/workspace/route.ts       Simpan proposal dan jalankan tes Docker
src/lib/server/agent-tools.ts       Allowlist tool Graphify untuk agent
src/lib/server/code-workspace.ts    Validasi path, digest, materialisasi berkas
src/lib/server/test-runner.ts       Runner tes container terbatas
src/app/api/graphify/route.ts        Discovery dan panggilan MCP eksplisit
src/lib/server/openai.ts            Responses API, timeout, model per agent
src/lib/server/orchestrator.ts      Rencana Astra dan delegasi worker
src/lib/server/run-store.ts         Persistensi dan bukti respons
src/lib/server/graphify.ts          Client MCP Streamable HTTP
src/lib/server/http.ts              Guard localhost, origin, ukuran input
src/components/run-panel.tsx        Eksekusi dan hasil terverifikasi
src/components/graphify-panel.tsx   UI Graphify dan review argumen
src/components/office/              Model, ruangan, kontrol dan animasi 3D
src/lib/domain.ts                   Data tugas/profil lokal
```

## Pengujian dan build

```sh
npm run doctor
npm run verify
npm start
```

`npm test` memakai fixture/mocked fetch; tidak memerlukan API key dan tidak membuat permintaan berbayar. Lihat `docs/VERIFICATION.md` untuk hasil yang benar-benar diuji. Instalasi/build penuh memerlukan registry npm yang bisa dijangkau.

Browser regression (di terminal kedua, server `npm run dev` tetap berjalan):

```sh
npx playwright install chromium
npm run test:browser
```

Script memeriksa desktop/mobile, kontrol office, dan CRUD tugas; screenshot runtime disimpan di `docs/runtime/`. Script ini sudah disediakan tetapi belum dijalankan di lingkungan pembuatan karena dependensi belum tersedia. `npm run doctor` memeriksa prasyarat tanpa mencetak key. UI 3D dan build penuh belum boleh dianggap lulus sebelum `verify` dan pengujian browser berhasil.

## Referensi implementasi

- [OpenAI Responses / text generation](https://developers.openai.com/api/docs/guides/text)
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

Mockup yang disetujui ada di `docs/approved-mockup.png`. Model runtime berupa geometri sederhana, bukan gambar tersebut.

- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [Docker run](https://docs.docker.com/reference/cli/docker/container/run/)
