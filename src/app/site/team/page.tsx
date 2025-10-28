"use client";
import Link from "next/link";

export default function TeamPage() {
  const members = [
    { name: "Lead Developer", role: "Product & Engineering" },
    { name: "Community Lead", role: "Partnerships & Outreach" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-200">
      <header className="py-8 px-6 border-b border-[--color-kenya-green-600]/10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Team</h1>
          <Link href="/site" className="text-sm text-[--color-kenya-green-400] hover:underline">Back to home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <section className="bg-black/50 p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">People behind Majira Ni Wetu</h2>
          <ul className="space-y-4">
            {members.map((m) => (
              <li key={m.name} className="p-4 bg-gray-900/40 rounded">
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-gray-400">{m.role}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
