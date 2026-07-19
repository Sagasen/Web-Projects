// Script untuk mengisi tabel Supabase dengan data dummy (produk & promo).
//
// Cara pakai:
// 1. Pastikan sudah menjalankan supabase/schema.sql di Supabase SQL Editor.
// 2. Isi VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di file .env
//    (service_role key ada di Project Settings > API, JANGAN dipakai di kode
//    frontend, hanya untuk script ini yang jalan di komputer kamu).
// 3. Jalankan: npm run seed

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { dummyProducts, dummyPromos } from './dummyData.mjs'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || serviceKey === 'your_supabase_service_role_key') {
  console.error(
    '\n[X] VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env.\n' +
      '    Ambil service_role key dari Supabase Dashboard > Project Settings > API.\n'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

function productToRow(p) {
  return {
    name: p.name,
    category: p.category,
    price: p.price,
    discount_price: p.discountPrice ?? null,
    description: p.description ?? '',
    image_url: p.imageUrl,
    status: p.status,
  }
}

function promoToRow(p) {
  return {
    title: p.title,
    description: p.description ?? '',
    discount: p.discount ?? null,
    valid_until: p.validUntil ?? null,
    image_url: p.imageUrl ?? '',
    active: !!p.active,
  }
}

async function seed() {
  console.log('Menambahkan produk dummy...')
  const { error: productError } = await supabase
    .from('products')
    .insert(dummyProducts.map(productToRow))
  if (productError) throw productError

  console.log('Menambahkan promo dummy...')
  const { error: promoError } = await supabase.from('promos').insert(dummyPromos.map(promoToRow))
  if (promoError) throw promoError

  console.log(
    `\n[OK] Selesai! ${dummyProducts.length} produk dan ${dummyPromos.length} promo dummy berhasil ditambahkan.\n`
  )
}

seed().catch((err) => {
  console.error('Gagal seeding data:', err.message || err)
  process.exit(1)
})
