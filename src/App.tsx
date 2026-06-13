import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import RoomManagement from './components/RoomManagement';
import RoomAllocation from './components/RoomAllocation';
import FeeManagement from './components/FeeManagement';
import ComplaintManagement from './components/ComplaintManagement';
import Reports from './components/Reports';
import { Page } from './types';

function AppContent() {
  const { session, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'students': return <StudentManagement />;
      case 'rooms': return <RoomManagement />;
      case 'allocations': return <RoomAllocation />;
      case 'fees': return <FeeManagement />;
      case 'complaints': return <ComplaintManagement />;
      case 'reports': return <Reports />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
