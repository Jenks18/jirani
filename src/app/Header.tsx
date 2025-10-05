export default function Header({ user }: { user?: { name: string; avatar?: string } }) {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white shadow">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">Jirani</span>
      </div>
      <div className="flex items-center gap-4">
        <input className="border rounded px-2 py-1" placeholder="Search..." />
        <span className="material-icons">notifications</span>
        <div className="flex items-center gap-2 cursor-pointer">
          {user?.avatar && <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full" />}
          <span>{user?.name || "User"}</span>
        </div>
      </div>
    </header>
  );
}
