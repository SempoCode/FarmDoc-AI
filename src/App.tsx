import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  Sprout, 
  Languages, 
  Send, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Leaf, 
  Info,
  Loader2,
  ChevronRight,
  RefreshCw,
  User,
  LogOut,
  LogIn,
  UserPlus,
  X,
  Mail,
  Lock,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

// --- Types ---
type Language = 'en' | 'sw' | 'lug';
type View = 'home' | 'history' | 'profile';

interface Translation {
  title: string;
  tagline: string;
  problemPlaceholder: string;
  selectCrop: string;
  getAdvice: string;
  diagnosis: string;
  immediateActions: string;
  treatmentOptions: string;
  preventionTips: string;
  warning: string;
  history: string;
  exampleQuestions: string;
  loading: string;
  footer: string;
  crops: Record<string, string>;
  examples: string[];
  login: string;
  signup: string;
  logout: string;
  guest: string;
  profile: string;
  email: string;
  password: string;
  displayName: string;
  errorAuth: string;
  errorNetwork: string;
  back: string;
  noHistory: string;
}

const translations: Record<Language, Translation> = {
  en: {
    title: "FarmDoc AI",
    tagline: "Your Farming Assistant. Get instant crop advice in English or Swahili.",
    problemPlaceholder: "Describe your crop problem here (e.g., my maize has yellow leaves)...",
    selectCrop: "Select Crop Type",
    getAdvice: "Get Advice",
    diagnosis: "Diagnosis",
    immediateActions: "Immediate Actions",
    treatmentOptions: "Treatment Options",
    preventionTips: "Prevention Tips",
    warning: "Warning",
    history: "Consultation History",
    exampleQuestions: "Common Questions",
    loading: "FarmDoc is thinking...",
    footer: "FarmDoc AI: Growing smarter together.",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    guest: "Guest",
    profile: "Profile",
    email: "Email Address",
    password: "Password",
    displayName: "Full Name",
    errorAuth: "Authentication failed. Please check your credentials.",
    errorNetwork: "Network error. Please check your internet connection.",
    back: "Back to Home",
    noHistory: "No past consultations found.",
    crops: {
      Maize: "Maize",
      Cassava: "Cassava",
      Beans: "Beans",
      Matooke: "Matooke",
      Rice: "Rice",
      Tomatoes: "Tomatoes"
    },
    examples: [
      "My maize has yellow leaves",
      "Small holes in my bean leaves",
      "Cassava leaves are curling",
      "Tomatoes have black spots"
    ]
  },
  sw: {
    title: "FarmDoc AI",
    tagline: "Msaidizi wako wa Kilimo. Pata ushauri wa mazao kwa Kiingereza au Kiswahili.",
    problemPlaceholder: "Eleza tatizo la zao lako hapa (mfano, mahindi yangu yana majani ya manjano)...",
    selectCrop: "Chagua Aina ya Zao",
    getAdvice: "Pata Ushauri",
    diagnosis: "Utambuzi",
    immediateActions: "Hatua za Haraka",
    treatmentOptions: "Chaguzi za Matibabu",
    preventionTips: "Vidokezo vya Kuzuia",
    warning: "Onyo",
    history: "Historia ya Ushauri",
    exampleQuestions: "Maswali ya Kawaida",
    loading: "FarmDoc anafikiria...",
    footer: "FarmDoc AI: Tunakua pamoja kwa akili.",
    login: "Ingia",
    signup: "Jisajili",
    logout: "Ondoka",
    guest: "Mgeni",
    profile: "Wasifu",
    email: "Barua Pepe",
    password: "Nenosiri",
    displayName: "Jina Kamili",
    errorAuth: "Uthibitishaji umeshindwa. Tafadhali angalia maelezo yako.",
    errorNetwork: "Hitilafu ya mtandao. Tafadhali angalia muunganisho wako.",
    back: "Rudi Nyumbani",
    noHistory: "Hakuna ushauri wa zamani uliopatikana.",
    crops: {
      Maize: "Mahindi",
      Cassava: "Muhogo",
      Beans: "Maharagwe",
      Matooke: "Ndizi (Matooke)",
      Rice: "Mpunga",
      Tomatoes: "Nyanya"
    },
    examples: [
      "Mahindi yangu yana majani ya manjano",
      "Mashimo madogo kwenye majani ya maharagwe",
      "Majani ya muhogo yanajikunja",
      "Nyanya zina madoa meusi"
    ]
  },
  lug: {
    title: "FarmDoc AI",
    tagline: "Omuyambi wo mu Bulimi. Funa amagezi ku birime mu Lungereza, Oluswayiri oba Oluganda.",
    problemPlaceholder: "Nyonyola ekizibu ky'ekirime kyo wano (okugeza, kasooli wange alina amabala ga kyenvu)...",
    selectCrop: "Londa ekirime",
    getAdvice: "Funa Amagezi",
    diagnosis: "Okuzuula ekizibu",
    immediateActions: "Eky'okukola amangu",
    treatmentOptions: "Engeri y'okujjanjaba",
    preventionTips: "Engeri y'okwetangira",
    warning: "Okulabula",
    history: "Ebyafaayo by'okwebuuza",
    exampleQuestions: "Ebibuuzo ebisinga okubuuza",
    loading: "FarmDoc akyalowooza...",
    footer: "FarmDoc AI: Tukula wamu mu magezi.",
    login: "Yingira",
    signup: "Wandiisa",
    logout: "Ffuluma",
    guest: "Omugenyi",
    profile: "Ebikukwatako",
    email: "Email",
    password: "Pasikodi",
    displayName: "Amannya go",
    errorAuth: "Okuyingira kugaanyi. Kebera ebikukwatako.",
    errorNetwork: "Ekizibu ky'omutimbagano. Kebera yintaneeti yo.",
    back: "Ddayo eka",
    noHistory: "Tewali byafaayo byakwebuuza.",
    crops: {
      Maize: "Kasooli",
      Cassava: "Muwogo",
      Beans: "Bijanjalo",
      Matooke: "Matooke",
      Rice: "Muceere",
      Tomatoes: "Nyanya"
    },
    examples: [
      "Kasooli wange alina amabala ga kyenvu",
      "Ebituli ebitono mu bikoola by'ebijanjalo",
      "Ebikoola bya muwogo byefunya",
      "Nyanya zirina amabala amaddugavu"
    ]
  }
};

