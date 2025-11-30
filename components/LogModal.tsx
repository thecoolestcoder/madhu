import React, { useEffect } from 'react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  centered?: boolean; // New prop
}

const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, title, children, centered = false }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex ${centered ? 'items-center' : 'items-end sm:items-center'} justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200`}>
      <div 
        className={`w-full max-w-md bg-white dark:bg-gray-900 ${centered ? 'rounded-2xl' : 'rounded-t-2xl sm:rounded-2xl'} p-6 shadow-2xl transform transition-transform animate-in ${centered ? 'zoom-in-95' : 'slide-in-from-bottom'} duration-300`}
        style={{ maxHeight: centered ? '80vh' : '90vh', overflowY: 'auto' }}
      >
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-sans">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-gray-600 dark:text-gray-400 text-2xl leading-none">&times;</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default LogModal;
