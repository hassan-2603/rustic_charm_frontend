import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, XCircle, Check, Sparkles } from 'lucide-react';
import { OrderStatus, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { motion, AnimatePresence } from 'motion/react';

interface OrderTimelineProps {
  language: Language;
  currentTable: string | number | null;
  currentOrderNumber: string;
  currentOrderStatus: OrderStatus;
  sessionOrders: any[];
  onBackToMenu: () => void;
  onResetOrder: () => void;
  onRequestBill: () => void;
  onCallWaiter?: () => Promise<void>;
}

export default function OrderTimeline({
  language,
  currentTable,
  currentOrderNumber,
  currentOrderStatus,
  sessionOrders,
  onBackToMenu,
  onResetOrder,
  onRequestBill,
  onCallWaiter,
}: OrderTimelineProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS['English'];
  const [isCalling, setIsCalling] = useState(false);
  const [isNotified, setIsNotified] = useState(false);

  const handleCallWaiter = async () => {
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
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isNotified]);

  if (currentOrderStatus === "Rejected") {
    return (
      <div className="max-w-xl mx-auto px-3 py-6 sm:px-4 sm:py-12 text-center" id="order-rejected-container">
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-red-200 shadow-lg mb-8">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-red-600 mb-2">Order Rejected</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            Unfortunately, your order could not be accepted by the restaurant. Your table ({currentTable || "--"}) is now available again and your session has ended.
          </p>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-medium">
            {currentTable || "--"} is available again.
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onResetOrder}
            className="bg-olive hover:bg-olive-dark text-white font-semibold text-xs tracking-widest uppercase px-8 py-3.5 rounded-full transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            id="back-to-home-rejected-btn"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.backToHome || "Return Home"}</span>
          </button>
        </div>
      </div>
    );
  }

  const orderReachMessage = t.orderWillReachSoon || "Your order will reach soon";
  const thankYouMessage = t.thankYouSmile || "Thank you 😊";

  return (
    <div className="max-w-xl mx-auto px-3 py-6 sm:px-4 sm:py-10 w-full" id="order-timeline-wrapper">
      {/* Toast Notification for Call Waiter */}
      <AnimatePresence>
        {isNotified && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white border border-olive/30 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5"
            id="order-page-call-waiter-toast"
          >
            <div className="bg-olive/10 text-olive p-2 rounded-full flex-shrink-0">
              <Check className="w-5 h-5 text-olive" />
            </div>
            <div className="flex-grow">
              <h4 className="font-semibold text-sm text-charcoal tracking-wide">
                {t.callWaiter}
              </h4>
              <p className="text-xs text-soft-gray mt-1 leading-relaxed">
                {currentTable 
                  ? `A member of our service team has been notified for Table ${currentTable}.` 
                  : (t.waiterCalled || "A member of our service team has been notified.")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Order Confirmation Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-light-gray/50 shadow-[0_8px_30px_rgba(85,107,47,0.08)] text-center mb-8 relative overflow-hidden"
        id="order-status-main-card"
      >
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-olive/40 via-gold to-olive/40" />

        {/* Top Info Tags */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-olive text-[11px] font-extrabold uppercase tracking-[0.2em] bg-olive/10 px-3.5 py-1 rounded-full border border-olive/20 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-olive" />
            <span>Order Confirmed</span>
          </span>
          {currentTable && (
            <span className="bg-gold/15 text-amber-900 font-bold px-3 py-1 rounded-full text-[11px] tracking-wide uppercase border border-gold/30">
              {t.table} {currentTable}
            </span>
          )}
        </div>

        {/* Order Reference Number */}
        {currentOrderNumber && (
          <div className="text-xs text-soft-gray mb-8 tracking-wider">
            <span>{t.orderId}: </span>
            <span className="font-mono font-bold text-charcoal">{currentOrderNumber}</span>
          </div>
        )}

        {/* Core Message requested by user */}
        <div className="my-6 sm:my-8" id="order-reach-message-container">
          <h2 className="font-elegant font-bold text-2xl sm:text-3xl md:text-4xl text-charcoal tracking-tight mb-4 leading-snug">
            {orderReachMessage}
          </h2>
          <p className="font-elegant text-xl sm:text-2xl text-olive font-medium tracking-wide">
            {thankYouMessage}
          </p>
        </div>

        {/* Call Waiter Button below the message */}
        <div className="mt-8 pt-6 border-t border-light-gray/40 flex justify-center" id="order-call-waiter-section">
          <motion.button
            onClick={handleCallWaiter}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
            className={`w-full sm:w-auto min-w-[220px] px-8 py-3.5 rounded-full font-semibold text-xs tracking-widest uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-3 cursor-pointer ${
              isNotified
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                : "bg-olive hover:bg-olive-dark text-white shadow-olive/25 hover:shadow-olive/40"
            }`}
            id="order-page-call-waiter-btn"
          >
            {/* Bell SVG icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              <path d="M12 2v1" strokeWidth="2.5" />
            </svg>
            <span>
              {isNotified ? "Waiter Called ✓" : (t.callWaiter || "Call Waiter")}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Previous Orders in Current Session (if multiple) */}
      {sessionOrders && sessionOrders.length > 1 && (
        <div className="bg-white rounded-2xl p-5 border border-light-gray/40 shadow-sm mb-6" id="session-orders-summary">
          <h3 className="text-sm font-bold text-charcoal mb-3 tracking-wide uppercase">
            Your Orders ({sessionOrders.length})
          </h3>
          <div className="space-y-2.5">
            {sessionOrders.map((order: any) => (
              <div
                key={order.id}
                className="bg-cream/60 border border-light-gray/50 rounded-xl p-3 flex justify-between items-center text-xs"
              >
                <div>
                  <p className="font-semibold text-charcoal">
                    {order.orderNumber || order.id?.slice(0, 8)}
                  </p>
                  <p className="text-[11px] text-soft-gray">
                    {order.status || "In Progress"}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    order.status === "Served"
                      ? "bg-green-100 text-green-700"
                      : order.status === "Preparing"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-olive/10 text-olive"
                  }`}
                >
                  {order.status || "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Bill Button if served */}
      {currentOrderStatus === "Served" && (
        <div className="mb-6">
          <button
            onClick={onRequestBill}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            id="request-bill-btn"
          >
            <span>💳 Request Bill</span>
          </button>
        </div>
      )}

      {/* Navigation Buttons: Return to Menu & Return Home */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center" id="order-page-actions">
        <button
          onClick={onBackToMenu}
          className="w-full sm:w-auto bg-olive hover:bg-olive-dark text-white font-semibold text-xs tracking-widest uppercase px-8 py-3.5 rounded-full transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          id="back-to-menu-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.viewMenu || "Return to Menu"}</span>
        </button>

        <button
          onClick={onResetOrder}
          className="w-full sm:w-auto border border-light-gray hover:border-gold hover:text-gold text-soft-gray font-medium text-xs tracking-widest uppercase px-6 py-3 rounded-full transition-all duration-300 bg-white flex items-center justify-center gap-2 cursor-pointer"
          id="simulate-new-order-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.backToHome || "Return Home"}</span>
        </button>
      </div>
    </div>
  );
}
