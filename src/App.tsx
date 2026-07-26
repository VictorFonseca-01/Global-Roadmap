import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StrategicTimeline from './pages/StrategicTimeline';

// Mock Login component just for tests if it's not implemented yet
function Login() {
  return (
    <div>
      <h1>Acesso Restrito</h1>
      <input placeholder="seu.email@globalparts.com" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StrategicTimeline />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<StrategicTimeline />} />
      </Routes>
    </Router>
  );
}

export default App;
