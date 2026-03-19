import { Routes, Route } from 'react-router-dom';
import { LookupPage } from './pages/LookupPage';
import { CalibratePage } from './pages/CalibratePage';
import { LogPage } from './pages/LogPage';
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
        </Routes>
      </UnitsProvider>
    </ErrorBoundary>
  );
}
