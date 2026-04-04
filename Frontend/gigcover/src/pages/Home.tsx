import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Zap, Activity, ArrowRight,
  CheckCircle2, Play, Shield, Menu, X,
  Phone, Mail, MapPin, Twitter, Instagram, Linkedin
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/helpers';

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCTA = () => {
    if (isAuthenticated) navigate('/dashboard');
    else { setShowAuth(true); setMobileMenu(false); }
  };

  const navLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Benefits', href: '#benefits' },
    { label: 'Platforms', href: '#platforms' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ──────────────────────────────────────────
          STICKY NAVBAR
      ────────────────────────────────────────── */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-sidebar/95 backdrop-blur-md shadow-xl shadow-black/20"
          : "bg-sidebar"
      )}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <a href="/" className="flex items-center gap-2 shrink-0">
              <img
                src="/favicon.jpg"
                alt="RakshitArtha logo"
                className="w-8 h-8 rounded-xl shadow-lg shadow-primary/30 object-cover"
              />
              <span className="font-extrabold text-xl text-white tracking-tight">
                Rakshit<span className="text-primary">Artha</span>
              </span>
            </a>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleCTA}
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleCTA}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenu(p => !p)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenu && (
          <div className="md:hidden bg-sidebar/98 border-t border-white/10 px-5 py-4 space-y-1 animate-in slide-in-from-top duration-200">
            {navLinks.map(l => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenu(false)}
                className="block py-2.5 text-white/80 hover:text-white text-sm font-medium border-b border-white/5 last:border-0"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <button onClick={handleCTA} className="w-full py-2.5 text-white/80 text-sm font-semibold border border-white/20 rounded-xl">
                Sign In
              </button>
              <button onClick={handleCTA} className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/30">
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ──────────────────────────────────────────
          HERO (add pt-16 to clear the fixed nav)
      ────────────────────────────────────────── */}
      <div className="bg-sidebar relative overflow-hidden pt-16">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-5 pt-14 pb-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary font-semibold text-xs mb-6 border border-primary/30 animate-in fade-in duration-500">
            <Zap className="w-3 h-3" /> AI-Powered Parametric Insurance
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Income Protection for<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-orange-300">
              Gig Delivery Workers
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/60 mb-8 max-w-xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Never lose earnings to bad weather, high AQI, or traffic disruptions again.
            RakshitArtha pays out <strong className="text-white/80">automatically</strong> when disruptions happen — zero manual claims.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <button
              onClick={handleCTA}
              className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/dashboard/demo')}
              className="w-full sm:w-auto bg-white/10 backdrop-blur border border-white/20 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-primary" /> Watch Demo
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-white/50 text-xs">
            {['10,000+ workers covered', 'Zero manual claims', '< 2 min payout', '₹24/week avg premium'].map(b => (
              <div key={b} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Auto-Triggered Claim Card ── */}
      <div className="max-w-sm mx-auto px-4 -mt-5 mb-8 relative z-10">
        <div className="bg-card rounded-2xl shadow-xl shadow-black/10 p-4 flex items-center gap-4 border border-card-border animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">Heavy Rain · Zone 4B · Swiggy</p>
            <p className="text-sm font-bold text-foreground">Claim Auto-Triggered</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Payout</p>
            <p className="text-xl font-extrabold text-foreground">₹350</p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────
          SUPPORTED PLATFORMS
      ────────────────────────────────────────── */}
      <section id="platforms" className="py-10 px-5 max-w-4xl mx-auto">
        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">
          Supported Platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { name: 'Swiggy', emoji: '🧡' },
            { name: 'Zomato', emoji: '🔴' },
            { name: 'Uber Eats', emoji: '🟢' },
          ].map(p => (
            <div key={p.name} className="flex items-center gap-2 bg-card border border-card-border rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-card-foreground">
              {p.emoji} {p.name}
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────
          FEATURES
      ────────────────────────────────────────── */}
      <section id="features" className="py-12 px-5 bg-background border-y border-card-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">Why Choose RakshitArtha?</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Traditional insurance is built for cars, not gig workers. We reimagined protection using real-time data.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Activity, color: 'bg-primary/20 text-primary', title: 'AI Risk Analysis', desc: 'Our engine analyzes weather, AQI & traffic in your specific zone to price risk fairly per week.' },
              { icon: Zap, color: 'bg-blue-900/20 text-blue-300', title: 'Automatic Claims', desc: 'No forms to fill. Parametric threshold breach instantly generates and approves your claim.' },
              { icon: Shield, color: 'bg-green-900/20 text-green-300', title: 'Instant Payouts', desc: 'Once verified against your platform data, funds are credited to your wallet in under 2 minutes.' },
            ].map(f => (
              <div key={f.title} className="bg-card rounded-2xl p-6 border border-card-border hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          HOW IT WORKS
      ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-14 px-5">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
              Parametric protection, <span className="text-primary">simplified.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unlike traditional insurance, parametric pays automatically when a predefined event occurs — no proof of loss required.
            </p>
          </div>
          <div className="relative pl-8">
            <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-card-border" />
            {[
              { step: '1', title: 'Connect your gig platform account', desc: 'Link Swiggy, Zomato, or Uber Eats.' },
              { step: '2', title: 'Select working zones & hours', desc: 'We assess risk based on your specific delivery areas.' },
              { step: '3', title: 'Get protected instantly', desc: 'Cover activates immediately. Payouts are automatic.' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-4 mb-8 last:mb-0 relative">
                <div className="absolute -left-8 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border-2 border-white shadow">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={handleCTA}
              className="bg-primary text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              Get Protected Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          BENEFITS
      ────────────────────────────────────────── */}
      <section id="benefits" className="py-14 px-5 bg-sidebar">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Built for Gig Workers</h2>
            <p className="text-white/50 text-sm">Every feature designed around how you actually work — daily, in zones, on apps.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-10">
            {[
              { title: '₹20–40/week premium', desc: 'Affordable weekly plan based on your risk zone.' },
              { title: 'Zero manual claims', desc: 'Parametric trigger — no paperwork, ever.' },
              { title: 'Zone-level accuracy', desc: 'Risk assessed per your specific delivery zones.' },
              { title: 'Real-time monitoring', desc: 'Weather, AQI & traffic tracked 24/7.' },
              { title: 'Smart scheduling', desc: 'AI tells you the safest hours to maximize income.' },
              { title: 'Instant wallet credit', desc: 'Payout hits your account within 2 minutes.' },
            ].map(b => (
              <div key={b.title} className="flex items-start gap-3 bg-card/40 rounded-xl p-4 border border-card-border">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">{b.title}</p>
                  <p className="text-xs text-white/50">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button
              onClick={handleCTA}
              className="bg-primary text-white px-10 py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              Create Free Account <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────
          FOOTER
      ────────────────────────────────────────── */}
      <footer className="bg-[#0d1117] text-white/60 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5 pt-12 pb-6">

          {/* Footer grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img
                  src="/favicon.jpg"
                  alt="RakshitArtha logo"
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <span className="font-extrabold text-white text-lg">Rakshit<span className="text-primary">Artha</span></span>
              </div>
              <p className="text-xs leading-relaxed text-white/40 mb-4">
                AI-powered parametric insurance for food delivery workers. Protecting your income, automatically.
              </p>
              <div className="flex items-center gap-2">
                {[Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <button key={i} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* About */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">About</p>
              <ul className="space-y-2">
                {['How It Works', 'Our Mission', 'Parametric Insurance', 'Risk Engine', 'Press'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-xs text-white/40 hover:text-white/80 transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform Links */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Platforms</p>
              <ul className="space-y-2">
                {['Swiggy Coverage', 'Zomato Coverage', 'Uber Eats Coverage'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-xs text-white/40 hover:text-white/80 transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Contact</p>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-white/40">support@rakshitartha.in</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-white/40">1800-XXX-XXXX (Toll Free)</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-white/40">Bengaluru, Karnataka, India</span>
                </li>
              </ul>
              <div className="mt-4 space-y-1.5">
                {['Help Center', 'Privacy Policy', 'Terms of Service'].map(l => (
                  <a key={l} href="#" className="block text-xs text-white/40 hover:text-white/80 transition-colors">{l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/30">© 2024 RakshitArtha Platform. All rights reserved. Demo UI — mock data only.</p>
            <div className="flex items-center gap-3 text-xs text-white/30">
              <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
              <span>·</span>
              <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
              <span>·</span>
              <a href="#" className="hover:text-white/60 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
