import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/**
 * Global Responsive Layout Wrapper
 * Displays the persistent sidebar on desktop (1024px+) and a toggleable slide-out drawer on mobile/tablet viewports.
 * 
 * @param {ReactNode} children - The inner page elements/widgets to render inside the main viewport
 * @param {Object} style - CSS inline styles, e.g., custom page background colors
 */
export default function DashboardLayout({ children, style = { backgroundColor: '#F8FAFC' } }) {
  // Local state to track whether the mobile/tablet navigation sidebar is slides open
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={style}>
      
      {/* 1. Mobile Drawer Overlay Backdrop: Click-to-close overlay when sidebar drawer is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Navigation Sidebar: Receives the open state and close triggers */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* 3. Main Viewport Area: Offset to the right by pl-64 on desktop screens to clear the fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-64">
        
        {/* Responsive Header: Passes the toggle-menu trigger down to the hamburger button */}
        <TopBar onMenuToggle={() => setSidebarOpen(true)} />

        {/* Content Container: Dynamic spacing layout wrapper for views */}
        <main className="flex-1 pt-20 pb-4 px-4 sm:px-6 lg:px-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
