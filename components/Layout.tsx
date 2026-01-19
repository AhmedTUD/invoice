import React from 'react';
import { APP_TITLE } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, isAdmin = false }) => {
  const handleNavClick = (e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    window.location.hash = hash;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className={`shadow-md ${isAdmin ? 'bg-gray-800' : 'bg-brand-600'} text-white safe-area-top`}>
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">{APP_TITLE}</h1>
            {isAdmin && (
              <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded mt-1 inline-block">
                لوحة التحكم (Admin)
              </span>
            )}
          </div>
          <nav className="flex gap-2 w-full sm:w-auto">
            {!isAdmin ? (
               <button 
                 onClick={(e) => handleNavClick(e, '#/admin')} 
                 className="text-xs sm:text-sm text-brand-100 hover:text-white transition-colors focus:outline-none bg-brand-700 hover:bg-brand-800 px-3 py-2 sm:px-4 sm:py-2 rounded-lg touch-target whitespace-nowrap"
               >
                 دخول المشرفين
               </button>
            ) : (
               <button 
                 onClick={(e) => handleNavClick(e, '#/')} 
                 className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors focus:outline-none bg-gray-700 hover:bg-gray-600 px-3 py-2 sm:px-4 sm:py-2 rounded-lg touch-target whitespace-nowrap"
               >
                 العودة للرئيسية
               </button>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-6 sm:py-8 mobile-spacing">
        {children}
      </main>
      
      <footer className="bg-gray-200 text-center py-4 text-gray-600 text-sm safe-area-bottom">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} FSMI TV & HA By SmartSense</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;