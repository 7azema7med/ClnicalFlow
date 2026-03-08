import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, Users, ClipboardList, LogOut, Languages, 
  PlusCircle, Search, FileText, Download, Trash2, 
  ShieldCheck, ShieldAlert, UserPlus, Stethoscope,
  HeartPulse, Baby, Bone, Thermometer, User,
  Building2, Clock, X, Send, ChevronRight, ChevronLeft, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { User as UserType, Patient, ClinicType, Role } from './types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'sonner';
import { ThemeProvider, useTheme } from 'next-themes';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell
} from 'recharts';

import { chatWithAI, extractPatientData } from './services/gemini';

// --- Components ---

function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText,
  variant = 'danger'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  confirmText?: string; 
  cancelText?: string;
  variant?: 'danger' | 'primary'
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{message}</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose}>{cancelText || 'Cancel'}</Button>
            <Button 
              onClick={() => { onConfirm(); onClose(); }}
              className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmText || 'Confirm'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void 
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium text-gray-500">
        {currentPage} / {totalPages}
      </span>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AIChatbot() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAI(input, messages);
      setMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error connecting to AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 md:w-96 h-[500px] flex flex-col mb-4 overflow-hidden"
          >
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="font-bold">{t('ai_assistant')}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex",
                  m.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    m.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-gray-100 text-gray-800 rounded-tl-none"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                placeholder={t('chat_placeholder')}
                className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
      </button>
    </div>
  );
}

const Button = ({ className, variant = 'primary', size = 'md', ...props }: any) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
      {...props}
    />
  );
};

const Input = ({ label, error, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-red-500",
        props.className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
      {...props}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
    >
      <div className="relative">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-8 h-8 text-indigo-600" />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center"
      >
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('app_name')}</h2>
        <p className="text-gray-500 text-sm mt-1 font-medium">{t('loading') || 'Initializing clinical environment...'}</p>
      </motion.div>
    </motion.div>
  );
}

