import { useEffect } from 'react'
import { useToastStore, ToastMessage } from '@/stores/toastStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const icons = {
  success: <CheckCircle className="text-emerald-400" size={20} />,
  error: <AlertCircle className="text-red-400" size={20} />,
  info: <Info className="text-blue-400" size={20} />,
  warning: <AlertTriangle className="text-amber-400" size={20} />,
}

export function Toast({ toast }: { toast: ToastMessage }) {
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-md rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10",
        "bg-popover border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 sm:slide-in-from-right-2"
      )}
    >
      <div className="flex w-full p-4 items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="ml-1 w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{toast.title}</p>
          {toast.message && <p className="mt-1 text-sm text-muted-foreground">{toast.message}</p>}
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            type="button"
            className="inline-flex rounded-md bg-transparent text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => removeToast(toast.id)}
          >
            <span className="sr-only">Close</span>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
