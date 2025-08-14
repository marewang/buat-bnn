
# Integrasi API Cloud (Vercel + PostgreSQL)

## 1) Environment Variables
Di Vercel → Project Settings → Environment Variables:
- `DATABASE_URL` = postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require

## 2) Endpoint yang tersedia
- `GET /api/health` → uji koneksi DB
- `GET /api/asn` → list
- `POST /api/asn` → create (body JSON)
- `GET /api/asn/:id` → detail
- `PUT /api/asn/:id` → update
- `DELETE /api/asn/:id` → hapus
- `GET /api/notif` → data notifikasi dari view `v_asn_notif`

## 3) Frontend
Gunakan helper di `src/lib/apiClient.js`:
```js
import { listASN, createASN, updateASN, deleteASN, listNotif } from './lib/apiClient';
```

> Catatan: File yang sebelumnya pakai Dexie diberi komentar TODO untuk diganti panggilan API.

## 4) vercel.json
Sudah disiapkan agar route `/api/*` tidak di-rewrite ke SPA:
```json
{ "rewrites":[
  {"source":"/api/(.*)","destination":"/api/$1"},
  {"source":"/(.*)","destination":"/index.html"}
]}
```

## 5) Build errors yang pernah muncul
- **Stray `<` di App.jsx**: sudah dibersihkan otomatis (komentar pengganti). Jika masih error, cek kembali tag yang tidak tertutup.
- **`npm ci` minta package-lock.json**: Jika project belum punya lockfile, di Vercel ubah **Install Command** menjadi `npm install`. Atau generate `package-lock.json` secara lokal (`npm install`) dan commit.
