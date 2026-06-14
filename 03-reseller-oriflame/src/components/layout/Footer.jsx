export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="font-semibold text-oriflame text-lg mb-1">Oriflame Catalog</p>
        <p className="text-gray-500 text-sm">
          Katalog produk kecantikan & perawatan tubuh Oriflame
        </p>
        <p className="text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} Oriflame Catalog. Semua hak dilindungi.
        </p>
      </div>
    </footer>
  )
}
