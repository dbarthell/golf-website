import { Routes, Route } from 'react-router-dom';
import { LookupPage } from './pages/LookupPage';
import { CalibratePage } from './pages/CalibratePage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LookupPage />} />
      <Route path="/calibrate" element={<CalibratePage />} />
    </Routes>
  );
}