interface AdviceHistory {
  id: string;
  uid?: string;
  crop: string;
  problem: string;
  response: string;
  timestamp: number;
  language: Language;
}

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState<View>('home');
  const [crop, setCrop] = useState<string>('Maize');
  const [problem, setProblem] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentAdvice, setCurrentAdvice] = useState<string | null>(null);
  const [history, setHistory] = useState<AdviceHistory[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const responseRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  // --- Auth & Sync Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        syncGuestHistory(currentUser.uid);
        fetchUserHistory(currentUser.uid);
      } else {
        loadGuestHistory();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadGuestHistory = () => {
    const saved = localStorage.getItem('farmdoc_guest_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      setHistory([]);
    }
  };

  const syncGuestHistory = async (uid: string) => {
    const saved = localStorage.getItem('farmdoc_guest_history');
    if (saved) {
      const guestHistory: AdviceHistory[] = JSON.parse(saved);
      if (guestHistory.length > 0) {
        const batch = writeBatch(db);
        guestHistory.forEach(item => {
          const docRef = doc(collection(db, 'consultations'));
          batch.set(docRef, { ...item, uid, timestamp: serverTimestamp() });
        });
        await batch.commit();
        localStorage.removeItem('farmdoc_guest_history');
      }
    }
  };

  const fetchUserHistory = (uid: string) => {
    const q = query(
      collection(db, 'consultations'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdviceHistory[];
      setHistory(docs);
    }, (error) => {
      console.error("Firestore error:", error);
    });
  };

  const saveToHistory = async (item: Omit<AdviceHistory, 'id'>) => {
    if (user) {
      try {
        await addDoc(collection(db, 'consultations'), {
          ...item,
          uid: user.uid,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving to Firestore:", error);
      }
    } else {
      const newItem = { ...item, id: Date.now().toString() };
      const updated = [newItem, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('farmdoc_guest_history', JSON.stringify(updated));
    }
  };

  // --- Actions ---
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error) {
      setAuthError(t.errorAuth);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email,
          displayName,
          createdAt: serverTimestamp()
        });
      }
      setShowAuthModal(false);
    } catch (error) {
      setAuthError(t.errorAuth);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
  };

  const getAdvice = async (customProblem?: string) => {
    const problemToSubmit = customProblem || problem;
    if (!problemToSubmit.trim()) return;

    setLoading(true);
    setCurrentAdvice(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const systemPrompt = `You are FarmDoc AI helping East African farmers with crop problems. Respond in simple language. If the user writes in Swahili, respond in Swahili. If the user writes in Luganda, respond in Luganda. Structure advice as Diagnosis, Immediate Action, Treatment Options, prioritizing low-cost organic options, Prevention, and When to seek expert help. Focus on maize, cassava, beans, matooke, rice, and tomatoes. End with FarmDoc AI: Growing smarter together. Use Markdown for formatting. Use bold headers for sections.`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: `Crop: ${crop}\nProblem: ${problemToSubmit}` }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      const adviceText = response.text || "Sorry, I couldn't generate advice at this moment.";
      setCurrentAdvice(adviceText);
      
      await saveToHistory({
        crop,
        problem: problemToSubmit,
        response: adviceText,
        timestamp: Date.now(),
        language: lang
      });
      
      setProblem('');
      setTimeout(() => {
        responseRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (error) {
      console.error("Error fetching advice:", error);
      setCurrentAdvice(t.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    setLang(prev => {
      if (prev === 'en') return 'sw';
      if (prev === 'sw') return 'lug';
      return 'en';
    });
  };

  // --- UI Components ---
  const AuthModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-green-700 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold">{authMode === 'login' ? t.login : t.signup}</h2>
          <button onClick={() => setShowAuthModal(false)} className="hover:bg-green-600 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
              <AlertCircle size={18} />
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-600 ml-1">{t.displayName}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    required 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-600 ml-1">{t.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="farmer@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-600 ml-1">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button className="w-full bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95">
              {authMode === 'login' ? t.login : t.signup}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-100 hover:border-green-200 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            Google
          </button>

          <p className="text-center text-sm text-gray-500">
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-green-700 font-bold ml-1 hover:underline"
            >
              {authMode === 'login' ? t.signup : t.login}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 font-sans text-gray-900 pb-12">
      {/* Header */}
      <header className="bg-green-700 text-white py-6 px-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-white p-2 rounded-full">
              <Sprout className="text-green-700 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t.title}</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleLang}
              className="bg-green-600 hover:bg-green-500 p-2 rounded-lg transition-colors border border-green-400/30 flex items-center gap-2"
            >
              <Languages size={20} />
              <span className="text-xs font-bold uppercase">
                {lang === 'en' ? 'ENG' : lang === 'sw' ? 'SWA' : 'LUG'}
              </span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setView(view === 'history' ? 'home' : 'history')}
                  className={`p-2 rounded-lg transition-all ${view === 'history' ? 'bg-white text-green-700' : 'bg-green-600 hover:bg-green-500'}`}
                >
                  <History size={20} />
                </button>
                <div className="relative group">
                  <button 
                    onClick={() => setView('profile')}
                    className="w-10 h-10 rounded-full border-2 border-green-400 overflow-hidden bg-green-600 flex items-center justify-center"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-green-50 transition-all active:scale-95 flex items-center gap-2"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">{t.login}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-6 space-y-8">
        {view === 'home' && (
          <>
            {/* Hero Section */}
            <div className="text-center space-y-2">
              <p className="text-green-800 font-medium opacity-90">{t.tagline}</p>
            </div>

            {/* Input Form */}
            <section className="bg-white p-6 rounded-3xl shadow-md border border-green-100">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-green-800 mb-3 uppercase tracking-widest">
                    {t.selectCrop}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(t.crops).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setCrop(key)}
                        className={`py-3 px-1 rounded-2xl text-xs md:text-sm font-bold transition-all border-2 ${
                          crop === key 
                            ? 'bg-green-700 text-white border-green-700 shadow-lg transform scale-105' 
                            : 'bg-green-50 text-green-700 border-green-100 hover:border-green-300'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-green-800 uppercase tracking-widest">
                    {t.problemPlaceholder.split('(')[0]}
                  </label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder={t.problemPlaceholder}
                    className="w-full h-32 p-4 rounded-2xl border-2 border-green-100 focus:border-green-500 focus:ring-0 transition-all text-lg resize-none bg-green-50/30"
                  />
                </div>

                <button
                  onClick={() => getAdvice()}
                  disabled={loading || !problem.trim()}
                  className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send size={24} />
                  )}
                  {loading ? t.loading : t.getAdvice}
                </button>
              </div>
            </section>

            {/* Example Questions */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-green-800 flex items-center gap-2 uppercase tracking-widest">
                <Info size={18} />
                {t.exampleQuestions}
              </h2>
              <div className="flex flex-wrap gap-2">
                {t.examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setProblem(ex);
                      getAdvice(ex);
                    }}
                    className="bg-white border border-green-200 px-4 py-3 rounded-full text-sm text-green-700 hover:bg-green-50 transition-colors flex items-center gap-2 shadow-sm active:bg-green-100"
                  >
                    {ex}
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>

            {/* Current Advice */}
            <div ref={responseRef}>
              <AnimatePresence mode="wait">
                {currentAdvice && (
                  <motion.section
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-green-600"
                  >
                    <div className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={24} />
                        <h2 className="text-xl font-bold">{t.crops[crop]} Advice</h2>
                      </div>
                      <button 
                        onClick={() => setCurrentAdvice(null)}
                        className="text-green-200 hover:text-white p-2"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <div className="p-6 prose prose-green max-w-none">
                      <div className="markdown-body">
                        <ReactMarkdown>{currentAdvice}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 border-t border-green-100 text-center text-green-800 font-bold text-sm">
                      {t.footer}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {view === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                <History size={28} />
                {t.history}
              </h2>
              <button onClick={() => setView('home')} className="text-green-700 font-bold text-sm hover:underline">
                {t.back}
              </button>
            </div>

            {history.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center space-y-4 border border-green-100">
                <History size={48} className="mx-auto text-gray-200" />
                <p className="text-gray-500">{t.noHistory}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCrop(item.crop);
                      setCurrentAdvice(item.response);
                      setView('home');
                    }}
                    className="w-full bg-white p-5 rounded-2xl border border-green-100 shadow-sm hover:border-green-400 transition-all text-left flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-xl text-green-700">
                        <Leaf size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-green-900 text-lg">{t.crops[item.crop] || item.crop}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{item.problem}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-green-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {view === 'profile' && user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-green-100 overflow-hidden mx-auto bg-green-50 flex items-center justify-center">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-green-300" />
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.displayName || t.guest}</h2>
                <p className="text-gray-500">{user.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-green-50 p-4 rounded-2xl">
                  <p className="text-2xl font-bold text-green-700">{history.length}</p>
                  <p className="text-xs text-green-600 uppercase font-bold tracking-widest">Consultations</p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl">
                  <p className="text-2xl font-bold text-green-700">{new Date(user.metadata.creationTime!).toLocaleDateString()}</p>
                  <p className="text-xs text-green-600 uppercase font-bold tracking-widest">Joined</p>
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <button 
                  onClick={() => setView('history')}
                  className="w-full bg-green-50 text-green-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-green-100 transition-all"
                >
                  <LayoutDashboard size={20} />
                  {t.history}
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
                >
                  <LogOut size={20} />
                  {t.logout}
                </button>
              </div>
            </div>
            
            <button onClick={() => setView('home')} className="w-full text-green-700 font-bold hover:underline">
              {t.back}
            </button>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-400 text-sm px-4">
        <p>© 2026 FarmDoc AI • East Africa</p>
        <p className="mt-1 italic">Growing smarter together</p>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && <AuthModal />}

      {/* Floating Warning for Severe cases */}
      <AnimatePresence>
        {currentAdvice?.toLowerCase().includes('severe') && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[280px] border-2 border-white z-50"
          >
            <AlertCircle size={32} className="shrink-0" />
            <p className="text-sm font-bold leading-tight">
              {lang === 'en' ? 'Severe issue detected! Contact extension officer immediately.' : 
               lang === 'sw' ? 'Tatizo kubwa limegunduliwa! Wasiliana na afisa ugani mara moja.' :
               'Ekizibu kyanyiiddwa! Funayo omukugu amangu ddala.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
