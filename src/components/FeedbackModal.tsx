import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { MenuItem, Language, getLocalizedField } from '../types';
import { submitMenuItemFeedback } from '../services/customerApi';
import { motion } from 'motion/react';

interface FeedbackModalProps {
  item: MenuItem | null;
  language: Language;
  onClose: () => void;
}

export default function FeedbackModal({ item, language, onClose }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setFeedback('');
      setIsSubmitting(false);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const englishName = getLocalizedField(item.name, 'English', item) || item.name || 'Menu Item';
  const localizedName = getLocalizedField(item.name, language, item) || englishName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = feedback.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your feedback before sending.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitMenuItemFeedback({
        menuItemId: item.id,
        menuItemName: englishName,
        feedback: trimmed,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      setErrorMessage(err?.message || 'Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="feedback-modal-overlay">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        id="feedback-modal-backdrop"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-light-gray/40 z-10 my-auto"
        id="feedback-modal-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-cream/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-charcoal text-base sm:text-lg leading-tight line-clamp-1">
                Feedback for {localizedName}
              </h3>
              {localizedName !== englishName && (
                <p className="text-xs text-soft-gray font-medium">{englishName}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-soft-gray hover:text-charcoal transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="text-lg font-bold text-gray-900">Thank you!</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">
                Your feedback on <span className="font-semibold">{englishName}</span> has been successfully sent. We appreciate your thoughts!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="feedback-text" className="block text-xs font-semibold uppercase tracking-wider text-soft-gray">
                  Your feedback (in any language)
                </label>
                <textarea
                  id="feedback-text"
                  rows={4}
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Share your thoughts, suggestions, or comments about this dish..."
                  autoFocus
                  disabled={isSubmitting}
                  className="w-full p-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition resize-none text-charcoal placeholder:text-gray-400"
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !feedback.trim()}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
