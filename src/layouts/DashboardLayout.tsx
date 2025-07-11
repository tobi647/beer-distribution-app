import { type ReactNode, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
  userType: 'admin' | 'client';
}

const Header = memo(({ userType, onLogout }: { userType: 'admin' | 'client', onLogout: () => void }) => (
  <nav className="bg-white shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex">
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-xl font-bold text-gray-800">
              Beer Distribution - {userType === 'admin' ? 'Admin' : 'Client'} Dashboard
            </h1>
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={onLogout}
            className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </nav>
));

Header.displayName = 'Header';

const DashboardLayout = ({ children, userType }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    // TODO: Implement logout logic
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header userType={userType} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default memo(DashboardLayout); 