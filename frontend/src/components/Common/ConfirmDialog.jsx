// frontend/src/components/Common/ConfirmDialog.jsx

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  icon: Icon = AlertTriangle,
}) => {
  if (!isOpen) return null;

  const colors = {
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700',
      iconColor: 'text-amber-600',
    },
    danger: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      button: 'bg-rose-600 hover:bg-rose-700',
      iconColor: 'text-rose-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
      iconColor: 'text-blue-600',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      iconColor: 'text-emerald-600',
    },
  };

  const color = colors[type] || colors.warning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 ${color.text}`}>
            <Icon className="w-6 h-6" />
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Message */}
        <p className="text-slate-700 mb-4 text-sm leading-relaxed">{message}</p>

        {/* Details (bullet points) */}
        {details && details.length > 0 && (
          <div className={`${color.bg} border ${color.border} rounded-xl p-4 text-xs ${color.text} space-y-1.5`}>
            {details.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 font-bold">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${color.button} text-white rounded-xl text-sm font-bold transition shadow-sm`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
