import { FaBell, FaSearch, FaUser } from 'react-icons/fa';

export default function Header({ user }: { user?: { name: string; avatar?: string } }) {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white shadow">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">Community Wolf</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <input 
            className="border rounded-full px-4 py-2 pl-10 w-64 bg-gray-50 focus:bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Search..." 
            disabled
            title="Search coming soon"
          />
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <button 
          className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors duration-200"
          disabled
          title="Notifications coming soon"
        >
          <FaBell className="text-xl" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 cursor-not-allowed" title="User profile coming soon">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full" />
            ) : (
              <FaUser className="text-gray-400" />
            )}
          </div>
          <span className="text-gray-600">{user?.name || "Guest"}</span>
        </div>
      </div>
    </header>
  );
}