function LoginPage({ onLogin, onSwitch, toggleLanguage }: any) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ username: '', password: '', clinicCode: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) onLogin(data.user);
      else setError(data.error);
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      {/* Left Side: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative z-10 bg-white">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full mx-auto lg:mx-0"
        >
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Activity className="text-white w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('app_name')}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="rounded-xl">
              <Languages className="w-4 h-4 mr-2" />
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('welcome_back') || 'Welcome Back'}</h2>
            <p className="text-gray-500">{t('login_subtitle') || 'Enter your credentials to access the clinic management system.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">{t('username')}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">{t('password')}</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {form.username !== 'hazem' && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">{t('clinic_code')}</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                    placeholder="MED-01"
                    value={form.clinicCode}
                    onChange={(e) => setForm({ ...form, clinicCode: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}
            
            <Button 
              type="submit" 
              className="w-full py-4 rounded-2xl shadow-lg shadow-indigo-100 text-lg font-bold" 
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Activity className="w-6 h-6" />
                </motion.div>
              ) : t('login')}
            </Button>
          </form>

          <div className="mt-10 text-center lg:text-left">
            <p className="text-gray-500 text-sm">
              {t('no_account') || "Don't have an account?"}{' '}
              <button onClick={onSwitch} className="text-indigo-600 font-bold hover:underline">
                {t('register')}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side: Visuals */}
      <div className="hidden lg:block relative bg-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_100%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative mb-12"
          >
            <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-3xl border border-white/20">
              <Activity className="w-32 h-32 text-white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 border-2 border-dashed border-white/20 rounded-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center"
          >
            <h3 className="text-4xl font-bold mb-6 leading-tight">
              {t('hero_title') || 'Precision Management for Modern Healthcare'}
            </h3>
            <p className="text-indigo-100 text-lg max-w-md mx-auto leading-relaxed">
              {t('hero_desc') || 'Streamline your clinic operations with AI-powered registration, real-time analytics, and professional medical reporting.'}
            </p>
          </motion.div>

          <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-indigo-200 text-xs font-bold uppercase tracking-widest">
            <span>© 2024 CLINICFLOW</span>
            <span>SECURE ACCESS</span>
            <span>V2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    // @ts-ignore
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppContent />
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // WebSocket setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_PATIENT') {
        setTodayCount(prev => prev + 1);
        toast.success(`${t('new_patient_arrived') || 'New Patient Arrived'}: ${data.patient.name_ar}`, {
          description: `${t('ticket')}: #${data.patient.ticket_number}`,
        });
        // Play notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      }
    };

    ws.current = socket;
    return () => socket.close();
  }, [t]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch('/api/patients?date_range=today');
        const patients = await res.json();
        setTodayCount(patients.length);
      } catch (e) {}
      setTimeout(() => setIsAppLoading(false), 2000);
    };
    fetchInitialData();
  }, []);

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(nextLng);
    document.dir = nextLng === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const handleLogin = (userData: UserType) => {
    setUser(userData);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative">
      <AnimatePresence>
        {isAppLoading && <LoadingScreen key="loading" />}
      </AnimatePresence>

      {!isAppLoading && (
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <LoginPage 
              key="login"
              onLogin={handleLogin} 
              onSwitch={() => setView('register')} 
              toggleLanguage={toggleLanguage} 
            />
          )}
          {view === 'register' && (
            <RegisterPage 
              key="register"
              onBack={() => setView('login')} 
              toggleLanguage={toggleLanguage} 
            />
          )}
          {view === 'dashboard' && user && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex flex-col"
            >
              <Navbar user={user} onLogout={handleLogout} toggleLanguage={toggleLanguage} todayCount={todayCount} />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={user?.role}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {user?.role === 'admin' && <AdminDashboard user={user} />}
                    {user?.role === 'patient_reg' && <PatientRegDashboard user={user} />}
                    {user?.role === 'clinic_reg' && <ClinicRegDashboard user={user} />}
                  </motion.div>
                </AnimatePresence>
              </main>
              <AIChatbot />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function RegisterPage({ onBack, toggleLanguage }: any) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ name: '', username: '', password: '', clinicCode: '', role: 'patient_reg' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) onBack();
      else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      {/* Left Side: Visuals */}
      <div className="hidden lg:block relative bg-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_100%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="mb-12"
          >
            <div className="w-48 h-48 bg-white/10 rounded-[3rem] rotate-12 flex items-center justify-center backdrop-blur-3xl border border-white/20">
              <UserPlus className="w-24 h-24 text-white -rotate-12" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center"
          >
            <h3 className="text-4xl font-bold mb-6 leading-tight">
              {t('join_us') || 'Join the Future of Healthcare'}
            </h3>
            <p className="text-indigo-100 text-lg max-w-md mx-auto leading-relaxed">
              {t('register_desc') || 'Create your account to start managing patients, tracking clinic performance, and utilizing AI-driven medical assistance.'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative z-10 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full mx-auto lg:ml-0"
        >
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Activity className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('app_name')}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="rounded-xl">
              <Languages className="w-4 h-4 mr-2" />
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('create_account') || 'Create Account'}</h2>
            <p className="text-gray-500">{t('register_subtitle') || 'Fill in the details to register your clinic account.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">{t('full_name') || 'Full Name'}</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">{t('username')}</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">{t('password')}</label>
                <input 
                  type="password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 ml-1">{t('clinic_code')}</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                    placeholder="MED-01"
                    value={form.clinicCode}
                    onChange={(e) => setForm({ ...form, clinicCode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 ml-1">{t('role')}</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="patient_reg">{t('patient_reg')}</option>
                    <option value="clinic_reg">{t('clinic_reg')}</option>
                  </select>
                </div>
              </div>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}
            
            <div className="pt-2 space-y-3">
              <Button 
                type="submit" 
                className="w-full py-4 rounded-2xl shadow-lg shadow-indigo-100 text-lg font-bold" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Activity className="w-6 h-6" />
                  </motion.div>
                ) : t('register')}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                className="w-full py-4 rounded-2xl font-bold" 
                onClick={onBack}
              >
                {t('back_to_login') || 'Back to Login'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function Navbar({ user, onLogout, toggleLanguage, todayCount }: any) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">{t('app_name')}</span>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {todayCount} {t('patients_today') || 'Patients Today'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? <HeartPulse className="w-4 h-4 text-yellow-400" /> : <Clock className="w-4 h-4 text-gray-600" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
              <Languages className="w-4 h-4 mr-2 text-indigo-600" />
              <span className="font-semibold dark:text-gray-300">{i18n.language === 'en' ? 'العربية' : 'English'}</span>
            </Button>
            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-1 sm:mx-2" />
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-600">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user?.name}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">{t(user?.role)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// --- Dashboards ---

function AdminDashboard({ user }: { user: UserType }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [performance, setPerformance] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [newClinic, setNewClinic] = useState({ name: '', code: '', type: 'medicine' });
  const [registrationFields, setRegistrationFields] = useState<any[]>([]);
  const [newField, setNewField] = useState({ label_en: '', label_ar: '', field_key: '', type: 'text', options: '', is_required: false });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchData = async () => {
    try {
      const [sRes, uRes, pRes, setRes, perfRes, logsRes, clinRes, fieldRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/patients'),
        fetch('/api/settings'),
        fetch('/api/admin/performance'),
        fetch('/api/admin/logs'),
        fetch('/api/clinics'),
        fetch('/api/admin/registration-fields')
      ]);
      
      if (sRes.ok) setStats(await sRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (pRes.ok) setPatients(await pRes.json());
      if (setRes.ok) setSettings(await setRes.json());
      if (perfRes.ok) setPerformance(await perfRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (clinRes.ok) setClinics(await clinRes.json());
      if (fieldRes.ok) setRegistrationFields(await fieldRes.json());
    } catch (e) {
      console.error("Failed to fetch admin data", e);
      toast.error(t('fetch_error') || 'Failed to load dashboard data');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/clinics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClinic)
    });
    if (res.ok) {
      setNewClinic({ name: '', code: '', type: 'medicine' });
      fetchData();
    }
  };

  const deleteClinic = async (id: number) => {
    if (!confirm('Delete clinic?')) return;
    await fetch(`/api/clinics/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const updateSetting = async (key: string, value: string) => {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    fetchData();
  };

  const toggleUser = async (id: number, current: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current })
    });
    fetchData();
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = newField.options.split(',').map(o => o.trim()).filter(o => o);
    const res = await fetch('/api/admin/registration-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newField, options })
    });
    if (res.ok) {
      setNewField({ label_en: '', label_ar: '', field_key: '', type: 'text', options: '', is_required: false });
      fetchData();
      toast.success(t('field_added') || 'Registration field added');
    }
  };

  const deleteField = async (id: number) => {
    if (!confirm('Delete this field?')) return;
    await fetch(`/api/admin/registration-fields/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingUser)
    });
    if (res.ok) {
      setEditingUser(null);
      fetchData();
      toast.success(t('user_updated') || 'User updated successfully');
    }
  };

  const resetPassword = async (userId: number) => {
    const newPass = prompt(t('enter_new_password') || 'Enter new password:');
    if (!newPass) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass })
    });
    toast.success(t('password_reset_success') || 'Password reset successfully');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(patients.map(p => ({
      ID: p.id,
      Name: p.name_ar,
      Age: `${p.age_value} ${p.age_unit}`,
      Phone: p.phone,
      NationalID: p.national_id,
      Ticket: p.ticket_number,
      Clinic: p.clinic_type,
      Complaint: p.complaint,
      Diagnosis: p.diagnosis,
      Treatment: p.treatment,
      Status: p.status,
      Date: p.created_at
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "Clinic_Data.xlsx");
  };

  const todayCount = patients.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length;

  // Process performance data for chart
  const chartData = performance.reduce((acc: any[], curr: any) => {
    let entry = acc.find(a => a.date === curr.date);
    if (!entry) {
      entry = { date: curr.date };
      acc.push(entry);
    }
    entry[curr.clinic_type] = curr.count;
    return acc;
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">{t('total_patients')}</p>
              <p className="text-4xl font-bold mt-2">{patients.length}</p>
            </div>
            <Users className="w-8 h-8 text-indigo-200 opacity-50" />
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">{t('today_patients')}</p>
              <p className="text-4xl font-bold mt-2">{todayCount}</p>
            </div>
            <Activity className="w-8 h-8 text-emerald-200 opacity-50" />
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{t('system_status')}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className={cn(
                  "w-3 h-3 rounded-full animate-pulse",
                  settings.system_maintenance === '1' ? "bg-orange-500" : "bg-green-500"
                )} />
                <p className="text-xl font-bold text-gray-900">
                  {settings.system_maintenance === '1' ? t('maintenance_mode') : t('online') || 'Online'}
                </p>
              </div>
            </div>
            <ShieldCheck className="w-8 h-8 text-indigo-100" />
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{t('registration') || 'Registration'}</p>
              <p className={cn(
                "text-xl font-bold mt-2",
                settings.registration_enabled === '1' ? "text-green-600" : "text-red-600"
              )}>
                {settings.registration_enabled === '1' ? t('enabled') : t('disabled')}
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-indigo-100" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              {t('clinic_performance_over_time')}
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="medicine" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="dermatology" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ent" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="orthopedics" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="pediatrics" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {t('manage_clinics')}
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddClinic} className="flex gap-4 mb-6">
                <input 
                  type="text" 
                  placeholder={t('clinic_name')}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={newClinic.name}
                  onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                  required
                />
                <input 
                  type="text" 
                  placeholder={t('clinic_code_short')}
                  className="w-32 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={newClinic.code}
                  onChange={(e) => setNewClinic({ ...newClinic, code: e.target.value })}
                  required
                />
                <select 
                  className="w-40 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={newClinic.type}
                  onChange={(e) => setNewClinic({ ...newClinic, type: e.target.value })}
                >
                  {['medicine', 'dermatology', 'ent', 'orthopedics', 'pediatrics'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <Button type="submit">{t('add_clinic')}</Button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {clinics.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.code} • {c.type}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteClinic(c.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {t('users')}
              </h2>
              <Button onClick={exportExcel} variant="secondary" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                {t('download_excel')}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('name')}</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('role')}</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('clinic_code')}</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('last_login') || 'Last Login'}</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('status')}</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t(u.role)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{u.clinic_code}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {u.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingUser(u)}>
                          <UserPlus className="w-4 h-4 text-indigo-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => resetPassword(u.id)}>
                          <Clock className="w-4 h-4 text-orange-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleUser(u.id, u.is_active)}>
                          {u.is_active ? <ShieldAlert className="w-4 h-4 text-orange-500" /> : <ShieldCheck className="w-4 h-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteUser(u.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-lg font-bold flex items-center gap-2 dark:text-white">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                {t('registration_fields_management') || 'Registration Fields Management'}
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddField} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <input 
                  type="text" 
                  placeholder={t('label_en') || 'Label (EN)'}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                  value={newField.label_en}
                  onChange={(e) => setNewField({ ...newField, label_en: e.target.value })}
                  required
                />
                <input 
                  type="text" 
                  placeholder={t('label_ar') || 'Label (AR)'}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                  value={newField.label_ar}
                  onChange={(e) => setNewField({ ...newField, label_ar: e.target.value })}
                  required
                />
                <input 
                  type="text" 
                  placeholder={t('field_key') || 'Field Key (unique)'}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                  value={newField.field_key}
                  onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                  required
                />
                <select 
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                </select>
                {newField.type === 'select' && (
                  <input 
                    type="text" 
                    placeholder={t('options_comma') || 'Options (comma separated)'}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                    value={newField.options}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    required
                  />
                )}
                <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                  />
                  {t('required') || 'Required'}
                </label>
                <Button type="submit" className="lg:col-span-3">{t('add_field') || 'Add Field'}</Button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {registrationFields.map(f => (
                  <div key={f.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{f.label_ar} / {f.label_en}</p>
                      <p className="text-xs text-gray-500">{f.type} • {f.field_key}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteField(f.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              {t('system_settings')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{t('registration_control')}</span>
                <button 
                  onClick={() => updateSetting('registration_enabled', settings.registration_enabled === '1' ? '0' : '1')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all",
                    settings.registration_enabled === '1' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}
                >
                  {settings.registration_enabled === '1' ? t('enabled') : t('disabled')}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{t('maintenance_mode')}</span>
                <button 
                  onClick={() => updateSetting('system_maintenance', settings.system_maintenance === '1' ? '0' : '1')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all",
                    settings.system_maintenance === '1' ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-600"
                  )}
                >
                  {settings.system_maintenance === '1' ? t('on') : t('off')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              {t('clinic_performance')}
            </h3>
            <div className="space-y-4">
              {['medicine', 'dermatology', 'ent', 'orthopedics', 'pediatrics'].map(type => {
                const count = stats.find(s => s.clinic_type === type)?.count || 0;
                const percentage = patients.length > 0 ? (count / patients.length) * 100 : 0;
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{t(type)}</span>
                      <span className="text-gray-500 font-bold">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-indigo-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              {t('recent_activity')}
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.map(log => (
                <div key={log.id} className="border-l-2 border-indigo-500 pl-4 py-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-indigo-600 uppercase">{log.action}</p>
                    <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{log.details}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">by @{log.username}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-lg font-bold">{t('edit_user') || 'Edit User'}</h3>
                <button onClick={() => setEditingUser(null)} className="hover:bg-white/20 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <Input 
                  label={t('name')} 
                  value={editingUser.name} 
                  onChange={(e: any) => setEditingUser({ ...editingUser, name: e.target.value })} 
                  required 
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('role')}</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="patient_reg">Patient Registration</option>
                    <option value="clinic_reg">Clinic Registration</option>
                  </select>
                </div>
                <Input 
                  label={t('clinic_code')} 
                  value={editingUser.clinic_code} 
                  onChange={(e: any) => setEditingUser({ ...editingUser, clinic_code: e.target.value })} 
                  required 
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>{t('cancel')}</Button>
                  <Button type="submit">{t('save_changes') || 'Save Changes'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PatientRegDashboard({ user }: { user: UserType }) {
  const { t, i18n } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [registrationFields, setRegistrationFields] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState<any>({
    name_ar: '', age_value: '', age_unit: 'year', phone: '', national_id: '',
    complaint: '', chronic_illnesses: '', medications: '', clinic_type: 'medicine',
    vitals_data: {}
  });

  const fetchFields = async () => {
    try {
      const res = await fetch('/api/admin/registration-fields');
      if (res.ok) setRegistrationFields(await res.json());
    } catch (e) {}
  };

  const handleNameChange = (val: string) => {
    setForm({ ...form, name_ar: val });
    if (val.length > 1) {
      const uniqueNames = Array.from(new Set(patients.map(p => p.name_ar))) as string[];
      const filtered = uniqueNames.filter(n => n.includes(val)).slice(0, 5);
      setNameSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (name: string) => {
    setForm({ ...form, name_ar: name });
    setShowSuggestions(false);
    // Optionally pre-fill other data if we find the patient
    const existing = patients.find(p => p.name_ar === name);
    if (existing) {
      setForm(prev => ({
        ...prev,
        age_value: existing.age_value,
        age_unit: existing.age_unit,
        phone: existing.phone || '',
        national_id: existing.national_id || '',
        chronic_illnesses: existing.chronic_illnesses || '',
        medications: existing.medications || ''
      }));
      toast.info(t('patient_data_prefilled') || 'Patient data pre-filled from history');
    }
  };

  const handleSmartFill = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    const data = await extractPatientData(aiInput);
    if (data) {
      setForm((prev: any) => ({
        ...prev,
        ...Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== null))
      }));
      setAiInput('');
    }
    setAiLoading(false);
  };

  const fetchPatients = async () => {
    const res = await fetch('/api/patients');
    setPatients(await res.json());
  };

  useEffect(() => { 
    fetchPatients(); 
    fetchFields();
  }, []);

  const filteredPatients = patients.filter(p => 
    p.name_ar.toLowerCase().includes(search.toLowerCase()) || 
    p.ticket_number.toString().includes(search)
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        name_ar: '', age_value: '', age_unit: 'year', phone: '', national_id: '',
        complaint: '', chronic_illnesses: '', medications: '', clinic_type: 'medicine',
        vitals_data: {}
      });
      fetchPatients();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && showForm) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, form]);

  const updateVitals = (field: string, value: any) => {
    setForm({ ...form, vitals_data: { ...form.vitals_data, [field]: value } });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('patient_reg')}</h2>
          <p className="text-gray-500 text-sm">{t('manage_registrations') || 'Manage and register new patients'}</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
            <PlusCircle className="w-5 h-5" />
            {t('register')}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
          >
            <div className="bg-indigo-50 p-6 border-b border-indigo-100">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {t('smart_fill_label') || 'AI Smart Fill (Paste patient info here)'}
                  </label>
                  <textarea 
                    className="w-full p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 text-sm h-20 resize-none"
                    placeholder={t('smart_fill_placeholder') || 'e.g., Ahmed, 30 years, has fever and cough since yesterday...'}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSmartFill} 
                  disabled={aiLoading || !aiInput.trim()}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6"
                >
                  {aiLoading ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Activity className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <Activity className="w-5 h-5" />
                  )}
                  {t('smart_fill_btn') || 'Smart Fill'}
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="relative">
                  <Input 
                    label={t('full_name_ar')} 
                    value={form.name_ar} 
                    onChange={(e: any) => handleNameChange(e.target.value)} 
                    required 
                    autoComplete="off"
                  />
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                      >
                        {nameSuggestions.map((name, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectSuggestion(name)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                          >
                            {name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex gap-2 items-end">
                  <Input label={t('age')} type="number" value={form.age_value} onChange={(e: any) => setForm({ ...form, age_value: e.target.value })} required className="flex-1" />
                  <Select 
                    value={form.age_unit} 
                    onChange={(e: any) => setForm({ ...form, age_unit: e.target.value })}
                    options={[
                      { label: t('years'), value: 'year' },
                      { label: t('months'), value: 'month' },
                      { label: t('weeks'), value: 'week' }
                    ]}
                    className="w-32"
                  />
                </div>
                <Input label={t('phone')} value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
                <Input label={t('national_id')} value={form.national_id} onChange={(e: any) => setForm({ ...form, national_id: e.target.value })} />
                <Select 
                  label={t('clinic')} 
                  value={form.clinic_type} 
                  onChange={(e: any) => setForm({ ...form, clinic_type: e.target.value })}
                  options={[
                    { label: t('medicine'), value: 'medicine' },
                    { label: t('dermatology'), value: 'dermatology' },
                    { label: t('ent'), value: 'ent' },
                    { label: t('orthopedics'), value: 'orthopedics' },
                    { label: t('pediatrics'), value: 'pediatrics' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label={t('complaint')} value={form.complaint} onChange={(e: any) => setForm({ ...form, complaint: e.target.value })} required />
                <Input label={t('chronic_illnesses')} value={form.chronic_illnesses} onChange={(e: any) => setForm({ ...form, chronic_illnesses: e.target.value })} />
                <Input label={t('medications')} value={form.medications} onChange={(e: any) => setForm({ ...form, medications: e.target.value })} />
              </div>

              {/* Dynamic Fields */}
              {registrationFields.length > 0 && (
                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    {t('additional_fields') || 'Additional Fields'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {registrationFields.map((field) => (
                      <div key={field.id}>
                        {field.type === 'select' ? (
                          <Select
                            label={i18n.language === 'ar' ? field.label_ar : field.label_en}
                            value={form.vitals_data[field.field_key] || ''}
                            onChange={(e: any) => updateVitals(field.field_key, e.target.value)}
                            options={field.options.map((opt: string) => ({ label: opt, value: opt }))}
                            required={!!field.is_required}
                          />
                        ) : (
                          <Input
                            label={i18n.language === 'ar' ? field.label_ar : field.label_en}
                            type={field.type}
                            value={form.vitals_data[field.field_key] || ''}
                            onChange={(e: any) => updateVitals(field.field_key, e.target.value)}
                            required={!!field.is_required}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-indigo-600" />
                  {t('vitals')} - {t(form.clinic_type)}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {form.clinic_type === 'medicine' && (
                    <>
                      <Input label={t('pulse')} onChange={(e: any) => updateVitals('pulse', e.target.value)} />
                      <Input label={t('bp')} onChange={(e: any) => updateVitals('bp', e.target.value)} />
                      <Input label={t('rbs')} onChange={(e: any) => updateVitals('rbs', e.target.value)} />
                      <Input label={t('past_history')} onChange={(e: any) => updateVitals('past_history', e.target.value)} />
                      <Input label={t('symptom_start')} type="date" onChange={(e: any) => updateVitals('symptom_start', e.target.value)} />
                      <Input label={t('observations')} onChange={(e: any) => updateVitals('observations', e.target.value)} />
                    </>
                  )}
                  {form.clinic_type === 'dermatology' && (
                    <>
                      <Input label={t('symptom_start')} type="date" onChange={(e: any) => updateVitals('symptom_start', e.target.value)} />
                      <Input label={t('hereditary')} onChange={(e: any) => updateVitals('hereditary', e.target.value)} />
                      <Input label={t('sensations')} onChange={(e: any) => updateVitals('sensations', e.target.value)} />
                      <Input label={t('residence')} onChange={(e: any) => updateVitals('residence', e.target.value)} />
                      <Input label={t('job')} onChange={(e: any) => updateVitals('job', e.target.value)} />
                      <Input label={t('comments')} onChange={(e: any) => updateVitals('comments', e.target.value)} />
                    </>
                  )}
                  {form.clinic_type === 'ent' && (
                    <>
                      <Input label={t('residence')} onChange={(e: any) => updateVitals('residence', e.target.value)} />
                      <Input label={t('job')} onChange={(e: any) => updateVitals('job', e.target.value)} />
                      <Input label={t('symptom_start')} type="date" onChange={(e: any) => updateVitals('symptom_start', e.target.value)} />
                      <Input label={t('comments')} onChange={(e: any) => updateVitals('comments', e.target.value)} />
                    </>
                  )}
                  {form.clinic_type === 'orthopedics' && (
                    <>
                      <Input label={t('symptom_start')} type="date" onChange={(e: any) => updateVitals('symptom_start', e.target.value)} />
                      <Input label={t('injuries')} onChange={(e: any) => updateVitals('injuries', e.target.value)} />
                      <Input label={t('comments')} onChange={(e: any) => updateVitals('comments', e.target.value)} />
                    </>
                  )}
                  {form.clinic_type === 'pediatrics' && (
                    <>
                      <Input label={t('symptom_start')} type="date" onChange={(e: any) => updateVitals('symptom_start', e.target.value)} />
                      <Input label={t('hereditary')} onChange={(e: any) => updateVitals('hereditary', e.target.value)} />
                      <Input label={t('height')} type="number" onChange={(e: any) => updateVitals('height', e.target.value)} />
                      <Input label={t('weight')} type="number" onChange={(e: any) => updateVitals('weight', e.target.value)} />
                      <Input label={t('vaccinations')} onChange={(e: any) => updateVitals('vaccinations', e.target.value)} />
                      <Input label={t('nutritional')} onChange={(e: any) => updateVitals('nutritional', e.target.value)} />
                      <Input label={t('comments')} onChange={(e: any) => updateVitals('comments', e.target.value)} />
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
                <Button type="submit">{t('save')}</Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {paginatedPatients.map((p, i) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  #{p.ticket_number}
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  p.status === 'waiting' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                )}>
                  {t(p.status)}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{p.name_ar}</h3>
              <p className="text-sm text-gray-500 mt-1">{p.age_value} {t(p.age_unit + 's')} • {t(p.clinic_type)}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <Button variant="ghost" size="sm" className="text-indigo-600 font-bold p-0 h-auto">
                  {t('view_details') || 'Details'}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </motion.div>
  );
}

function ClinicRegDashboard({ user }: { user: UserType }) {
  const { t, i18n } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('waiting');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [clinicFilter, setClinicFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [form, setForm] = useState({
    diagnosis: '', decision: '', treatment: '', referral: '', notes: '', doctor_signature: ''
  });

  const fetchPatients = async () => {
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter === 'all' ? '' : statusFilter,
        date_range: dateFilter,
        clinic_type: clinicFilter === 'all' ? '' : clinicFilter
      });
      const res = await fetch(`/api/patients?${params.toString()}`);
      if (res.ok) {
        setPatients(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch patients", e);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, statusFilter, dateFilter, clinicFilter]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_PATIENT' || data.type === 'PATIENT_UPDATED' || data.type === 'PATIENT_DELETED') {
        fetchPatients();
      }
    };

    return () => socket.close();
  }, []);

  const totalPages = Math.ceil(patients.length / itemsPerPage);
  const paginatedPatients = patients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelect = (p: Patient) => {
    setSelected(p);
    setForm({
      diagnosis: p.diagnosis || '',
      decision: p.decision || '',
      treatment: p.treatment || '',
      referral: p.referral || '',
      notes: p.notes || '',
      doctor_signature: p.doctor_signature || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch(`/api/patients/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status: 'checked' })
    });
    if (res.ok) {
      setSelected(null);
      fetchPatients();
    }
  };

  const downloadPrescription = (p: Patient) => {
    const doc = new jsPDF();
    const isAr = i18n.language === 'ar';
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(t('prescription_header') || 'CLINICFLOW PRESCRIPTION', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${t('clinic_address') || '123 Medical St, Health City'} | ${t('contact_info') || '+123 456 789'}`, 105, 30, { align: 'center' });
    
    // Logo Placeholder
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.circle(25, 20, 10, 'S');
    doc.line(20, 20, 30, 20);
    doc.line(25, 15, 25, 25);

    // Patient Info Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(t('patient_details'), 20, 55);
    doc.setLineWidth(0.5);
    doc.line(20, 57, 190, 57);
    
    const details = [
      [t('name'), p.name_ar],
      [t('age'), `${p.age_value} ${t(p.age_unit + 's')}`],
      [t('ticket_number'), `#${p.ticket_number}`],
      [t('clinic'), t(p.clinic_type)],
      [t('date'), new Date(p.created_at).toLocaleString()]
    ];

    autoTable(doc, {
      startY: 65,
      body: details,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    // Medical Info Section
    const lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text(t('medical_report'), 20, lastY);
    doc.line(20, lastY + 2, 190, lastY + 2);

    const medical = [
      [t('diagnosis'), p.diagnosis || '-'],
      [t('treatment'), p.treatment || '-'],
      [t('decision'), p.decision || '-'],
      [t('referral'), p.referral || '-'],
      [t('notes'), p.notes || '-']
    ];

    autoTable(doc, {
      startY: lastY + 10,
      body: medical,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, fillColor: [249, 250, 251] } }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(12);
    doc.text(t('signature'), 140, finalY);
    doc.setFontSize(11);
    doc.text(p.doctor_signature || '________________', 140, finalY + 10);

    doc.save(`Prescription_${p.ticket_number}.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-1 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            {t('waiting')}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder={t('search_placeholder')}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
            >
              <option value="all">{t('all_clinics') || 'All Clinics'}</option>
              {['medicine', 'dermatology', 'ent', 'orthopedics', 'pediatrics'].map(c => (
                <option key={c} value={c}>{t(c)}</option>
              ))}
            </select>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="waiting">{t('waiting')}</option>
              <option value="checked">{t('checked')}</option>
              <option value="all">{t('all_status') || 'All Status'}</option>
            </select>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="today">{t('today')}</option>
              <option value="week">{t('this_week') || 'This Week'}</option>
              <option value="all">{t('all_time') || 'All Time'}</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {paginatedPatients.filter(p => p.status === 'waiting').map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(p)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all group",
                  selected?.id === p.id 
                    ? "bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200" 
                    : "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm"
                )}
              >
              <div className="flex justify-between items-start mb-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-xs">
                  #{p.ticket_number}
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase">
                  {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name_ar}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase">
                  {t(p.clinic_type)}
                </span>
                <span className="text-[10px] text-gray-400 line-clamp-1">{p.complaint}</span>
              </div>
            </motion.button>
          ))}
          {patients.filter(p => p.status === 'waiting').length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 text-sm">{t('no_patients')}</p>
            </div>
          )}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            {t('checked')}
          </h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {patients.filter(p => p.status === 'checked').map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:shadow-sm transition-all">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{p.name_ar}</p>
                  <p className="text-[10px] text-gray-500 font-medium">#{p.ticket_number} • {t(p.clinic_type)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => downloadPrescription(p)} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {selected ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selected.name_ar}</h2>
                <p className="text-gray-500">
                  {selected.age_value} {t(selected.age_unit + 's')} • {t(selected.clinic_type)} • #{selected.ticket_number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-indigo-600">{t('complaint')}</p>
                <p className="text-gray-700">{selected.complaint}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-indigo-600" />
                  {t('vitals')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selected.vitals_data).map(([key, val]: any) => (
                    <div key={key}>
                      <p className="text-xs text-gray-500 uppercase">{t(key)}</p>
                      <p className="text-sm font-medium text-gray-900">{val || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-indigo-600" />
                  {t('past_history')}
                </h3>
                <div>
                  <p className="text-xs text-gray-500 uppercase">{t('chronic_illnesses')}</p>
                  <p className="text-sm font-medium text-gray-900">{selected.chronic_illnesses || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">{t('medications')}</p>
                  <p className="text-sm font-medium text-gray-900">{selected.medications || '-'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label={t('diagnosis')} value={form.diagnosis} onChange={(e: any) => setForm({ ...form, diagnosis: e.target.value })} required />
                <Input label={t('decision')} value={form.decision} onChange={(e: any) => setForm({ ...form, decision: e.target.value })} />
                <Input label={t('treatment')} value={form.treatment} onChange={(e: any) => setForm({ ...form, treatment: e.target.value })} required />
                <Input label={t('referral')} value={form.referral} onChange={(e: any) => setForm({ ...form, referral: e.target.value })} />
              </div>
              <Input label={t('notes')} value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} />
              <Input label={t('signature')} value={form.doctor_signature} onChange={(e: any) => setForm({ ...form, doctor_signature: e.target.value })} required />
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setSelected(null)}>{t('cancel')}</Button>
                <Button type="submit" className="gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  {t('save')}
                </Button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('select_patient') || 'Select a patient to start examination'}</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">
              {t('select_patient_desc') || 'Choose a patient from the waiting list on the left to record diagnosis and treatment.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
