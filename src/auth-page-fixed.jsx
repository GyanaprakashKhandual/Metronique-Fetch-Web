'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:5000/api/v1/auth';

const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

const Google = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [registrationEmail, setRegistrationEmail] = useState('');
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        username: ''
    });

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const showAlert = ({ type, message }) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
    };

    const checkAuthStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/me`, {
                method: 'GET',
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    console.log('[Auth] User already logged in, redirecting to /app');
                    router.push('/app');
                }
            }
        } catch (error) {
            console.log('[Auth] No active session');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (mode === 'login') {
            await handleLogin();
        } else if (mode === 'register') {
            await handleRegister();
        } else if (mode === 'magic') {
            await handleMagicLink();
        } else if (mode === 'forgot') {
            await handleForgotPassword();
        }
    };

    const handleRegister = async () => {
        console.log('[Auth] Registration attempt:', formData.email);
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            showAlert({ type: 'error', message: 'Passwords do not match' });
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            showAlert({ type: 'error', message: 'Password must be at least 8 characters' });
            setLoading(false);
            return;
        }

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            showAlert({ type: 'error', message: 'All fields are required' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    username: formData.username || formData.email.split('@')[0]
                })
            });

            const data = await res.json();

            if (data.success) {
                console.log('[Auth] Registration successful:', formData.email);

                // Save tokens to localStorage if provided
                if (data.data?.accessToken) {
                    localStorage.setItem('accessToken', data.data.accessToken);
                    console.log('[Auth] Access token saved');
                }
                if (data.data?.refreshToken) {
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                    console.log('[Auth] Refresh token saved');
                }

                setRegistrationEmail(formData.email);
                setShowEmailVerification(true);
                showAlert({ type: 'success', message: 'Account created successfully! Please verify your email.' });
            } else {
                console.warn('[Auth] Registration failed:', data.message);
                showAlert({ type: 'error', message: data.message || 'Registration failed' });
            }
        } catch (err) {
            console.error('[Auth] Registration error:', err);
            showAlert({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        console.log('[Auth] Login attempt:', formData.email);
        setLoading(true);

        if (!formData.email || !formData.password) {
            showAlert({ type: 'error', message: 'Email and password are required' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await res.json();

            if (data.success) {
                console.log('[Auth] Login successful:', formData.email);

                // Save tokens to localStorage
                if (data.data?.accessToken) {
                    localStorage.setItem('accessToken', data.data.accessToken);
                    console.log('[Auth] Access token saved');
                }
                if (data.data?.refreshToken) {
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                    console.log('[Auth] Refresh token saved');
                }

                showAlert({ type: 'success', message: 'Welcome back! Redirecting...' });

                setTimeout(() => {
                    router.push('/app');
                }, 1000);
            } else {
                console.warn('[Auth] Login failed:', data.message);
                showAlert({ type: 'error', message: data.message || 'Login failed' });
            }
        } catch (err) {
            console.error('[Auth] Login error:', err);
            showAlert({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        console.log('[Auth] Magic link request:', formData.email);
        setLoading(true);

        if (!formData.email) {
            showAlert({ type: 'error', message: 'Email is required' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/send-verification-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: formData.email })
            });

            const data = await res.json();

            if (data.success) {
                console.log('[Auth] Magic link sent:', formData.email);
                showAlert({ type: 'success', message: 'Magic link sent! Check your email.' });
                setMode('login');
                setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', username: '' });
            } else {
                console.warn('[Auth] Magic link failed:', data.message);
                showAlert({ type: 'error', message: data.message || 'Failed to send magic link' });
            }
        } catch (err) {
            console.error('[Auth] Magic link error:', err);
            showAlert({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        console.log('[Auth] Forgot password request:', formData.email);
        setLoading(true);

        if (!formData.email) {
            showAlert({ type: 'error', message: 'Email is required' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: formData.email })
            });

            const data = await res.json();

            if (data.success) {
                console.log('[Auth] Password reset link sent:', formData.email);
                showAlert({ type: 'success', message: 'Password reset link sent to your email!' });
                setMode('login');
                setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', username: '' });
            } else {
                console.warn('[Auth] Password reset failed:', data.message);
                showAlert({ type: 'error', message: data.message || 'Failed to send reset link' });
            }
        } catch (err) {
            console.error('[Auth] Password reset error:', err);
            showAlert({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = (provider) => {
        console.log(`[Auth] Initiating ${provider} OAuth`);
        window.location.href = `${API_BASE_URL}/${provider}`;
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', username: '' });
    };

    const goBackToAuth = () => {
        setShowEmailVerification(false);
        setRegistrationEmail('');
        setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', username: '' });
        switchMode('login');
    };

    if (showEmailVerification) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                {alert.show && (
                    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                        {alert.message}
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white border border-gray-200 rounded-xl p-8"
                    >
                        <div className="flex justify-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="w-16 h-16 bg-black rounded-full flex items-center justify-center"
                            >
                                <Mail className="w-8 h-8 text-white" />
                            </motion.div>
                        </div>

                        <h1 className="text-2xl font-semibold text-center mb-3">Verify Your Email</h1>

                        <p className="text-gray-600 text-center text-sm mb-8">
                            We have sent a verification link to <span className="font-semibold text-gray-900">{registrationEmail}</span>. Please check your email and click the link to verify your account.
                        </p>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                            <h3 className="font-semibold text-sm text-gray-900 mb-4">What&apos;s next?</h3>
                            <ol className="space-y-3">
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                                    <span className="text-sm text-gray-700">Check your email inbox</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                                    <span className="text-sm text-gray-700">Click the verification link in the email</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                                    <span className="text-sm text-gray-700">You will be automatically logged in</span>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                            <p className="text-xs text-blue-900">
                                <strong>Didn&apos;t receive the email?</strong> Check your spam folder or contact support for help.
                            </p>
                        </div>

                        <button
                            onClick={goBackToAuth}
                            className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            Back to Login
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <p className="text-xs text-gray-500 text-center mt-6">
                            Verification link expires in 24 hours
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            {alert.show && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    {alert.message}
                </div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <motion.div
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white border border-gray-200 rounded-xl p-8"
                >
                    {mode === 'forgot' && (
                        <button
                            onClick={() => switchMode('login')}
                            className="flex items-center gap-2 mb-6 text-sm text-gray-600 hover:text-black transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </button>
                    )}

                    <div className="mb-8">
                        <h1 className="text-2xl font-semibold mb-2">
                            {mode === 'login' && 'Sign In'}
                            {mode === 'register' && 'Create Account'}
                            {mode === 'magic' && 'Email Sign In'}
                            {mode === 'forgot' && 'Reset Password'}
                        </h1>

                        <p className="text-gray-500 text-sm">
                            {mode === 'login' && 'Welcome back! Please sign in to continue'}
                            {mode === 'register' && 'Get started with a free account'}
                            {mode === 'magic' && "We'll email you a secure login link"}
                            {mode === 'forgot' && 'Enter your email to receive a reset link'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent text-sm transition-all"
                                            placeholder="John"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent text-sm transition-all"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Username (Optional)</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent text-sm transition-all"
                                            placeholder="johndoe"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent text-sm transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {(mode === 'login' || mode === 'register') && (
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent text-sm transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent text-sm transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => switchMode('forgot')}
                                    className="text-sm text-gray-600 hover:text-black transition-colors font-medium"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Spinner />
                                    <span>Please wait...</span>
                                </>
                            ) : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'register' && 'Create Account'}
                                    {mode === 'magic' && 'Send Magic Link'}
                                    {mode === 'forgot' && 'Send Reset Link'}
                                </>
                            )}
                        </button>
                    </form>

                    {(mode === 'login' || mode === 'register') && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-3 text-xs text-gray-500 uppercase tracking-wider">Or continue with</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleOAuth('google')}
                                    type="button"
                                    className="w-full py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    <Google />
                                    Google
                                </button>

                                <button
                                    onClick={() => handleOAuth('github')}
                                    type="button"
                                    className="w-full py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    <FaGithub className="w-4 h-4" />
                                    GitHub
                                </button>

                                <button
                                    onClick={() => switchMode('magic')}
                                    type="button"
                                    className="w-full py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Link
                                </button>
                            </div>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            {mode === 'login' ? "Don't have an account? " : mode === 'register' ? 'Already have an account? ' : ''}
                            {mode === 'login' && (
                                <button
                                    onClick={() => switchMode('register')}
                                    type="button"
                                    className="font-medium text-black hover:underline"
                                >
                                    Sign up
                                </button>
                            )}
                            {mode === 'register' && (
                                <button
                                    onClick={() => switchMode('login')}
                                    type="button"
                                    className="font-medium text-black hover:underline"
                                >
                                    Sign in
                                </button>
                            )}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
