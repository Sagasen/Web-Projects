import { Link } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'

export default function Banner({ promos = [] }) {
  const activePromo = promos.find((p) => p.active) || promos[0]

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-oriflame to-oriflame-dark text-white p-6 sm:p-10 mb-8">
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

      <div className="relative z-10 max-w-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium text-white/80">Katalog Resmi Oriflame</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold mb-3 leading-tight">
          Kecantikan Alami,<br />Percaya Diri Setiap Hari
        </h1>
        <p className="text-white/80 text-sm sm:text-base mb-6">
          Temukan produk skincare, makeup, parfum, dan perawatan tubuh terbaik dari Oriflame.
        </p>
        {activePromo ? (
          <Link
            to="/promo"
            className="inline-flex items-center gap-2 bg-white text-oriflame font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-oriflame-light transition-colors"
          >
            {activePromo.title}
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            to="/promo"
            className="inline-flex items-center gap-2 bg-white text-oriflame font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-oriflame-light transition-colors"
          >
            Lihat Promo
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </section>
  )
}
