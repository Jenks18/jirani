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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[--color-kenya-green-600] via-[--color-kenya-red-600] to-[--color-kenya-black] rounded-lg"></div>
              <span className="text-2xl font-bold text-[--color-kenya-black]">Majira Ni Wetu</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-700 hover:text-[--color-kenya-green-700] transition">
                Features
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-[--color-kenya-green-700] transition">
                About
              </Link>
              <Link href="#contact" className="text-gray-700 hover:text-[--color-kenya-green-700] transition">
                Contact
              </Link>
              <Link
                href="/maps"
                className="bg-gradient-to-r from-[--color-kenya-green-600] to-[--color-kenya-green-500] text-white px-6 py-2 rounded-lg hover:from-[--color-kenya-green-700] hover:to-[--color-kenya-green-600] transition-all shadow-md"
              >
                Open Map
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated background orbs - Kenya colors */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-[--color-kenya-green-200] rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-[--color-kenya-red-200] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[--color-kenya-green-100] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center z-10">
          <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-[--color-kenya-green-50] to-[--color-kenya-red-50] border border-[--color-kenya-green-200] rounded-full">
            <span className="text-[--color-kenya-green-800] font-semibold">🇰🇪 Empowering Kenyan Communities</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Your Neighborhood,
            <br />
            <span className="bg-gradient-to-r from-[--color-kenya-green-600] via-[--color-kenya-green-500] to-[--color-kenya-red-600] bg-clip-text text-transparent">
              Safer Together
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            AI-powered community safety platform enabling real-time incident reporting and tracking through WhatsApp. 
            <strong className="text-[--color-kenya-green-700]"> No app download required.</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`https://api.whatsapp.com/send?phone=YOUR_WHATSAPP_NUMBER&text=Hello%20Jirani`}
              className="group bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-xl text-lg font-bold hover:from-green-700 hover:to-green-600 transition-all shadow-lg hover:shadow-[--shadow-kenya-green] inline-flex items-center justify-center gap-3"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Chat with Jirani</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            
            <Link
              href="/maps"
              className="bg-white text-[--color-kenya-green-700] border-2 border-[--color-kenya-green-600] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[--color-kenya-green-50] transition-all shadow-md"
            >
              View Live Map →
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[--color-kenya-green-600]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[--color-kenya-green-600]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Privacy First</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[--color-kenya-green-600]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span>WhatsApp Only</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-[--color-kenya-green-50]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How Jirani Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, fast, and accessible to every Kenyan with a phone
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-[--shadow-kenya-green] hover:-translate-y-1 transition-all">
              <div className="absolute -top-6 left-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Report via WhatsApp</h3>
                <p className="text-gray-600 leading-relaxed">
                  Simply message Jirani on WhatsApp to report incidents in your area. No app download, no registration - just send a message.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-[--shadow-kenya-red] hover:-translate-y-1 transition-all">
              <div className="absolute -top-6 left-8">
                <div className="bg-gradient-to-br from-[--color-kenya-red-500] to-[--color-kenya-red-600] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Processing</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our AI automatically understands your report, categorizes the incident, and extracts location information - all in seconds.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-[--shadow-kenya-green] hover:-translate-y-1 transition-all">
              <div className="absolute -top-6 left-8">
                <div className="bg-gradient-to-br from-[--color-kenya-green-600] to-[--color-kenya-green-700] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-time Mapping</h3>
                <p className="text-gray-600 leading-relaxed">
                  View all community incidents on an interactive map in real-time. Stay informed about what&apos;s happening around you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-[--color-kenya-green-100] border border-[--color-kenya-green-300] rounded-full mb-6">
                <span className="text-[--color-kenya-green-800] font-semibold">🇰🇪 Made for Kenya</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Majira Ni Wetu: Our Neighborhood
              </h2>
              
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                We are on a mission to ensure that all Kenyan communities are safe and protected through accessible technology.
              </p>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                <strong className="text-[--color-kenya-green-700]">Majira Ni Wetu</strong> (Our Neighborhood) provides a WhatsApp-based safety platform. 
                Our intelligent assistant, <strong className="text-[--color-kenya-red-600]">Jirani</strong>, enables citizens to report incidents, 
                track local safety issues, and stay connected—all from their phones.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[--color-kenya-green-100] flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-[--color-kenya-green-700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Free & Accessible</h4>
                    <p className="text-gray-600">No cost, no barriers - available to every Kenyan</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[--color-kenya-green-100] flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-[--color-kenya-green-700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Privacy-First Design</h4>
                    <p className="text-gray-600">GDPR compliant with end-to-end encryption</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[--color-kenya-green-100] flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-[--color-kenya-green-700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">AI-Powered Intelligence</h4>
                    <p className="text-gray-600">Smart categorization and instant responses</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CTA Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[--color-kenya-green-600] to-[--color-kenya-green-700] rounded-3xl blur-xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-[--color-kenya-green-600] to-[--color-kenya-green-700] rounded-3xl p-10 text-white shadow-2xl">
                <h3 className="text-3xl font-bold mb-4">Start Using Jirani Today</h3>
                <p className="text-[--color-kenya-green-50] mb-8 text-lg leading-relaxed">
                  Join thousands of Kenyans keeping their neighborhoods safe. No sign-up required - just send a message.
                </p>
                <a
                  href={`https://api.whatsapp.com/send?phone=YOUR_WHATSAPP_NUMBER&text=Hello%20Jirani`}
                  className="inline-block bg-white text-[--color-kenya-green-700] px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg text-lg"
                >
                  Get Started on WhatsApp →
                </a>
                
                {/* Decorative flag colors */}
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[--color-kenya-red-600] rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-[--color-kenya-black] rounded-full opacity-10 blur-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[--color-kenya-green-600] to-[--color-kenya-green-700] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[--color-kenya-red-600] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[--color-kenya-black] rounded-full opacity-5 blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto text-center z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Stay Updated</h2>
          <p className="text-[--color-kenya-green-50] text-lg mb-8">
            Join our newsletter for updates on new features, safety tips, and community stories.
          </p>
          
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-6 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-lg"
              />
              <button
                type="submit"
                className="bg-white text-[--color-kenya-green-700] px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          ) : (
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-6 max-w-md mx-auto">
              <svg className="w-12 h-12 text-white mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white text-lg font-semibold">Thank you for subscribing!</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[--color-kenya-black] text-gray-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[--color-kenya-green-600] via-[--color-kenya-red-600] to-white rounded-lg"></div>
                <h3 className="text-white font-bold text-xl">Majira Ni Wetu</h3>
              </div>
              <p className="text-gray-400 max-w-md leading-relaxed">
                Empowering Kenyan communities through accessible safety technology. 
                Built with ❤️ for Kenya 🇰🇪
              </p>
            </div>
            
            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/maps" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">
                    Live Map
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">
                    Features
                  </Link>
                </li>
                <li>
                  <a href={`https://api.whatsapp.com/send?phone=YOUR_WHATSAPP_NUMBER&text=Hello%20Jirani`} className="text-gray-400 hover:text-[--color-kenya-green-400] transition">
                    Chat with Jirani
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#about" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">
                    Contact
                  </Link>
                </li>
                <li>
                  <a href="/privacy-policy.pdf" className="text-gray-400 hover:text-[--color-kenya-green-400] transition">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              &copy; 2025 Majira Ni Wetu. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Made in Kenya 🇰🇪</span>
              <span>•</span>
              <span>Powered by Jirani AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
