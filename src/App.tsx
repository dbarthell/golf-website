import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LookupPage } from './pages/LookupPage';
import { CalibratePage } from './pages/CalibratePage';
import { LogPage } from './pages/LogPage';
import { WedgePage } from './pages/WedgePage';
import { WedgeCalibratePage } from './pages/WedgeCalibratePage';
import { BagPage } from './pages/BagPage';
import { BagEditPage } from './pages/BagEditPage';
import { BottomNav } from './components/BottomNav';
import { UnitsProvider } from './context/UnitsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { syncBagToWidget } from './lib/bagBridge';

export function App() {
  // Sync bag data to widget on startup. Delay 1 s to let the Capacitor
  // bridge finish initializing before the native plugin call.
  useEffect(() => {
    const raw = localStorage.getItem('bag-data');
    if (!raw) return;
    const timer = setTimeout(() => syncBagToWidget(raw), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <UnitsProvider>
        <Routes>
          <Route path="/" element={<LookupPage />} />
          <Route path="/calibrate" element={<CalibratePage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/wedges" element={<WedgePage />} />
          <Route path="/wedges/calibrate" element={<WedgeCalibratePage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/bag/edit" element={<BagEditPage />} />
        </Routes>
        <BottomNav />
      </UnitsProvider>
    </ErrorBoundary>
  );
}
