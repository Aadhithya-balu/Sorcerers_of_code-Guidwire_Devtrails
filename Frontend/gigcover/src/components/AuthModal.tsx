import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  X, ArrowRight, ArrowLeft, ShieldCheck,
  User, Briefcase, MapPin, Eye, EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { cn } from '@/utils/helpers';
import { syncUserToBackend, verifyKyc, fetchBackendProfileByEmail, BackendUserProfile, updateDailyIncome } from '@/services/auth-api';

interface AuthModalProps {
  onClose: () => void;
}

type Mode = 'choose' | 'login' | 'register-1' | 'register-2' | 'register-3' | 'link' | 'income' | 'kyc' | 'success';

const APP_STORAGE_KEY = 'rakshitartha_users';
const APP_SESSION_KEY = 'rakshitartha_session';
const LEGACY_STORAGE_KEY = 'gigcover_users';

const isConnectivityIssue = (error: unknown) =>
  error instanceof Error &&
  /unable to connect|failed to fetch|network/i.test(error.message);

const PLATFORMS = [
  { id: 'Swiggy',    label: 'Swiggy',    emoji: '🧡' },
  { id: 'Zomato',   label: 'Zomato',    emoji: '🔴' },
  { id: 'Uber Eats', label: 'Uber Eats', emoji: '🟢' },
];

const WORKING_DAYS_OPTIONS = [
  { id: 'Weekdays (Mon–Fri)', label: 'Weekdays' },
  { id: 'Weekends (Sat–Sun)', label: 'Weekends' },
  { id: 'Full Week',          label: 'Full Week' },
];

const ZONE_TYPES = ['Urban', 'Suburban', 'Rural'];
const LOCATION_PRESETS = [
  {
    id: 'low',
    label: 'Low Risk',
    city: 'Coimbatore',
    deliveryZone: 'Sai Baba Colony',
    zoneType: 'Urban' as const,
    dailyIncome: 1200,
    badge: 'Stable',
    tone: 'border-green-500/60 bg-green-500/10 text-green-300',
  },
  {
    id: 'medium',
    label: 'Medium Risk',
    city: 'Chennai',
    deliveryZone: 'T. Nagar',
    zoneType: 'Urban' as const,
    dailyIncome: 1000,
    badge: 'Balanced',
    tone: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300',
  },
  {
    id: 'high',
    label: 'High Risk',
    city: 'Bangalore',
    deliveryZone: 'Electronic City',
    zoneType: 'Urban' as const,
    dailyIncome: 850,
    badge: 'Stress Test',
    tone: 'border-red-500/60 bg-red-500/10 text-red-300',
  },
];
const KYC_DOC_TYPES = [
  { id: 'AADHAR', label: 'Aadhar Card' },
  { id: 'PAN', label: 'PAN Card' },
  { id: 'DRIVER_LICENSE', label: 'Driving License' },
  { id: 'VOTER_ID', label: 'Voter ID' },
];

