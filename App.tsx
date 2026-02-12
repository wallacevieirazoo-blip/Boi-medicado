
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CattleRecord, MedicationEntry, MedicineOption, DiseaseOption, CorralOption, Treatment, User } from './types';
import { DISEASES as DEFAULT_DISEASES, MEDICINES as DEFAULT_MEDICINES, CORRALS as DEFAULT_CORRALS, TREATMENTS as DEFAULT_TREATMENTS, AUTHORIZED_USERS as DEFAULT_USERS } from './constants';
import { getTreatmentInsight } from './geminiService';
import { 
  ClipboardCheck, 
  Trash2, 
  RefreshCcw, 
  X, 
  Stethoscope, 
  Database, 
  History, 
  Plus, 
  Settings, 
  Activity, 
  Fence, 
  Wand2, 
  LogOut, 
  UserCircle, 
  LayoutDashboard,
  Users,
  Edit2,
  BarChart3,
  CloudUpload,
  CloudCheck,
  CloudOff,
  Wifi,
  WifiOff,
  Skull,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Calendar
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Persisted Lists
  const [users, setUsers] = useState<(User & { password: string })[]>([]);
  const [records, setRecords] = useState<CattleRecord[]>([]);
  const [pharmacyMedicines, setPharmacyMedicines] = useState<MedicineOption[]>([]);
  const [managedDiseases, setManagedDiseases] = useState<DiseaseOption[]>([]);
  const [managedCorrals, setManagedCorrals] = useState<CorralOption[]>([]);
  const [managedTreatments, setManagedTreatments] = useState<Treatment[]>([]);

  // Modals/Views
  const [showPharmacyManager, setShowPharmacyManager] = useState(false);
  const [showDiseaseManager, setShowDiseaseManager] = useState(false);
  const [showCorralManager, setShowCorralManager] = useState(false);
  const [showTreatmentManager, setShowTreatmentManager] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showDeathModal, setShowDeathModal] = useState(false);

  // Success Feedback
  const [registrationSuccess, setRegistrationSuccess] = useState<{number: string, type: 'treatment' | 'death'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Management Add States
  const [newMedicineName, setNewMedicineName] = useState('');
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newCorralName, setNewCorralName] = useState('');
  const [newTreatmentDisease, setNewTreatmentDisease] = useState('');
  const [newTreatmentMeds, setNewTreatmentMeds] = useState<string[]>(['', '', '']);
  const [editingUser, setEditingUser] = useState<(User & { password: string }) | null>(null);

  // Form Registration State
  const [animalNumber, setAnimalNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [corral, setCorral] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState(['', '']);
  const [medications, setMedications] = useState<MedicationEntry[]>(
    Array(6).fill(null).map(() => ({ medicine: '', dosage: '' }))
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Death Form State
  const [deathAnimal, setDeathAnimal] = useState('');
  const [deathDate, setDeathDate] = useState(new Date().toISOString().split('T')[0]);
  const [deathCorral, setDeathCorral] = useState('');
  const [deathCause, setDeathCause] = useState('');

  // Dashboard Filter State
  const [dashYear] = useState<string>(new Date().getFullYear().toString());
  const [dashMonth, setDashMonth] = useState<string>('all');
  const [dashCorral, setDashCorral] = useState<string>('all');
  const [dashType, setDashType] = useState<string>('all');

  // EFICIENTE: Carrega e migra dados
  useEffect(() => {
    const loadAndMigrate = (key: string, defaultValue: any) => {
      const newKey = `boimedicado_${key}`;
      const oldKey = `agrocare_${key}`;
      
      const newData = localStorage.getItem(newKey);
      if (newData) return JSON.parse(newData);
      
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        localStorage.setItem(newKey, oldData);
        return JSON.parse(oldData);
      }
      
      return defaultValue;
    };

    const savedUser = localStorage.getItem('boimedicado_session') || localStorage.getItem('agrocare_session');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    setRecords(loadAndMigrate('records', []));
    setUsers(loadAndMigrate('users', DEFAULT_USERS));
    setPharmacyMedicines(loadAndMigrate('pharmacy', DEFAULT_MEDICINES));
    setManagedDiseases(loadAndMigrate('diseases', DEFAULT_DISEASES));
    setManagedCorrals(loadAndMigrate('corrals', DEFAULT_CORRALS));
    setManagedTreatments(loadAndMigrate('treatments', DEFAULT_TREATMENTS));
    
    setIsDataLoaded(true);
  }, []);

  const persistData = (key: string, data: any) => {
    localStorage.setItem(`boimedicado_${key}`, JSON.stringify(data));
  };

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanUsername = loginUsername.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword);
    if (user) {
      const { password, ...userSession } = user;
      setCurrentUser(userSession);
      localStorage.setItem('boimedicado_session', JSON.stringify(userSession));
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('boimedicado_session');
  };

  const pendingCount = useMemo(() => records.filter(r => !r.synced).length, [records]);

  const exportToExcel = () => {
    if (records.length === 0) return alert('Não há dados para exportar.');
    const dataToExport = records.map(r => ({
      'Animal ID': r.animalNumber,
      'Data': r.date,
      'Tipo': r.type === 'treatment' ? 'Tratamento' : 'Morte',
      'Local': r.corral,
      'Doenças': r.diseases.join(', '),
      'Medicamentos': r.medications.map(m => `${m.medicine} (${m.dosage})`).join(' | '),
      'Registrado por': r.registeredBy,
      'Sincronizado': r.synced ? 'Sim' : 'Não'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registros_Sanidade");
    XLSX.writeFile(workbook, `Relatorio_BoiMedicado_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSync = async () => {
    if (pendingCount === 0) return;
    setIsSyncing(true);
    setTimeout(() => {
      const updatedRecords = records.map(r => ({ ...r, synced: true }));
      setRecords(updatedRecords);
      persistData('records', updatedRecords);
      setIsSyncing(false);
      alert(`Sincronização concluída: ${pendingCount} registros enviados com sucesso.`);
    }, 2000);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const rDate = new Date(r.date);
      const yearMatch = rDate.getFullYear().toString() === dashYear;
      const monthMatch = dashMonth === 'all' || (rDate.getMonth() + 1).toString() === dashMonth;
      const corralMatch = dashCorral === 'all' || r.corral === dashCorral;
      const typeMatch = dashType === 'all' || r.type === dashType;
      return yearMatch && monthMatch && corralMatch && typeMatch;
    });
  }, [records, dashYear, dashMonth, dashCorral, dashType]);

  const diseaseStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredRecords.filter(r => r.type === 'treatment').forEach(r => {
      r.diseases.forEach(d => { stats[d] = (stats[d] || 0) + 1; });
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const maxCount = useMemo(() => Math.max(...diseaseStats.map(s => s.count), 1), [diseaseStats]);

  const formatAnimalNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 7);
    if (digits.length <= 6) return digits;
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  };

  const handleDiseaseSelection = (idx: number, diseaseLabel: string) => {
    const newD = [...selectedDiseases];
    newD[idx] = diseaseLabel;
    setSelectedDiseases(newD);
    if (diseaseLabel) {
      const treatmentPlan = managedTreatments.find(t => t.diseaseLabel === diseaseLabel);
      if (treatmentPlan) {
        const newMeds = Array(6).fill(null).map(() => ({ medicine: '', dosage: '' }));
        treatmentPlan.medicines.forEach((medLabel, i) => { if (i < 6) newMeds[i] = { medicine: medLabel, dosage: '' }; });
        setMedications(newMeds);
      }
    }
  };

  const handleClear = () => {
    setAnimalNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setCorral('');
    setSelectedDiseases(['', '']);
    setMedications(Array(6).fill(null).map(() => ({ medicine: '', dosage: '' })));
    setAiInsight(null);
  };

  const handleRegister = async () => {
    if (!/^\d{6}-\d{1}$/.test(animalNumber)) return alert('Animal inválido (000000-0)');
    if (!date || !corral) return alert('Data e Local são obrigatórios.');
    const activeMedications = medications.filter(m => m.medicine.trim() !== '');
    const activeDiseases = selectedDiseases.filter(d => d.trim() !== '');
    const newRecord: CattleRecord = {
      id: crypto.randomUUID(), animalNumber, date,
      corral: managedCorrals.find(c => c.value === corral)?.label || corral,
      diseases: activeDiseases, medications: activeMedications,
      timestamp: Date.now(), registeredBy: currentUser?.name || 'Sistema',
      synced: false, type: 'treatment'
    };
    if (navigator.onLine) {
        setIsAnalyzing(true);
        try { const insight = await getTreatmentInsight(newRecord); setAiInsight(insight); } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
    }
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    persistData('records', updatedRecords);
    setRegistrationSuccess({number: animalNumber, type: 'treatment'});
    setTimeout(() => setRegistrationSuccess(null), 5000);
    handleClear();
  };

  const handleRegisterDeath = () => {
    if (!/^\d{6}-\d{1}$/.test(deathAnimal)) return alert('Animal inválido.');
    if (!deathDate || !deathCorral || !deathCause) return alert('Todos os campos obrigatórios.');
    const newRecord: CattleRecord = {
      id: crypto.randomUUID(), animalNumber: deathAnimal, date: deathDate,
      corral: managedCorrals.find(c => c.value === deathCorral)?.label || deathCorral,
      diseases: [deathCause], medications: [], timestamp: Date.now(),
      registeredBy: currentUser?.name || 'Sistema', synced: false, type: 'death'
    };
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    persistData('records', updatedRecords);
    setRegistrationSuccess({number: deathAnimal, type: 'death'});
    setTimeout(() => setRegistrationSuccess(null), 5000);
    setShowDeathModal(false);
    setDeathAnimal('');
    setDeathCause('');
  };

  const handleUpdateUser = (updatedUser: (User & { password: string })) => {
    const newUsersList = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(newUsersList);
    persistData('users', newUsersList);
    setEditingUser(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden bg-[#0f3d2e]">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f3d2e] via-[#1a4d3a] to-[#07251a]" />
        <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white px-10 py-8 rounded-[2rem] shadow-2xl mb-8 border-b-[12px] border-emerald-900/10 text-center">
            <h1 className="text-4xl font-black text-[#0f3d2e] tracking-tighter">BOI MEDICADO</h1>
            <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mt-2">Tecnologia de Confinamento</p>
          </div>
          <div className="w-full bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/20">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase ml-2 tracking-widest">Usuário</label>
                <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-white text-[#0f3d2e] outline-none font-bold shadow-lg focus:ring-4 ring-white/10 transition-all border-2 border-transparent focus:border-emerald-400" placeholder="Seu login" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase ml-2 tracking-widest">Senha</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-white text-[#0f3d2e] outline-none font-bold shadow-lg focus:ring-4 ring-white/10 transition-all border-2 border-transparent focus:border-emerald-400" placeholder="••••••••" />
              </div>
              {loginError && <div className="text-white text-[10px] font-black uppercase text-center bg-red-500/80 backdrop-blur-md p-3 rounded-xl border border-red-400">{loginError}</div>}
              <button type="submit" className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 border-b-4 border-emerald-700 mt-4">ENTRAR NO SISTEMA</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#f8fafc]">
      <div className="fixed inset-0 z-[-1] bg-slate-900 bg-gradient-to-t from-slate-900 to-[#0f3d2e]/20" />
      
      <header className="w-full max-w-6xl mb-6 flex flex-wrap items-center justify-between text-white gap-4 bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-lg"><Database className="w-6 h-6 text-[#0f3d2e]" /></div>
          <div><h1 className="text-xl font-black tracking-tighter leading-none">BOI MEDICADO</h1><div className="flex items-center gap-1.5 mt-1">{navigator.onLine ? <Wifi className="w-2.5 h-2.5 text-emerald-400" /> : <WifiOff className="w-2.5 h-2.5 text-red-400" />}<span className="text-[8px] font-bold uppercase">{navigator.onLine ? 'Online' : 'Offline'}</span></div></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setShowDeathModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-full transition-all text-[10px] font-black uppercase border border-white/10"><Skull className="w-4 h-4 text-red-500" /> Morte</button>
          <button onClick={handleSync} disabled={isSyncing || pendingCount === 0} className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] font-black uppercase border border-white/20 shadow-lg ${pendingCount > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-white/10 opacity-50 cursor-not-allowed'}`}><CloudUpload className="w-4 h-4" />{isSyncing ? '...' : 'Sync'}{pendingCount > 0 && !isSyncing && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full animate-bounce">{pendingCount}</span>}</button>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full border border-white/20"><UserCircle className="w-4 h-4 text-emerald-400" /><span className="text-xs font-bold uppercase">{currentUser.name}</span><button onClick={handleLogout} className="ml-2 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button></div>
        </div>
      </header>

      {currentUser.role === 'manager' && (
        <section className="w-full max-w-6xl mb-8 grid grid-cols-2 md:grid-cols-6 gap-3 animate-in slide-in-from-top-4">
          <button onClick={() => setShowDashboard(true)} className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-emerald-500 transition-all group shadow-xl"><LayoutDashboard className="w-5 h-5 text-emerald-400 group-hover:text-white mb-2" /><span className="text-[9px] font-black text-white uppercase">Dashboard</span></button>
          <button onClick={() => setShowUserManager(true)} className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-blue-600 transition-all group shadow-xl"><Users className="w-5 h-5 text-blue-400 group-hover:text-white mb-2" /><span className="text-[9px] font-black text-white uppercase">Logins</span></button>
          <button onClick={() => setShowTreatmentManager(true)} className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-indigo-600 transition-all group shadow-xl"><Wand2 className="w-5 h-5 text-indigo-400 group-hover:text-white mb-2" /><span className="text-[9px] font-black text-white uppercase">Protocolos</span></button>
          <button onClick={() => setShowCorralManager(true)} className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-amber-600 transition-all group shadow-xl"><Fence className="w-5 h-5 text-amber-400 group-hover:text-white mb-2" /><span className="text-[9px] font-black text-white uppercase">Currais</span></button>
          <button onClick={() => setShowDiseaseManager(true)} className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-red-600 transition-all group shadow-xl"><Activity className="w-5 h-5 text-red-400 group-hover:text-white mb-2" /><span className="text-[9px] font-black text-white uppercase">Doenças</span></button>
          <button onClick={() => setShowPharmacyManager(true)} className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-slate-700 transition-all group shadow-xl"><Settings className="w-5 h-5 text-slate-300 group-hover:text-white mb-2" /><span className="text-[9px] font-black text-white uppercase">Farmácia</span></button>
        </section>
      )}

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-6 md:p-10">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3"><ClipboardCheck className="w-6 h-6 text-[#0f3d2e]" /><h2 className="text-xl font-black text-[#0f3d2e] uppercase">Novo Lançamento</h2></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">ID Animal</label><input type="text" value={animalNumber} onChange={(e) => setAnimalNumber(formatAnimalNumber(e.target.value))} className="w-full px-5 py-5 rounded-2xl border-2 border-slate-100 focus:border-[#0f3d2e] bg-slate-50 outline-none font-mono text-2xl font-black text-[#0f3d2e]" placeholder="000000-0" /></div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Data do Atendimento</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-[#0f3d2e] bg-slate-50 outline-none font-bold text-slate-700" />
              </div>
              <div className="flex flex-col gap-2"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Lote / Local</label><select value={corral} onChange={(e) => setCorral(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-[#0f3d2e] bg-slate-50 outline-none font-bold text-slate-700"><option value="">Selecione...</option>{managedCorrals.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div className="space-y-3 pt-4"><label className="text-[11px] font-black text-slate-500 uppercase ml-1">Diagnósticos</label>{selectedDiseases.map((disease, idx) => (<select key={idx} value={disease} onChange={(e) => handleDiseaseSelection(idx, e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-700"><option value="">{`Doença 0${idx + 1}`}</option>{managedDiseases.map(d => <option key={d.value} value={d.label}>{d.label}</option>)}</select>))}</div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Medicação</label>
              <div className="space-y-3">{medications.map((med, idx) => (<div key={idx} className="flex gap-2"><select value={med.medicine} onChange={(e) => { const newM = [...medications]; newM[idx].medicine = e.target.value; setMedications(newM); }} className="flex-grow px-4 py-4 rounded-xl border border-slate-100 bg-white text-xs font-bold"><option value="">Medicamento {idx + 1}</option>{pharmacyMedicines.map(m => <option key={m.value} value={m.label}>{m.label}</option>)}</select><input type="text" placeholder="Dose" value={med.dosage} onChange={(e) => { const newM = [...medications]; newM[idx].dosage = e.target.value; setMedications(newM); }} className="w-28 px-4 py-4 rounded-xl border border-slate-100 bg-white text-xs font-mono font-bold" /></div>))}</div>
            </div>
          </div>
          {aiInsight && <div className="mt-10 p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex gap-4 animate-in slide-in-from-bottom-2"><div className="p-3 bg-white rounded-2xl h-fit"><Stethoscope className="w-6 h-6 text-[#0f3d2e]" /></div><div><h4 className="text-[11px] font-black text-[#0f3d2e] uppercase mb-1">Análise Veterinária IA</h4><p className="text-sm italic text-slate-600 leading-relaxed font-medium">"{aiInsight}"</p></div></div>}
          <div className="mt-12 pt-10 border-t border-slate-100 flex flex-col sm:flex-row gap-5">
            <button onClick={handleRegister} disabled={isAnalyzing} className="flex-grow py-5 bg-[#0f3d2e] hover:bg-emerald-900 text-white rounded-[2rem] font-black uppercase text-sm shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">{isAnalyzing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}{isAnalyzing ? 'PROCESSANDO...' : 'CADASTRAR'}</button>
            <button onClick={handleClear} className="px-10 py-5 bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-[2rem] font-black uppercase text-xs transition-all"><RefreshCcw className="w-4 h-4" /></button>
          </div>
          {registrationSuccess && <div className={`mt-8 p-6 ${registrationSuccess.type === 'death' ? 'bg-slate-900' : 'bg-emerald-600'} text-white rounded-3xl shadow-2xl flex items-center gap-4 animate-in zoom-in`}><div className="bg-white/20 p-3 rounded-full"><CheckCircle2 className="w-7 h-7" /></div><div><p className="font-black text-base uppercase">#{registrationSuccess.number} Lançado!</p><p className="text-xs opacity-80">Dados protegidos no banco de dados local</p></div></div>}
        </section>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-6 shadow-2xl max-h-[780px] overflow-y-auto text-slate-800">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Atividade</h3></div>
              <span className="text-[10px] font-black bg-[#0f3d2e] text-white px-3 py-1 rounded-full">{records.length}</span>
            </div>
            <div className="space-y-4">
              {records.length === 0 ? <div className="text-center py-20 opacity-20 font-black uppercase text-[10px]">Vazio</div> : 
              (currentUser.role === 'manager' ? records : records.slice(0, 5)).map((record) => (
                <div key={record.id} className={`p-5 rounded-3xl border-2 hover:shadow-xl transition-all relative ${record.type === 'death' ? 'bg-slate-50 grayscale' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-2"><span className="text-base font-black text-[#0f3d2e]">#{record.animalNumber}</span><div className="flex items-center gap-2">{record.synced ? <CloudCheck className="w-4 h-4 text-blue-500" /> : <CloudOff className="w-4 h-4 text-orange-400" />}<span className="text-[10px] font-black text-slate-300">{record.date}</span></div></div>
                  <div className="flex flex-wrap gap-1.5 mb-2">{record.diseases.map((d, i) => <span key={i} className="text-[9px] px-2 py-1 rounded-lg font-black uppercase bg-slate-100 text-slate-600">{d}</span>)}</div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-400 font-bold uppercase flex justify-between"><span>Local: {record.corral}</span><span>Op: {record.registeredBy.split(' ')[0]}</span></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* --- MODAIS DE GERENCIAMENTO --- */}
      
      {showDashboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col max-h-[95vh] border-4 border-white text-slate-800">
            <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 rounded-t-[3rem]">
              <div className="flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-[#0f3d2e]" />
                <h3 className="font-black text-[#0f3d2e] uppercase text-2xl">Monitor de Sanidade</h3>
              </div>
              <div className="flex gap-4">
                <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 shadow-lg">
                  <Download className="w-4 h-4" /> Exportar
                </button>
                <button onClick={() => setShowDashboard(false)} className="p-4 hover:bg-slate-100 rounded-full transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto">
              {/* FILTROS DO DASHBOARD */}
              <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> Tipo de Registro
                  </label>
                  <select 
                    value={dashType} 
                    onChange={e => setDashType(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="treatment">Tratamentos</option>
                    <option value="death">Mortes</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                    <Fence className="w-3 h-3" /> Lote / Local
                  </label>
                  <select 
                    value={dashCorral} 
                    onChange={e => setDashCorral(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="all">Todos os currais</option>
                    {managedCorrals.map(c => <option key={c.value} value={c.label}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                    <History className="w-3 h-3" /> Mês
                  </label>
                  <select 
                    value={dashMonth} 
                    onChange={e => setDashMonth(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="all">Todos os meses</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => { setDashType('all'); setDashCorral('all'); setDashMonth('all'); }} 
                  className="p-3 bg-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all"
                >
                  Limpar Filtros
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center">
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3">Filtrados</p>
                  <span className="text-4xl font-black text-emerald-600">{filteredRecords.length}</span>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center">
                  <p className="text-[11px] font-black text-red-400 uppercase mb-3">Mortes</p>
                  <span className="text-4xl font-black text-slate-900">{filteredRecords.filter(r => r.type === 'death').length}</span>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center">
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3">Mortalidade</p>
                  <span className="text-4xl font-black text-blue-600">
                    {filteredRecords.length > 0 ? ((filteredRecords.filter(r => r.type === 'death').length / filteredRecords.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center">
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3">Pendentes (Total)</p>
                  <span className="text-4xl font-black text-orange-500">{pendingCount}</span>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border-2 shadow-xl">
                <h4 className="font-black text-[#0f3d2e] uppercase text-base mb-10 border-b pb-4">Doenças Detectadas (No filtro atual)</h4>
                <div className="space-y-6">
                    {diseaseStats.length === 0 ? (
                      <div className="text-center py-10 text-slate-300 font-bold uppercase text-xs italic">Nenhum dado encontrado para os filtros selecionados</div>
                    ) : (
                      diseaseStats.map((stat, i) => (
                        <div key={i} className="mb-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-black uppercase text-slate-600">{stat.name}</span>
                            <span className="text-sm font-black text-[#0f3d2e]">{stat.count}</span>
                          </div>
                          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                              style={{ width: `${(stat.count / maxCount) * 100}%` }} 
                            />
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[85vh] border-4 border-blue-50 text-slate-800">
            <div className="p-10 border-b flex items-center justify-between"><h3 className="font-black text-[#0f3d2e] uppercase text-2xl">Equipe</h3><button onClick={() => setShowUserManager(false)}><X className="w-8 h-8" /></button></div>
            <div className="p-10 overflow-y-auto space-y-5">
              {editingUser ? (
                <div className="space-y-6 bg-slate-50 p-10 rounded-[2.5rem] border-2 shadow-inner">
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-400 ml-2">Nome</label><input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-5 rounded-2xl border-2 bg-white font-black text-slate-700 outline-none" /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-400 ml-2">Senha</label><input type="text" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-5 rounded-2xl border-2 bg-white font-mono font-black text-emerald-600 outline-none" /></div>
                    <div className="flex gap-4 pt-4"><button onClick={() => handleUpdateUser(editingUser)} className="flex-grow py-5 bg-[#0f3d2e] text-white rounded-[2rem] font-black uppercase text-sm shadow-xl">Salvar</button><button onClick={() => setEditingUser(null)} className="px-10 py-5 bg-white border-2 text-slate-400 rounded-[2rem] font-black uppercase text-sm">Voltar</button></div>
                </div>
              ) : users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-100 group">
                  <div><p className="font-black text-base text-[#0f3d2e] uppercase">{u.name}</p><p className="text-[11px] font-bold text-slate-400 uppercase">Usuário: {u.username}</p></div>
                  <button onClick={() => setEditingUser(u)} className="p-4 border-2 rounded-2xl hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-all"><Edit2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPharmacyManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 border-4 border-slate-100">
            <div className="flex justify-between items-center mb-8 border-b pb-5">
                <div className="flex items-center gap-3"><Settings className="w-6 h-6 text-slate-500" /><h3 className="font-black uppercase text-sm text-slate-500">Gestão de Farmácia</h3></div>
                <button onClick={() => setShowPharmacyManager(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X className="w-6 h-6"/></button>
            </div>
            <div className="flex gap-3 mb-8">
                <input type="text" value={newMedicineName} onChange={e => setNewMedicineName(e.target.value)} className="flex-grow p-5 bg-slate-50 border-2 rounded-2xl font-bold" placeholder="Nome do remédio" />
                <button onClick={() => { if(!newMedicineName) return; const up = [...pharmacyMedicines, {label: newMedicineName, value: newMedicineName.toLowerCase().replace(/\s/g, '_')}]; setPharmacyMedicines(up); persistData('pharmacy', up); setNewMedicineName(''); }} className="bg-[#0f3d2e] text-white p-5 rounded-2xl hover:bg-emerald-900 shadow-xl"><Plus/></button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3 pr-2 text-slate-800">
                {pharmacyMedicines.map(m => (
                    <div key={m.value} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:bg-white transition-all group">
                        <span className="text-xs font-black uppercase">{m.label}</span>
                        <button onClick={() => { const up = pharmacyMedicines.filter(x => x.value !== m.value); setPharmacyMedicines(up); persistData('pharmacy', up); }} className="text-red-300 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showDiseaseManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 border-4 border-red-50">
            <div className="flex justify-between items-center mb-8 border-b pb-5">
                <div className="flex items-center gap-3"><Activity className="w-6 h-6 text-red-600" /><h3 className="font-black uppercase text-sm text-red-600">Catálogo Sanitário</h3></div>
                <button onClick={() => setShowDiseaseManager(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X className="w-6 h-6"/></button>
            </div>
            <div className="flex gap-3 mb-8">
                <input type="text" value={newDiseaseName} onChange={e => setNewDiseaseName(e.target.value)} className="flex-grow p-5 bg-slate-50 border-2 rounded-2xl font-bold" placeholder="Nova Doença" />
                <button onClick={() => { if(!newDiseaseName) return; const up = [...managedDiseases, {label: newDiseaseName, value: newDiseaseName.toLowerCase().replace(/\s/g, '_')}]; setManagedDiseases(up); persistData('diseases', up); setNewDiseaseName(''); }} className="bg-red-600 text-white p-5 rounded-2xl hover:bg-red-700 shadow-xl"><Plus/></button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3 pr-2 text-slate-800">
                {managedDiseases.map(d => (
                    <div key={d.value} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:bg-white transition-all group">
                        <span className="text-xs font-black uppercase">{d.label}</span>
                        <button onClick={() => { const up = managedDiseases.filter(x => x.value !== d.value); setManagedDiseases(up); persistData('diseases', up); }} className="text-red-300 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showCorralManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-8 border-4 border-amber-50">
            <div className="flex justify-between items-center mb-8 border-b pb-5">
                <div className="flex items-center gap-3"><Fence className="w-6 h-6 text-amber-600" /><h3 className="font-black uppercase text-sm text-amber-600">Currais e Piquetes</h3></div>
                <button onClick={() => setShowCorralManager(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X className="w-6 h-6"/></button>
            </div>
            <div className="flex gap-3 mb-8">
                <input type="text" value={newCorralName} onChange={e => setNewCorralName(e.target.value)} className="flex-grow p-5 bg-slate-50 border-2 rounded-2xl font-bold" placeholder="Nome do local" />
                <button onClick={() => { if(!newCorralName) return; const up = [...managedCorrals, {label: newCorralName, value: newCorralName.toLowerCase().replace(/\s/g, '_')}]; setManagedCorrals(up); persistData('corrals', up); setNewCorralName(''); }} className="bg-amber-600 text-white p-5 rounded-2xl hover:bg-amber-700 shadow-xl"><Plus/></button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3 pr-2 text-slate-800">
                {managedCorrals.map(c => (
                    <div key={c.value} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:bg-white transition-all group">
                        <span className="text-xs font-black uppercase">{c.label}</span>
                        {/* Corrected property access from 'id' to 'value' */}
                        <button onClick={() => { const up = managedCorrals.filter(x => x.value !== c.value); setManagedCorrals(up); persistData('corrals', up); }} className="text-red-300 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showTreatmentManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3"><Wand2 className="w-7 h-7" /><h3 className="font-black uppercase text-base">Automação de Tratamentos</h3></div>
                <button onClick={() => setShowTreatmentManager(false)} className="hover:rotate-90 transition-transform"><X className="w-8 h-8" /></button>
            </div>
            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto text-slate-800">
              <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border-2 border-indigo-100 space-y-6">
                <h4 className="text-[11px] font-black uppercase text-indigo-400 text-center">Vincular Protocolo Automático</h4>
                <div className="space-y-4">
                    <select value={newTreatmentDisease} onChange={e => setNewTreatmentDisease(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-500"><option value="">Vincular a Doença...</option>{managedDiseases.map(d => <option key={d.value} value={d.label}>{d.label}</option>)}</select>
                    <div className="space-y-3">
                        {newTreatmentMeds.map((m, i) => (<select key={i} value={m} onChange={e => {const up = [...newTreatmentMeds]; up[i] = e.target.value; setNewTreatmentMeds(up);}} className="w-full p-3 border-2 border-indigo-50 rounded-xl text-xs font-bold outline-none"><option value="">Medicamento {i+1}</option>{pharmacyMedicines.map(med => <option key={med.value} value={med.label}>{med.label}</option>)}</select>))}
                    </div>
                </div>
                <button onClick={() => { if(!newTreatmentDisease) return; const act = newTreatmentMeds.filter(x => x); if(act.length === 0) return; const up = [{id: crypto.randomUUID(), diseaseLabel: newTreatmentDisease, medicines: act}, ...managedTreatments]; setManagedTreatments(up); persistData('treatments', up); setNewTreatmentDisease(''); setNewTreatmentMeds(['','','']); }} className="w-full py-5 bg-indigo-600 hover:bg-indigo-800 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Salvar Protocolo</button>
              </div>
              <div className="space-y-4">
                {managedTreatments.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-5 bg-slate-50 border-2 border-transparent rounded-3xl hover:bg-white group transition-all">
                        <div><p className="text-sm font-black text-slate-800 uppercase">{t.diseaseLabel}</p><div className="flex gap-2 mt-1">{t.medicines.map((med, i) => <span key={i} className="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{med}</span>)}</div></div>
                        <button onClick={() => { const up = managedTreatments.filter(x => x.id !== t.id); setManagedTreatments(up); persistData('treatments', up); }} className="text-red-300 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5"/></button>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeathModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border-4 border-slate-900">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4"><Skull className="w-8 h-8 text-red-500 animate-pulse" /><h3 className="font-black uppercase tracking-[0.3em] text-lg">Registro de Morte</h3></div>
                <button onClick={() => setShowDeathModal(false)}><X className="w-8 h-8" /></button>
            </div>
            <div className="p-10 space-y-8 text-slate-800">
                <div className="flex flex-col gap-2"><label className="text-[11px] font-black text-slate-400 uppercase ml-1">Animal Morto (Brinco)</label><input type="text" value={deathAnimal} onChange={(e) => setDeathAnimal(formatAnimalNumber(e.target.value))} className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none font-mono text-3xl font-black text-slate-800" placeholder="000000-0" /></div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2"><label className="text-[11px] font-black text-slate-400 uppercase">Data Óbito</label><input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className="w-full px-4 py-4 border-2 rounded-2xl font-bold" /></div>
                    <div className="flex flex-col gap-2"><label className="text-[11px] font-black text-slate-400 uppercase">Último Curral</label><select value={deathCorral} onChange={e => setDeathCorral(e.target.value)} className="w-full px-4 py-4 border-2 rounded-2xl font-bold"><option value="">Local...</option>{managedCorrals.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                </div>
                <div className="flex flex-col gap-2"><label className="text-[11px] font-black text-slate-400 uppercase">Causa Provável</label><select value={deathCause} onChange={e => setDeathCause(e.target.value)} className="w-full px-6 py-5 border-2 border-red-100 rounded-3xl font-black text-red-600 bg-red-50 text-base shadow-inner"><option value="">Vincular causa...</option>{managedDiseases.map(d => <option key={d.value} value={d.label}>{d.label}</option>)}</select></div>
                <button onClick={handleRegisterDeath} className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95">Confirmar Morte</button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full max-w-6xl mt-12 py-10 text-white/10 text-[10px] font-black uppercase tracking-[0.5em] text-center border-t border-white/5">© 2024 Boi Medicado Pro • Gestão Sanitária de Alta Performance</footer>
    </div>
  );
};

export default App;
