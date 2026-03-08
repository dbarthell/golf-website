import { Routes, Route } from 'react-router-dom';
import { LookupPage } from './pages/LookupPage';
import { CalibratePage } from './pages/CalibratePage';
import { LogPage } from './pages/LogPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LookupPage />} />
      <Route path="/calibrate" element={<CalibratePage />} />
      <Route path="/log" element={<LogPage />} />
    </Routes>
  );
}
