import { BRAND_NAME, FOOTER_TAGLINE } from '../../config/brand'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="font-semibold text-brand text-lg mb-1">{BRAND_NAME}</p>
        <p className="text-gray-500 text-sm">
          {FOOTER_TAGLINE}
        </p>
        <p className="text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} {BRAND_NAME}. Semua hak dilindungi.
        </p>
      </div>
    </footer>
  )
}
