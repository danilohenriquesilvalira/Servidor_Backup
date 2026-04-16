import {
  FileImage, FileVideo, FileAudio, FileText, FileSpreadsheet,
  FileArchive, FileCode, File, Layers
} from 'lucide-react'

const EXT_MAP = {
  // Imagens
  jpg: { icon: FileImage, color: 'text-purple-500' },
  jpeg:{ icon: FileImage, color: 'text-purple-500' },
  png: { icon: FileImage, color: 'text-purple-500' },
  gif: { icon: FileImage, color: 'text-purple-500' },
  svg: { icon: FileImage, color: 'text-purple-500' },
  webp:{ icon: FileImage, color: 'text-purple-500' },
  // Vídeo
  mp4: { icon: FileVideo, color: 'text-pink-500' },
  avi: { icon: FileVideo, color: 'text-pink-500' },
  mov: { icon: FileVideo, color: 'text-pink-500' },
  mkv: { icon: FileVideo, color: 'text-pink-500' },
  // Áudio
  mp3: { icon: FileAudio, color: 'text-yellow-500' },
  wav: { icon: FileAudio, color: 'text-yellow-500' },
  // PDF
  pdf: { icon: FileText, color: 'text-red-500' },
  // Office
  doc: { icon: FileText,        color: 'text-blue-500' },
  docx:{ icon: FileText,        color: 'text-blue-500' },
  xls: { icon: FileSpreadsheet, color: 'text-green-600' },
  xlsx:{ icon: FileSpreadsheet, color: 'text-green-600' },
  csv: { icon: FileSpreadsheet, color: 'text-green-600' },
  ppt: { icon: FileText,        color: 'text-orange-500' },
  pptx:{ icon: FileText,        color: 'text-orange-500' },
  // Arquivos comprimidos
  zip: { icon: FileArchive, color: 'text-amber-600' },
  rar: { icon: FileArchive, color: 'text-amber-600' },
  tar: { icon: FileArchive, color: 'text-amber-600' },
  gz:  { icon: FileArchive, color: 'text-amber-600' },
  '7z':{ icon: FileArchive, color: 'text-amber-600' },
  // CAD / Engenharia
  dwg: { icon: Layers, color: 'text-cyan-600' },
  dxf: { icon: Layers, color: 'text-cyan-600' },
  step:{ icon: Layers, color: 'text-cyan-600' },
  stp: { icon: Layers, color: 'text-cyan-600' },
  iges:{ icon: Layers, color: 'text-cyan-600' },
  igs: { icon: Layers, color: 'text-cyan-600' },
  // Código
  py:  { icon: FileCode, color: 'text-blue-400' },
  js:  { icon: FileCode, color: 'text-yellow-400' },
  ts:  { icon: FileCode, color: 'text-blue-500' },
  cpp: { icon: FileCode, color: 'text-indigo-500' },
  c:   { icon: FileCode, color: 'text-indigo-500' },
  go:  { icon: FileCode, color: 'text-cyan-500' },
}

export default function FileTypeIcon({ name, mimeType, size = 18, className = '' }) {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  const match = EXT_MAP[ext]
  const IconComp  = match?.icon  || File
  const colorClass = match?.color || 'text-gray-400'

  return <IconComp size={size} className={`${colorClass} flex-shrink-0 ${className}`} />
}
