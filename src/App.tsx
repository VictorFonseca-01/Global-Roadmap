import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StrategicTimeline from './pages/StrategicTimeline';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<StrategicTimeline />} />
        <Route path="*" element={<StrategicTimeline />} />
      </Routes>
    </Router>
  );
}

export default App;
