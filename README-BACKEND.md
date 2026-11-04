# Nongki_Test Backend

Backend API untuk Nongkrong Yuk! menggunakan Supabase + Express.js

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase Database
1. Buka Supabase Dashboard: https://supabase.com/dashboard
2. Pilih project Anda
3. Buka **SQL Editor**
4. Copy-paste isi file `supabase-schema.sql` dan jalankan

### 3. Jalankan Backend
```bash
npm start
```

Backend akan berjalan di `http://localhost:3001`

## API Endpoints

### POST /api/events
Buat acara baru
```json
{
  "name": "Nongkrong Warkop",
  "days": ["2024-11-05", "2024-11-06", "2024-11-07"],
  "owner": "Nadya",
  "ownerChibi": "cat"
}
```

### GET /api/events/:id
Dapatkan detail acara + semua partisipan

### POST /api/events/:id/participants
Gabung sebagai partisipan baru
```json
{
  "name": "Dimas",
  "chibi": "shark"
}
```

### PUT /api/events/:id/participants/:pid/availability
Update ketersediaan jam luang
```json
{
  "editToken": "xxx",
  "slots": {
    "0-19": "g",
    "0-20": "g",
    "1-16": "y"
  }
}
```

## Environment Variables
File `.env.local` sudah di-setup dengan:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Next Steps
1. Jalankan SQL schema di Supabase
2. Test API dengan Postman atau curl
3. Update frontend `index.html` untuk connect ke backend
