import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { motion, AnimatePresence } from 'motion/react';

interface CallWaiterButtonProps {
  language: Language;
  onCallWaiter?: () => Promise<void>;
}

export default function CallWaiterButton({ language, onCallWaiter }: CallWaiterButtonProps) {
  const [isNotified, setIsNotified] = useState(false);
  const t = TRANSLATIONS[language] || TRANSLATIONS.English;

  const handleCall = async () => {
    setIsNotified(true);
    if (onCallWaiter) {
      try {
        await onCallWaiter();
      } catch (err) {
        console.error("Call waiter failed", err);
      }
    }
  };

  useEffect(() => {
    if (isNotified) {
      const timer = setTimeout(() => {
        setIsNotified(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isNotified]);

  return (
    <>
      {/* Floating Button with beautiful ring feedback */}
      <motion.button
        onClick={handleCall}
        whileHover={{ scale: 1.05 }}
        whileTap={{ 
          scale: 0.9, 
          rotate: [0, -15, 15, -15, 15, -10, 10, 0],
          transition: { duration: 0.45, ease: "easeInOut" }
        }}
        className="fixed bottom-6 right-6 z-40 bg-olive hover:bg-olive-dark text-cream p-3 sm:p-3.5 rounded-full shadow-[0_8px_30px_rgba(85,107,47,0.25)] hover:shadow-[0_12px_40px_rgba(85,107,47,0.35)] transition-shadow duration-300 flex items-center justify-center group border border-white/25 cursor-pointer"
        title={t.callWaiter}
        id="call-waiter-floating-btn"
      >
        {/* Premium elegant custom Bell SVG */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-cream group-hover:text-gold transition-colors duration-300"
          id="call-waiter-bell-svg"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          <path d="M12 2v1" strokeWidth="2.5" />
        </svg>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out font-elegant font-semibold text-xs tracking-widest uppercase whitespace-nowrap pl-0 group-hover:pl-2">
          {t.callWaiter}
        </span>
      </motion.button>

      {/* Elegant Toast Alert */}
      <AnimatePresence>
        {isNotified && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white border border-light-gray shadow-xl rounded-xl p-4 flex items-start gap-3.5"
            id="call-waiter-toast"
          >
            <div className="bg-olive/10 text-olive p-2 rounded-full flex-shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h4 className="font-semibold text-sm text-charcoal tracking-wide">
                {t.callWaiter}
              </h4>
              <p className="text-xs text-soft-gray mt-1 leading-relaxed">
                {t.waiterCalled}
              </p>
            </div>
            <button
              onClick={() => setIsNotified(false)}
              className="text-soft-gray hover:text-charcoal p-1 transition-colors rounded-lg hover:bg-cream"
              id="call-waiter-toast-close"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
