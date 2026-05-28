import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleRoadmap from './pages/SimpleRoadmap';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleRoadmap />} />
        <Route path="*" element={<SimpleRoadmap />} />
      </Routes>
    </Router>
  );
}

export default App;
