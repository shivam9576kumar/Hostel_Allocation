import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogIn, GraduationCap, AlertCircle, Mail } from 'lucide-react';

const Login = ({ onSwitchToAdmin }) => {
  const { loginStudent, loading, error, setError } = useAuth();
  const [email, setEmail] = useState('');

  const handleOAuthLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError('Please enter your student Microsoft email address.');
      return;
    }
    try {
      await loginStudent(email.trim());
    } catch (err) {
      // Error handled in AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 mb-4 border border-blue-500/30">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IIT Hostel Allocation</h1>
          <p className="text-sm text-slate-400 mt-1">Student Microsoft Single Sign-On</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Authentication Error</span>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleOAuthLogin} className="space-y-5">
          {/* Microsoft Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Microsoft Account Email (@iit.ac.in)
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="email"
                placeholder="aryan.sharma@iit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-600"
                required
              />
            </div>
          </div>

          {/* Microsoft OAuth Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Authenticating with Azure AD...' : 'Sign in with Microsoft OAuth'}
          </button>
        </form>

        {/* Admin Login Switch Link */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-blue-400 transition"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Admin Portal Sign In
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;

