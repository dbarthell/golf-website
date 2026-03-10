import { createContext, useState, useCallback, type ReactNode } from 'react';

export type Unit = 'ft' | 'm';

const UNITS_KEY = 'zerobreak-units';

export interface UnitsContextValue {
  unit: Unit;
  toggleUnit: () => void;
}

export const UnitsContext = createContext<UnitsContextValue>({
  unit: 'ft',
  toggleUnit: () => {},
});

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<Unit>(() =>
    localStorage.getItem(UNITS_KEY) === 'm' ? 'm' : 'ft',
  );

  const toggleUnit = useCallback(() => {
    setUnit((u: Unit) => {
      const next: Unit = u === 'ft' ? 'm' : 'ft';
      localStorage.setItem(UNITS_KEY, next);
      return next;
    });
  }, []);

  return (
    <UnitsContext.Provider value={{ unit, toggleUnit }}>
      {children}
    </UnitsContext.Provider>
  );
}
