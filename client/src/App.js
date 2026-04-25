import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

/** Page imports */
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BookManagement from './pages/BookManagement';
import IssueBook from './pages/IssueBook';
import ReturnBook from './pages/ReturnBook';
import CirculationRecord from './pages/CirculationRecord';
import PendingRegistration from './pages/PendingRegistration';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProfileSettings from './pages/ProfileSettings';
import MembersPage from './pages/MembersPage';
import FineManagement from './pages/FineManagement';
import ReportsPage from './pages/ReportsPage';
import QrScannerPage from './pages/QrScannerPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/books"
          element={
            <PrivateRoute>
              <BookManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/issue-book"
          element={
            <PrivateRoute>
              <IssueBook />
            </PrivateRoute>
          }
        />
        <Route
          path="/return-book"
          element={
            <PrivateRoute>
              <ReturnBook />
            </PrivateRoute>
          }
        />
        <Route
          path="/circulation"
          element={
            <PrivateRoute>
              <CirculationRecord />
            </PrivateRoute>
          }
        />
        <Route
          path="/pending-registration"
          element={
            <PrivateRoute>
              <PendingRegistration />
            </PrivateRoute>
          }
        />
        <Route
          path="/members"
          element={
            <PrivateRoute>
              <MembersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/fines"
          element={
            <PrivateRoute>
              <FineManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ReportsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/qr-scanner"
          element={
            <PrivateRoute>
              <QrScannerPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfileSettings />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
