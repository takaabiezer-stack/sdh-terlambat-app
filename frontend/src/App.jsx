import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Attendance from './pages/Attendance.jsx';
import Students from './pages/Students.jsx';
import Sanctions from './pages/Sanctions.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Users from './pages/Users.jsx';
import ParentLetters from './pages/ParentLetters.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';

const ProtectedRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !user.role?.permissions?.includes(permission)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<ProtectedRoute permission="attendance:create"><Attendance /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute permission="student:read"><Students /></ProtectedRoute>} />
        <Route path="sanctions" element={<ProtectedRoute permission="sanction:read"><Sanctions /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute permission="report:read"><Reports /></ProtectedRoute>} />
        <Route path="parent-letters" element={<ProtectedRoute permission="parent-call:read"><ParentLetters /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="user:read"><Users /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute permission="setting:read"><Settings /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
