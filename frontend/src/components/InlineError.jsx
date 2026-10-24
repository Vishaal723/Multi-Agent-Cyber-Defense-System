import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function InlineError({ message, onRetry, className = '' }) {
  if (!message) return null;
  return (
    <div className={`view-error ${className}`.trim()} role="alert">
      <span><AlertTriangle size={15} aria-hidden="true" />{message}</span>
      {onRetry && (
        <button type="button" className="btn-cyber-outline" onClick={onRetry}>
          <RotateCcw size={13} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
