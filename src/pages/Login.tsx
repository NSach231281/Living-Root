import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) navigate("/me");
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-brand-bone flex">
      {/* Left visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-earth relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200"
          alt="Living Root"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
        />
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 border-2 border-brand-gold/50 rounded-xl flex items-center justify-center">
              <span className="font-serif text-brand-gold text-2xl font-bold italic">LR</span>
            </div>
            <span className="font-serif text-white/90 text-xl font-bold">Living Root</span>
          </Link>
          <div>
            <p className="font-serif text-brand-gold text-sm uppercase tracking-[0.3em] mb-4">JP Nagar, Bangalore</p>
            <h2 className="font-serif text-white text-5xl font-bold leading-tight mb-6">
              Your neighbourhood<br />social escape.
            </h2>
            <p className="text-white/60 text-lg max-w-sm">
              Events, experiences, and community for the way you want to spend your time.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="w-10 h-10 bg-brand-earth rounded-xl flex items-center justify-center -rotate-6 shadow-xl">
              <span className="font-serif text-brand-gold text-xl font-bold italic">LR</span>
            </div>
            <span className="font-serif text-brand-earth text-xl font-bold">Living Root</span>
          </div>

          <h1 className="font-serif text-3xl text-brand-earth font-bold mb-2">Sign in</h1>
          <p className="text-brand-clay text-sm mb-10">
            New here? An account is created automatically on your first sign-in.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-white border-2 border-brand-border rounded-2xl hover:border-brand-spice hover:shadow-card transition-all duration-200 group"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-bold text-sm uppercase tracking-widest text-brand-earth group-hover:text-brand-spice transition-colors">
              Continue with Google
            </span>
          </button>

          <p className="text-center text-xs text-brand-muted mt-8">
            By signing in you agree to our{" "}
            <a href="#" className="text-brand-spice hover:underline">Terms</a>{" "}
            and{" "}
            <a href="#" className="text-brand-spice hover:underline">Privacy Policy</a>.
          </p>

          <div className="mt-8 pt-8 border-t border-brand-border">
            <Link to="/" className="text-sm text-brand-muted hover:text-brand-spice transition-colors flex items-center gap-2">
              ← Back to Living Root
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
