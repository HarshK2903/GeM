import { useEffect } from 'react';
import { useToastStore, Toast as ToastType } from '../../stores/toastStore';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const iconMap = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const typeStyles = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  error: 'border-red-500/20 bg-red-500/10 text-red-400',
};

const progressStyles = {
  success: 'bg-emerald-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

export function Toast({ toast }: { toast: ToastType }) {
  const { removeToast } = useToastStore();
  const Icon = iconMap[toast.type];
  const duration = toast.duration || 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, removeToast]);

  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-lg border shadow-lg transition-all animate-in slide-in-from-top-2 fade-in duration-300',
        'bg-card border-border',
        typeStyles[toast.type]
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon size={20} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium">{toast.title}</h3>
          {toast.description && (
            <p className="mt-1 text-xs opacity-90">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-4 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X size={14} />
          <span className="sr-only">Close</span>
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 w-full bg-black/20">
        <div
          className={cn('h-full w-full', progressStyles[toast.type])}
          style={{
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); transform-origin: left; }
          to { transform: scaleX(0); transform-origin: left; }
        }
      `}</style>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
