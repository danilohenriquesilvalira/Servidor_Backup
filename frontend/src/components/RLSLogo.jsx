/**
 * RLSLogo — logo oficial + texto "Automação / Industrial"
 * size: "sm" | "md" | "lg" | "xl"
 * showText: boolean — exibe "Automação Industrial" ao lado
 * theme: "light" | "dark"
 */
export default function RLSLogo({ size = 'md', showText = true, theme = 'light', className = '' }) {
  const h = { sm: 'h-6', md: 'h-8', lg: 'h-10', xl: 'h-14' }[size]
  const isDark = theme === 'dark'

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/Logo_oficial.svg"
        alt="RLS"
        draggable={false}
        className={`w-auto object-contain flex-shrink-0 ${h}`}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`text-[11px] font-bold uppercase tracking-[0.12em] leading-tight ${
            isDark ? 'text-white/80' : 'text-gray-500'
          }`}>
            Automação
          </span>
          <span className={`text-[11px] font-bold uppercase tracking-[0.12em] leading-tight ${
            isDark ? 'text-white/50' : 'text-gray-400'
          }`}>
            Industrial
          </span>
        </div>
      )}
    </div>
  )
}
