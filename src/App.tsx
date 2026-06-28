import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StrategicTimeline from './pages/StrategicTimeline';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<StrategicTimeline />} />
          <Route path="*" element={<StrategicTimeline />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
