"use client";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-200">
      <header className="py-8 px-6 border-b border-[--color-kenya-green-600]/10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Contact</h1>
          <Link href="/site" className="text-sm text-[--color-kenya-green-400] hover:underline">Back to home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <section className="bg-black/50 p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Get in touch</h2>
          <p className="text-gray-300 mb-6">If you have questions, partnership inquiries, or want to report a problem with the site, contact us:</p>

          <ul className="space-y-3 text-sm text-gray-300">
            <li><strong>Email:</strong> <a href="mailto:hello@majiraniwetu.org" className="text-[--color-kenya-green-300]">hello@majiraniwetu.org</a></li>
            <li><strong>WhatsApp:</strong> <a href="https://api.whatsapp.com/send?phone=YOUR_WHATSAPP_NUMBER" className="text-[--color-kenya-green-300]">Chat with Jirani</a></li>
            <li><strong>Privacy:</strong> <a href="/privacy-policy.pdf" className="text-[--color-kenya-green-300]">Privacy Policy (PDF)</a></li>
          </ul>
        </section>
      </main>
    </div>
  );
}
