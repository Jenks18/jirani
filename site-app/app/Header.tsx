export default function Header({ user }: { user?: { name: string; avatar?: string } }) {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-black/90">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-[--color-kenya-green-600] via-[--color-kenya-red-600] to-white rounded-lg"></div>
        <span className="font-bold text-lg text-white">Majira Ni Wetu</span>
      </div>
    </header>
  );
}