const MOCK_DOCUMENTS = [
  {
    id: 'AADHAR',
    label: 'Aadhar Card',
    type: 'AADHAR' as const,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjUiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QUFESEFSIENBUkQgKE1PT0spPC90ZXh0Pgo8L3N2Zz4K'
  },
  {
    id: 'PAN',
    label: 'PAN Card',
    type: 'PAN' as const,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjUiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UEFOIENBUkQgKE1PT0spPC90ZXh0Pgo8L3N2Zz4K'
  },
  {
    id: 'DRIVER_LICENSE',
    label: 'Driving License',
    type: 'DRIVER_LICENSE' as const,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjUiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RFJJVklORyBMSUNFTlNFIChNT09LKTwvdGV4dD4KPC9zdmc+Cg=='
  }
];

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register, updateUser, isNewUser, user } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>('choose');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [reg1, setReg1] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [reg2, setReg2] = useState({ platform: '', otherPlatform: '', workingHours: '', workingDays: '', avgDailyHours: '' });
  const [reg3, setReg3] = useState({ city: '', deliveryZone: '', zoneType: '' });
  const [kyc, setKyc] = useState({
    documentType: 'AADHAR',
    documentId: '',
    documentImage: '',
    profileImage: '',
  });
  const [pendingBackendUserId, setPendingBackendUserId] = useState<string | null>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkConfirm, setLinkConfirm] = useState('');
  const [backendProfile, setBackendProfile] = useState<BackendUserProfile | null>(null);
  const [dailyIncome, setDailyIncome] = useState('');

  // ── Auth handlers ──
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!loginData.email || !loginData.password) { setError('Please fill in all fields.'); return; }
    if (!isNewUser(loginData.email)) {
      const ok = login(loginData.email, loginData.password);
      if (!ok) { setError('Incorrect email or password.'); return; }
      try {
        const storedUsers = JSON.parse(
          localStorage.getItem(APP_STORAGE_KEY) ||
          localStorage.getItem(LEGACY_STORAGE_KEY) ||
          '{}',
        );
        const record = storedUsers[loginData.email.toLowerCase()];
        if (record?.profile && record.profile.backendUserId && record.profile.accountStatus !== 'ACTIVE') {
          setPendingBackendUserId(record.profile.backendUserId);
          setMode('kyc');
          return;
        }
        if (record?.profile && !record.profile.dailyIncome) {
          setPendingBackendUserId(record.profile.backendUserId || null);
          setMode('income');
          return;
        }
        if (record?.profile && !record.profile.backendUserId) {
          const syncResult = await syncUserToBackend({
            name: record.profile.name,
            email: record.profile.email,
            phone: record.profile.phone,
            location: `${record.profile.city}, ${record.profile.deliveryZone}`,
            platform: record.profile.platform,
          });
          record.profile.backendUserId = syncResult.backendUserId;
          record.profile.kycVerified = syncResult.kycVerified;
          record.profile.accountStatus = syncResult.accountStatus;
          storedUsers[loginData.email.toLowerCase()] = record;
          localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storedUsers));
          localStorage.setItem(APP_SESSION_KEY, JSON.stringify(record.profile));
          updateUser({
            backendUserId: syncResult.backendUserId,
            kycVerified: syncResult.kycVerified,
            accountStatus: syncResult.accountStatus,
          });
          if (syncResult.accountStatus !== 'ACTIVE') {
            setPendingBackendUserId(syncResult.backendUserId);
            setMode('kyc');
            return;
          }
          if (!record.profile.dailyIncome) {
            setPendingBackendUserId(syncResult.backendUserId);
            setMode('income');
            return;
          }
        }
      } catch {
        // Keep login working even if backend sync fails.
      }
      onClose(); navigate('/dashboard');
    } else {
      setError('No account found. Please create a new account.');
    }
  };

  const handleCheckEmail = async () => {
    setError('');
    if (!loginData.email) { setError('Please enter your email.'); return; }
    if (isNewUser(loginData.email)) {
      const existingBackend = await fetchBackendProfileByEmail(loginData.email);
      if (existingBackend) {
        setBackendProfile(existingBackend);
        setMode('link');
        return;
      }
      setReg1(p => ({ ...p, email: loginData.email }));
      setMode('register-1');
    } else {
      setMode('login');
    }
  };

  const handleReg1Next = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!reg1.name || !reg1.phone || !reg1.email || !reg1.password || !reg1.confirmPassword) {
      setError('Please fill in all required fields.'); return;
    }
    if (!/^[6-9]\d{9}$/.test(reg1.phone)) { setError('Enter a valid 10-digit Indian phone number.'); return; }
    if (reg1.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (reg1.password !== reg1.confirmPassword) { setError('Passwords do not match.'); return; }
    setMode('register-2');
  };

  const handleReg2Next = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!reg2.platform || !reg2.workingHours || !reg2.workingDays || !reg2.avgDailyHours) {
      setError('Please fill in all required fields.'); return;
    }
    setMode('register-3');
  };

  const handleReg3Submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!reg3.city || !reg3.deliveryZone || !reg3.zoneType) {
      setError('Please fill in city, zone, and zone type.'); return;
    }
    try {
      const platform = reg2.platform;
      const syncResult = await syncUserToBackend({
        name: reg1.name,
        email: reg1.email,
        phone: reg1.phone,
        location: `${reg3.city}, ${reg3.deliveryZone}`,
        platform,
        dailyIncome: dailyIncome ? Number(dailyIncome) : undefined,
        workingHours: reg2.workingHours,
        workingDays: reg2.workingDays,
        avgDailyHours: reg2.avgDailyHours,
      });

      const profile: UserProfile = {
        name: reg1.name, phone: reg1.phone, email: reg1.email,
        platform,
        jobType: '',
        workingHours: reg2.workingHours, workingDays: reg2.workingDays,
        avgDailyHours: reg2.avgDailyHours,
        city: reg3.city, deliveryZone: reg3.deliveryZone,
        zoneType: reg3.zoneType, preferredAreas: '',
        dailyIncome: dailyIncome ? Number(dailyIncome) : undefined,
        backendUserId: syncResult.backendUserId,
        kycVerified: syncResult.kycVerified,
        accountStatus: syncResult.accountStatus,
      };
      register(profile, reg1.password);
      if (syncResult.accountStatus !== 'ACTIVE') {
        setPendingBackendUserId(syncResult.backendUserId);
        setMode('kyc');
        return;
      }
      if (!profile.dailyIncome) {
        setMode('income');
        return;
      }
      setMode('success');
      setTimeout(() => { onClose(); navigate('/dashboard'); }, 2200);
    } catch (err) {
      if (isConnectivityIssue(err)) {
        const platform = reg2.platform;
        const profile: UserProfile = {
          name: reg1.name, phone: reg1.phone, email: reg1.email,
          platform,
          jobType: '',
          workingHours: reg2.workingHours, workingDays: reg2.workingDays,
          avgDailyHours: reg2.avgDailyHours,
          city: reg3.city, deliveryZone: reg3.deliveryZone,
          zoneType: reg3.zoneType, preferredAreas: '',
          dailyIncome: dailyIncome ? Number(dailyIncome) : undefined,
          kycVerified: false,
          accountStatus: 'VERIFICATION_PENDING',
        };
        register(profile, reg1.password);
        setMode('success');
        setTimeout(() => { onClose(); navigate('/dashboard'); }, 2200);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = Number(dailyIncome);
    if (!parsed || parsed <= 0) { setError('Enter a valid daily income.'); return; }
    try {
      if (pendingBackendUserId) {
        await updateDailyIncome(pendingBackendUserId, parsed);
      } else if (backendProfile?._id) {
        await updateDailyIncome(backendProfile._id, parsed);
      }
    } catch (err) {
      if (!isConnectivityIssue(err)) {
        setError(err instanceof Error ? err.message : 'Failed to save daily income');
        return;
      }
    }
    updateUser({ dailyIncome: parsed });
    setMode('success');
    setTimeout(() => { onClose(); navigate('/dashboard'); }, 1800);
  };

  // ── Styles ──
  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";
  const labelCls = "block text-sm font-semibold text-slate-800 mb-1.5 dark:text-slate-200";

  const stepDots = (current: number) => (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2, 3].map(i => (
        <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", i <= current ? 'bg-primary' : 'bg-muted')} />
      ))}
    </div>
  );

  const modeTitle: Record<Mode, string> = {
    choose: 'Welcome', login: 'Sign In',
    'register-1': 'Basic Details', 'register-2': 'Work Details',
    'register-3': 'Location', link: 'Link Account', income: 'Daily Income', kyc: 'KYC Verification', success: 'All Set!',
  };

  const handleBack = () => {
    setError('');
    if (mode === 'login' || mode === 'register-1') setMode('choose');
    else if (mode === 'register-2') setMode('register-1');
    else if (mode === 'register-3') setMode('register-2');
    else if (mode === 'link') setMode('choose');
    else if (mode === 'income') setMode('choose');
    else if (mode === 'kyc') setMode('register-3');
  };

  const splitLocation = (location?: string) => {
    if (!location) {
      return { city: '', zone: '' };
    }
    const parts = location.split(',').map(p => p.trim()).filter(Boolean);
    return {
      city: parts[0] || location,
      zone: parts.slice(1).join(', ') || 'Zone A',
    };
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!backendProfile) { setError('Backend profile not found.'); return; }
    if (!linkPassword || !linkConfirm) { setError('Please set a password.'); return; }
    if (linkPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (linkPassword !== linkConfirm) { setError('Passwords do not match.'); return; }

    const { city, zone } = splitLocation(backendProfile.location);
    const profile: UserProfile = {
      name: backendProfile.name || 'Worker',
      phone: backendProfile.phone || '9000000000',
      email: backendProfile.email || loginData.email,
      platform: backendProfile.platform || 'OTHER',
      jobType: '',
      workingHours: '9 AM - 6 PM',
      workingDays: 'Full Week',
      avgDailyHours: '8',
      city: city || 'Chennai',
      deliveryZone: zone || 'Zone A',
      zoneType: 'Urban',
      preferredAreas: '',
      dailyIncome: backendProfile.dailyIncome ?? undefined,
      backendUserId: backendProfile._id,
      kycVerified: Boolean(backendProfile.kyc?.verified),
      accountStatus: backendProfile.accountStatus || 'VERIFICATION_PENDING',
    };

    register(profile, linkPassword);
    if (!profile.dailyIncome) {
      setPendingBackendUserId(backendProfile._id);
      setMode('income');
      return;
    }
    if (profile.accountStatus !== 'ACTIVE') {
      setPendingBackendUserId(backendProfile._id);
      setMode('kyc');
      return;
    }
    setMode('success');
    setTimeout(() => { onClose(); navigate('/dashboard'); }, 1800);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!kyc.documentId.trim()) { setError('Please enter your document ID.'); return; }
    if (!kyc.documentImage) { setError('Please capture or upload document image.'); return; }
    if (!pendingBackendUserId) { setError('Missing backend user ID for verification.'); return; }

    try {
      await verifyKyc(pendingBackendUserId, kyc.documentType, kyc.documentId, {
        documentImage: kyc.documentImage || undefined,
        profileImage: kyc.profileImage || undefined,
      });
      updateUser({
        kycVerified: true,
        accountStatus: 'ACTIVE',
        profileImage: kyc.profileImage || user?.profileImage,
      });
      if (!user?.dailyIncome && !dailyIncome) {
        setMode('income');
        return;
      }
      setMode('success');
      setTimeout(() => { onClose(); navigate('/dashboard'); }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KYC verification failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 animate-in slide-in-from-bottom duration-300 dark:bg-slate-950 dark:text-slate-100">

      {/* ── Top Bar ── */}
      <div className="shrink-0 bg-sidebar px-4 shadow-md">
        <div className="flex items-center justify-between h-14">
          {mode !== 'choose' && mode !== 'success' ? (
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-1.5 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-white">Rakshit<span className="text-primary">Artha</span></span>
            </div>
          )}
          <span className="text-sm font-bold text-white">{modeTitle[mode]}</span>
          {mode !== 'success' ? (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          ) : <div className="w-9" />}
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* ──── CHOOSE ──── */}
        {mode === 'choose' && (
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1 dark:text-slate-100">Welcome!</h2>
            <p className="text-sm text-slate-600 mb-6 dark:text-slate-300">Enter your email to sign in or create a new account.</p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" className={inputCls} placeholder="yourname@email.com"
                  value={loginData.email}
                  onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleCheckEmail()}
                  autoFocus />
              </div>
              <button onClick={handleCheckEmail} className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-muted-foreground">New here? We'll guide you through a quick setup.</p>
            </div>
          </div>
        )}

        {/* ──── LOGIN ──── */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground mb-1">Sign In</h2>
              <p className="text-sm text-muted-foreground mb-4">Welcome back! Enter your password.</p>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={loginData.email} readOnly />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className={cn(inputCls, 'pr-12')}
                  placeholder="Your password" value={loginData.password}
                  onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} autoFocus />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── STEP 1: BASIC DETAILS ──── */}
        {mode === 'register-1' && (
          <form onSubmit={handleReg1Next} className="space-y-4">
            {stepDots(1)}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Basic Details</h2>
                <p className="text-xs text-muted-foreground">Step 1 of 3</p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Full Name *</label>
              <input type="text" className={inputCls} placeholder="e.g. Rahul Kumar"
                value={reg1.name} onChange={e => setReg1(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Email Address *</label>
              <input type="email" className={inputCls} placeholder="yourname@email.com"
                value={reg1.email} onChange={e => setReg1(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Phone Number *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">+91</span>
                <input type="tel" className={cn(inputCls, 'pl-12')} placeholder="9876543210" maxLength={10}
                  value={reg1.phone} onChange={e => setReg1(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className={cn(inputCls, 'pr-12')}
                  placeholder="Min. 6 characters" value={reg1.password}
                  onChange={e => setReg1(p => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm Password *</label>
              <input type="password" className={inputCls} placeholder="Repeat password"
                value={reg1.confirmPassword} onChange={e => setReg1(p => ({ ...p, confirmPassword: e.target.value }))} />
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
              Next — Work Details <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── STEP 2: WORK DETAILS ──── */}
        {mode === 'register-2' && (
          <form onSubmit={handleReg2Next} className="space-y-4">
            {stepDots(2)}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Work Details</h2>
                <p className="text-xs text-muted-foreground">Step 2 of 3</p>
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className={labelCls}>Platform *</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(pl => (
                  <button key={pl.id} type="button"
                    onClick={() => setReg2(p => ({ ...p, platform: pl.id }))}
                    className={cn(
                      "flex items-center gap-2 py-2.5 px-3 rounded-xl border-2 font-semibold text-sm transition-all active:scale-95 text-left",
                      reg2.platform === pl.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                    )}>
                    <span className="text-base">{pl.emoji}</span>
                    <span className="truncate">{pl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <label className={labelCls}>Working Hours *</label>
              <input type="text" className={inputCls} placeholder="e.g. 2 PM – 10 PM"
                value={reg2.workingHours} onChange={e => setReg2(p => ({ ...p, workingHours: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Enter your usual shift time</p>
            </div>

            {/* Working Days */}
            <div>
              <label className={labelCls}>Working Days *</label>
              <div className="grid grid-cols-3 gap-2">
                {WORKING_DAYS_OPTIONS.map(d => (
                  <button key={d.id} type="button"
                    onClick={() => setReg2(p => ({ ...p, workingDays: d.id }))}
                    className={cn(
                      "py-2.5 rounded-xl border-2 font-semibold text-xs transition-all text-center",
                      reg2.workingDays === d.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-card-foreground"
                    )}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Avg Hours */}
            <div>
              <label className={labelCls}>Avg Daily Working Hours *</label>
              <input type="number" className={inputCls} placeholder="e.g. 8" min="1" max="16"
                value={reg2.avgDailyHours} onChange={e => setReg2(p => ({ ...p, avgDailyHours: e.target.value }))} />
            </div>

            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
              Next — Location Details <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── STEP 3: LOCATION ──── */}
        {mode === 'register-3' && (
          <form onSubmit={handleReg3Submit} className="space-y-4">
            {stepDots(3)}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Location Details</h2>
                <p className="text-xs text-muted-foreground">Step 3 of 3 — Used for risk assessment</p>
              </div>
            </div>

            {/* City */}
            <div>
              <label className={labelCls}>City *</label>
              <input type="text" className={inputCls} placeholder="e.g. Bengaluru, Mumbai"
                value={reg3.city} onChange={e => setReg3(p => ({ ...p, city: e.target.value }))} />
            </div>

            {/* Zone */}
            <div>
              <label className={labelCls}>Delivery Zone / Area *</label>
              <input type="text" className={inputCls} placeholder="e.g. Koramangala Zone 4B"
                value={reg3.deliveryZone} onChange={e => setReg3(p => ({ ...p, deliveryZone: e.target.value }))} />
            </div>

            {/* Zone Type */}
            <div>
              <label className={labelCls}>Zone Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {ZONE_TYPES.map(z => (
                  <button key={z} type="button"
                    onClick={() => setReg3(p => ({ ...p, zoneType: z }))}
                    className={cn(
                      "py-2.5 rounded-xl border-2 font-semibold text-xs transition-all",
                      reg3.zoneType === z ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-card-foreground"
                    )}>
                    {z === 'Urban' ? '🏙️' : z === 'Suburban' ? '🏘️' : '🌾'} {z}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={labelCls}>Mock test profiles</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LOCATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setReg3((prev) => ({
                        ...prev,
                        city: preset.city,
                        deliveryZone: preset.deliveryZone,
                        zoneType: preset.zoneType,
                      }));
                      setDailyIncome(String(preset.dailyIncome));
                    }}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition-all active:scale-[0.98]',
                      preset.tone,
                      'border-current/40 hover:border-current/70'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold">{preset.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-current">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-current/90">{preset.city} · {preset.deliveryZone}</p>
                    <p className="text-[10px] text-current/70 mt-1">Income: Rs {preset.dailyIncome} / day</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Tap a preset to quickly test different risk and payout outcomes.
              </p>
            </div>

            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
              Create My Account <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── DAILY INCOME ──── */}
        {mode === 'income' && (
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Daily Income</h2>
                  <p className="text-xs text-muted-foreground">Used for protection estimate and premium calculation</p>
                </div>
              </div>
              <div>
                <label className={labelCls}>Per Day Income (₹) *</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="e.g. 1200"
                  value={dailyIncome}
                  onChange={(e) => setDailyIncome(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
              Save Income <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── LINK ACCOUNT ──── */}
        {mode === 'link' && (
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Account Found</h2>
                  <p className="text-xs text-muted-foreground">Set a password to link this account locally.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} value={loginData.email} readOnly />
                </div>
                <div>
                  <label className={labelCls}>Password *</label>
                  <input
                    type="password"
                    className={inputCls}
                    placeholder="Create a password"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Confirm Password *</label>
                  <input
                    type="password"
                    className={inputCls}
                    placeholder="Repeat password"
                    value={linkConfirm}
                    onChange={(e) => setLinkConfirm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
              Link & Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── KYC ──── */}
        {mode === 'kyc' && (
          <form onSubmit={handleKycSubmit} className="space-y-4">
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Verify Your Identity</h2>
                  <p className="text-xs text-muted-foreground">Required to activate payouts & claims</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Document Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {KYC_DOC_TYPES.map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setKyc(p => ({ ...p, documentType: doc.id }))}
                        className={cn(
                          "py-2.5 rounded-xl border-2 font-semibold text-xs transition-all",
                          kyc.documentType === doc.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-card-foreground"
                        )}
                      >
                        {doc.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Document ID *</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Enter your ID number"
                    value={kyc.documentId}
                    onChange={e => setKyc(p => ({ ...p, documentId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">We store only a masked version for privacy.</p>
                </div>
                <div>
                  <label className={labelCls}>Document Photo * (Prototype)</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {MOCK_DOCUMENTS.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setKyc((p) => ({
                          ...p,
                          documentType: doc.type,
                          documentImage: doc.image,
                        }))}
                        className={cn(
                          'aspect-4/3 rounded-xl border-2 p-1.5 flex flex-col items-center justify-center text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]',
                          kyc.documentType === doc.type && kyc.documentImage === doc.image
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md'
                            : 'border-border/50 bg-card hover:border-primary/50 hover:shadow-sm'
                        )}
                      >
                        <img
                          src={doc.image}
                          alt={doc.label}
                          className="w-16 h-12 object-contain rounded-md mb-1 shrink-0"
                        />
                        <span className={cn('leading-tight max-w-15 px-0.5 text-center', kyc.documentType === doc.type ? 'text-primary font-bold' : 'text-muted-foreground')}>
                          {doc.label.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {kyc.documentImage && (
                    <img
                      src={kyc.documentImage}
                      alt="KYC document preview"
                      className="mt-1.5 h-20 w-full rounded-lg object-cover border border-border/60 shadow-sm"
                    />
                  )}
                  <details className="mt-2 p-2 border border-dashed border-muted rounded-lg bg-muted/20">
                    <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-300 font-medium hover:text-foreground flex items-center gap-1 mb-1">
                      📱 Real camera upload (optional)
                    </summary>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="w-full text-xs py-1.5 px-3 border border-border rounded-md bg-card text-card-foreground file:text-card-foreground"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setKyc((p) => ({
                            ...p,
                            documentImage: typeof reader.result === 'string' ? reader.result : p.documentImage,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </details>
                </div>
                <div>
                  <label className={labelCls}>Profile Photo (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className={cn(inputCls, 'py-2')}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setKyc((p) => ({
                          ...p,
                          profileImage: typeof reader.result === 'string' ? reader.result : p.profileImage,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {kyc.profileImage && (
                    <img
                      src={kyc.profileImage}
                      alt="Profile preview"
                      className="mt-2 h-20 w-20 rounded-full object-cover border border-border/60"
                    />
                  )}
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
              Verify & Continue <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ──── SUCCESS ──── */}
        {mode === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-5 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-2">You're all set! 🎉</h2>
            <p className="text-muted-foreground text-sm mb-1">
              Welcome to RakshitArtha, <span className="font-bold text-foreground">{reg1.name}</span>!
            </p>
            <p className="text-sm text-muted-foreground mb-6">Your income protection is now active.</p>
            <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-full" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Redirecting to dashboard…</p>
          </div>
        )}

      </div>
    </div>
  );
}
