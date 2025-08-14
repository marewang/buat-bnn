# Deploy ke Vercel (Vite + React)

Panduan singkat untuk mem-publish aplikasi **Aplikasi Monitoring ASN** ke **Vercel**.

> ✅ File **`vercel.json`** sudah disiapkan (SPA fallback ke `index.html`).

## 1) Skrip build di `package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173"
  }
}
```

## 2) Upload ke GitHub
- Buat repo baru → **Add file → Upload files** → drag & drop semua file/folder dari zip ini → **Commit**.

## 3) Import di Vercel
- **Framework Preset**: Vite  
- **Install Command**: `npm ci`  
- **Build Command**: `npm run build`  
- **Output Directory**: `dist`

## 4) Uji
- Buka `/dashboard`, `/data`, `/notifikasi` langsung (refresh) → harus tetap jalan.  
- Data tersimpan di IndexedDB (lokal per perangkat).

## 5) (Opsional) CLI
```
npm i -g vercel
vercel --prod
```
