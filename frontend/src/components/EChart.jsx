import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

/**
 * Wrapper React mínimo para Apache ECharts.
 * Props:
 *   option    — opções ECharts (objeto reativo)
 *   style     — estilo do container (ex: { height: 220 })
 *   className — classes Tailwind adicionais
 *   loading   — exibe skeleton quando true
 */
export default function EChart({ option, style = { height: 220 }, className = '', loading = false }) {
  const divRef   = useRef(null)
  const chartRef = useRef(null)

  // Inicialização
  useEffect(() => {
    if (!divRef.current) return
    chartRef.current = echarts.init(divRef.current, null, { renderer: 'canvas' })
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  // Atualiza opções quando mudam
  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, { notMerge: true })
    }
  }, [option])

  // Redimensiona quando janela muda
  useEffect(() => {
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
    return (
      <div style={style} className={`flex items-center justify-center ${className}`}>
        <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return <div ref={divRef} style={style} className={className} />
}
