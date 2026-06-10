import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RepairList from './pages/RepairList';
import NewRepair from './pages/NewRepair';
import NewClaim from './pages/NewClaim';
import ClaimList from './pages/ClaimList';
import RepairDetail from './pages/RepairDetail';
import InventoryList from './pages/InventoryList';
import NewWithdrawal from './pages/NewWithdrawal';
import WithdrawalList from './pages/WithdrawalList';
import WithdrawalDetail from './pages/WithdrawalDetail';
import TransactionList from './pages/TransactionList';
import PurchaseOrderList from './pages/PurchaseOrderList';
import Reports from './pages/Reports';
import StationSearch from './pages/StationSearch';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="repairs" element={<RepairList />} />
            <Route path="repairs/:id" element={<RepairDetail />} />
            <Route path="new" element={<NewRepair />} />
            <Route path="claim" element={<NewClaim />} />
            <Route path="claim-history" element={<ClaimList />} />
            <Route path="claim-history/:id" element={<RepairDetail />} />
            <Route path="inventory" element={<InventoryList />} />
            <Route path="withdrawal" element={<NewWithdrawal />} />
            <Route path="withdrawal-history" element={<WithdrawalList />} />
            <Route path="withdrawal/:id" element={<WithdrawalDetail />} />
            <Route path="transactions" element={<TransactionList />} />
            <Route path="purchase-orders" element={<PurchaseOrderList />} />
            <Route path="reports" element={<Reports />} />
            <Route path="stations" element={<StationSearch />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
