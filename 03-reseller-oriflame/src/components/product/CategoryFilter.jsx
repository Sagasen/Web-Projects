import { CATEGORIES } from '../../constants/categories'

export default function CategoryFilter({ selected, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selected === ''
            ? 'bg-brand text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:border-brand hover:text-brand'
        }`}
      >
        Semua
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected === cat
              ? 'bg-brand text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-brand hover:text-brand'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
