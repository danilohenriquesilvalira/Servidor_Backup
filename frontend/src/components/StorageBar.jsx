import { formatBytes } from '../services/api'

/**
 * Barra de progresso de uso de armazenamento.
 * Props:
 *   used  — bytes usados
 *   limit — bytes do limite (null = ilimitado)
 *   label — texto opcional acima da barra
 *   showNumbers — exibir "X de Y" abaixo (default true)
 *   height — altura da barra em px (default 6)
 */
export default function StorageBar({ used = 0, limit = null, label, showNumbers = true, height = 6 }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

  const color = pct >= 90 ? 'bg-rls-red'
    : pct >= 70           ? 'bg-amber-400'
    :                       'bg-primary-500'

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 truncate">{label}</span>
          {limit && (
            <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${pct >= 90 ? 'text-rls-red' : 'text-gray-600'}`}>
              {pct}%
            </span>
          )}
        </div>
      )}

      <div
        className="w-full bg-gray-100 rounded-full overflow-hidden"
        style={{ height }}
      >
        {limit ? (
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full rounded-full bg-primary-200 w-full" />
        )}
      </div>

      {showNumbers && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">{formatBytes(used)} usado</span>
          <span className="text-xs text-gray-400">
            {limit ? `de ${formatBytes(limit)}` : 'sem limite'}
          </span>
        </div>
      )}
    </div>
  )
}
