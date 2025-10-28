"use client";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-200">
      <header className="py-8 px-6 border-b border-[--color-kenya-green-600]/10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">About Majira Ni Wetu</h1>
          <Link href="/site" className="text-sm text-[--color-kenya-green-400] hover:underline">Back to home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <section className="bg-black/50 p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
          <p className="text-gray-300 mb-4">
            Majira Ni Wetu empowers Kenyan communities to report and track safety incidents in real time using familiar channels like WhatsApp.
            We combine lightweight mapping, privacy-first design, and AI-assisted workflows to make neighborhoods safer and better informed.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">How it works</h3>
          <p className="text-gray-300">
            Residents report incidents via WhatsApp. Reports are routed to moderators, and incidents are visualized on a live map so communities and local responders can take action.
          </p>
        </section>
      </main>
    </div>
  );
}
