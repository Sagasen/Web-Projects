import { useState, useEffect } from 'react'
import { Tag, Percent } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Loading from '../components/common/Loading'
import EmptyState from '../components/common/EmptyState'
import { getPromos } from '../services/promoService'

export default function PromoPage() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPromos()
      .then(setPromos)
      .finally(() => setLoading(false))
  }, [])

  const activePromos = promos.filter((p) => p.active)
  const inactivePromos = promos.filter((p) => !p.active)

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Promo & Diskon</h1>
          <p className="text-gray-500 text-sm">
            Dapatkan penawaran terbaik untuk produk Oriflame favorit Anda
          </p>
        </div>

        {loading ? (
          <Loading />
        ) : promos.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Belum ada promo"
            description="Promo dan diskon akan segera hadir. Pantau halaman ini secara berkala!"
          />
        ) : (
          <div className="space-y-8">
            {activePromos.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Promo Aktif
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {activePromos.map((promo) => (
                    <PromoCard key={promo.id} promo={promo} active />
                  ))}
                </div>
              </section>
            )}

            {inactivePromos.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-400 mb-4">Promo Sebelumnya</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {inactivePromos.map((promo) => (
                    <PromoCard key={promo.id} promo={promo} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function PromoCard({ promo, active = false }) {
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden border shadow-sm ${
        active ? 'border-oriflame/30' : 'border-gray-100 opacity-70'
      }`}
    >
      {promo.imageUrl && (
        <div className="aspect-video overflow-hidden bg-gray-50">
          <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-bold text-gray-800">{promo.title}</h3>
          {promo.discount && (
            <span className="shrink-0 flex items-center gap-1 bg-oriflame text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Percent className="w-3 h-3" />
              {promo.discount}%
            </span>
          )}
        </div>
        {promo.description && (
          <p className="text-gray-500 text-sm leading-relaxed">{promo.description}</p>
        )}
        {promo.validUntil && (
          <p className="text-xs text-gray-400 mt-3">
            Berlaku hingga:{' '}
            {new Date(promo.validUntil).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
