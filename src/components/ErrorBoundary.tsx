import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  let errorMessage = 'Something went wrong. Please try again later.';
  
  try {
    if (error?.message) {
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
      }
    }
  } catch (e) {
    // Not a JSON error message
    errorMessage = error?.message || errorMessage;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCcw size={20} />
          Reload Application
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app so the error doesn't happen again
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
