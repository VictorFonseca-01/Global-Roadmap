import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StrategicTimeline from './pages/StrategicTimeline';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StrategicTimeline />} />
        <Route path="*" element={<StrategicTimeline />} />
      </Routes>
    </Router>
  );
}

export default App;
