import { Routes, Route } from 'react-router-dom';
import { LookupPage } from './pages/LookupPage';
import { CalibratePage } from './pages/CalibratePage';
import { UnitsProvider } from './context/UnitsContext';

export function App() {
  return (
    <UnitsProvider>
      <Routes>
        <Route path="/" element={<LookupPage />} />
        <Route path="/calibrate" element={<CalibratePage />} />
      </Routes>
    </UnitsProvider>
  );
}
