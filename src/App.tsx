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

export function App() {
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
