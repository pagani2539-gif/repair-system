import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RepairList from './pages/RepairList';
import NewRepair from './pages/NewRepair';
import NewClaim from './pages/NewClaim';
import ClaimList from './pages/ClaimList';
import RepairDetail from './pages/RepairDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="repairs" element={<RepairList />} />
          <Route path="repairs/:id" element={<RepairDetail />} />
          <Route path="new" element={<NewRepair />} />
          <Route path="claim" element={<NewClaim />} />
          <Route path="claim-history" element={<ClaimList />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
