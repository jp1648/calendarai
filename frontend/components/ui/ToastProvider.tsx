import { createContext, useContext, useState, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Toast, { ToastAction, ToastVariant } from "./Toast";

interface ToastOptions {
  message: string;
  action?: ToastAction;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  hideToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(options);
      timerRef.current = setTimeout(() => {
        setToast(null);
      }, options.duration ?? 5000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          variant={toast.variant}
          onDismiss={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}
