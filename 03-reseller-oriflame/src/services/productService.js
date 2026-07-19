import { supabase } from '../config/supabase'

const TABLE = 'products'

// Kolom di database pakai snake_case (konvensi Postgres), tapi seluruh
// komponen React memakai camelCase. Dua fungsi kecil ini menjembatani
// keduanya supaya tidak perlu mengubah kode di komponen/form.
function toRow(data) {
  return {
    name: data.name,
    category: data.category,
    price: data.price,
    discount_price: data.discountPrice ?? null,
    description: data.description ?? '',
    image_url: data.imageUrl,
    status: data.status,
  }
}

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    discountPrice: row.discount_price,
    description: row.description,
    imageUrl: row.image_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProducts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(fromRow)
}

export async function getProductById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()

  if (error) throw error
  return data ? fromRow(data) : null
}

export async function createProduct(data) {
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(toRow(data))
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

export async function updateProduct(id, data) {
  const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
