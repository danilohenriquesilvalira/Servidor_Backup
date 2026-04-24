import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useState } from 'react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Barra única RLS — cobre todo o topo, sem costura */}
      <div className="h-[2px] bg-[#C41C1C] flex-shrink-0 z-50" />

      <div className="flex flex-1 overflow-hidden bg-gray-100">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
