"use client";
import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
      setSubscribed(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md shadow-lg border-b border-[--color-kenya-green-600]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[--color-kenya-green-600] via-[--color-kenya-red-600] to-white rounded-lg shadow-lg"></div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white via-[--color-kenya-green-400] to-[--color-kenya-red-400] bg-clip-text text-transparent">Majira Ni Wetu</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="https://maps.majiraniwetu.org"
                className="bg-gradient-to-r from-[--color-kenya-green-600] to-[--color-kenya-green-500] text-white px-6 py-2 rounded-lg hover:from-[--color-kenya-green-700] hover:to-[--color-kenya-green-600] transition-all shadow-lg hover:shadow-[--shadow-kenya-green]"
              >
                Open Map
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="relative max-w-7xl mx-auto text-center z-10">
          <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-[--color-kenya-green-600]/20 to-[--color-kenya-red-600]/20 border border-[--color-kenya-green-500]/50 rounded-full backdrop-blur-sm">
            <span className="text-[--color-kenya-green-400] font-semibold">🇰🇪 Empowering Kenyan Communities</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-white">Your Neighborhood,</span>
            <br />
            <span className="bg-gradient-to-r from-[--color-kenya-green-400] via-[--color-kenya-green-500] to-[--color-kenya-red-500] bg-clip-text text-transparent">
              Safer Together
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            AI-powered community safety platform enabling real-time incident reporting and tracking through WhatsApp. 
            <strong className="text-[--color-kenya-green-400]"> No app download required.</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`https://api.whatsapp.com/send?phone=YOUR_WHATSAPP_NUMBER&text=Hello%20Jirani`}
              className="group bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-xl text-lg font-bold hover:from-green-700 hover:to-green-600 transition-all shadow-lg hover:shadow-[--shadow-kenya-green] inline-flex items-center justify-center gap-3"
            >
              <span>Chat with Jirani</span>
            </a>
            
            <a
              href="https://maps.majiraniwetu.org"
              className="bg-white text-[--color-kenya-green-700] border-2 border-[--color-kenya-green-600] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[--color-kenya-green-50] transition-all shadow-md"
            >
              View Live Map →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-black text-gray-300 py-16 px-4 sm:px-6 lg:px-8 border-t border-[--color-kenya-green-600]/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[--color-kenya-green-600] via-[--color-kenya-red-600] to-white rounded-lg"></div>
                <h3 className="text-white font-bold text-xl">Majira Ni Wetu</h3>
              </div>
              <p className="text-gray-400 max-w-md leading-relaxed">Empowering Kenyan communities through accessible safety technology.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="https://maps.majiraniwetu.org" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">Live Map</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/privacy-policy.pdf" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">Privacy Policy</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
