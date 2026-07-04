import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LibrarianDashboardMain from '../../components/dashboard/LibrarianDashboardMain';
import StudentDashboardMain from '../../components/dashboard/StudentDashboardMain';

const Dashboard = () => {
  const { user } = useAuth();

  // Librarian → Librarian Dashboard Main
  if (user?.role === 'librarian') {
    return (
      <DashboardLayout>
        <LibrarianDashboardMain />
      </DashboardLayout>
    );
  }

  // Student / Teacher → Student/Teacher Dashboard Main
  return (
    <DashboardLayout>
      <StudentDashboardMain />
    </DashboardLayout>
  );
};

export default Dashboard;
