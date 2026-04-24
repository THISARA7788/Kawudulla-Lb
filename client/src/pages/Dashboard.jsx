import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import LibrarianDashboardMain from '../components/dashboard/LibrarianDashboardMain';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Librarian → full dashboard layout
  if (user?.role === 'librarian') {
    return (
      <div className="flex min-h-screen" style={{ background: '#F5F3FC' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col ml-72" style={{ background: '#F5F3FC' }}>
          <TopBar />
          <main className="flex-1 pt-20 pb-4 overflow-y-auto px-4">
            <LibrarianDashboardMain />
          </main>
        </div>
      </div>
    );
  }

  // Student / Teacher → simple dashboard
  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1>Welcome, {user?.name}!</h1>
        <span className={`role-badge ${user?.role}`}>{user?.role}</span>
        <p className="user-email">{user?.email}</p>
        {user?.role === 'teacher' && <p className="role-message">You can view all users.</p>}
        {user?.role === 'student' && <p className="role-message">You can browse and borrow books.</p>}
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Dashboard;
