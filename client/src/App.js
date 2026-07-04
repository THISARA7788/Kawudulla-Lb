// =========================================================================
// WHAT DOES THIS FILE DO?
// This file acts as the main Router configuration for the React application.
// It maps path URLs (like /dashboard, /books, /issue-book) to their respective
// React pages. It wraps routes inside <AuthProvider> so they can access the
// logged-in user state, and guards protected routes using <PrivateRoute>.
// =========================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

/** Page imports */
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import BookManagement from './pages/books/BookManagement';
import IssueBook from './pages/books/IssueBook';
import ReturnBook from './pages/books/ReturnBook';
import CirculationRecord from './pages/books/CirculationRecord';
import PendingRegistration from './pages/auth/PendingRegistration';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ProfileSettings from './pages/profile/ProfileSettings';
import MembersPage from './pages/members/MembersPage';
import FineManagement from './pages/books/FineManagement';
import ReportsPage from './pages/books/ReportsPage';
import QrScannerPage from './pages/books/QrScannerPage';

// PageWrapper component to apply GPU-accelerated page entry animations
const PageWrapper = ({ children }) => (
  <div className="animate-page-fade w-full h-full">
    {children}
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/reset-password/:token" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/books"
          element={
            <PrivateRoute>
              <PageWrapper>
                <BookManagement />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/issue-book"
          element={
            <PrivateRoute>
              <PageWrapper>
                <IssueBook />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/return-book"
          element={
            <PrivateRoute>
              <PageWrapper>
                <ReturnBook />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/circulation"
          element={
            <PrivateRoute>
              <PageWrapper>
                <CirculationRecord />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/pending-registration"
          element={
            <PrivateRoute>
              <PageWrapper>
                <PendingRegistration />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/members"
          element={
            <PrivateRoute>
              <PageWrapper>
                <MembersPage />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/fines"
          element={
            <PrivateRoute>
              <PageWrapper>
                <FineManagement />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <PageWrapper>
                <ReportsPage />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/qr-scanner"
          element={
            <PrivateRoute>
              <PageWrapper>
                <QrScannerPage />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <PageWrapper>
                <ProfileSettings />
              </PageWrapper>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
