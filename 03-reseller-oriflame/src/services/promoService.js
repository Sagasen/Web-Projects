import { supabase } from '../config/supabase'

const TABLE = 'promos'

function toRow(data) {
  return {
    title: data.title,
    description: data.description ?? '',
    discount: data.discount ? Number(data.discount) : null,
    valid_until: data.validUntil ? new Date(data.validUntil).toISOString() : null,
    image_url: data.imageUrl ?? '',
    active: !!data.active,
  }
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    discount: row.discount,
    validUntil: row.valid_until,
    imageUrl: row.image_url,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPromos() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(fromRow)
}

export async function createPromo(data) {
  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(toRow(data))
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

export async function updatePromo(id, data) {
  const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id)
  if (error) throw error
}

export async function deletePromo(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
