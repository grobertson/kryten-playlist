import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AnnouncerContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue>({
  announce: () => {},
});

export function useAnnouncer() {
  return useContext(AnnouncerContext);
}

interface AnnouncerProviderProps {
  children: ReactNode;
}

export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback(
    (msg: string, prio: 'polite' | 'assertive' = 'polite') => {
      setMessage('');
      // Brief delay to ensure screen reader picks up the change
      setTimeout(() => {
        setMessage(msg);
        setPriority(prio);
      }, 50);
    },
    []
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}
