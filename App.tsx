
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CattleRecord, MedicationEntry, MedicineOption, 
  FarmConfig, FarmUnit, RecordType, User 
} from './types';
import { 
  DISEASES as DEFAULT_DISEASES, MEDICINES as DEFAULT_MEDICINES, 
  CORRALS as DEFAULT_CORRALS 
} from './constants';
import { 
  ClipboardCheck, X, Plus, LogOut, 
  Skull, CheckCircle2, Building2, Package, BarChart3, 
  Calendar, Undo2, Loader2, ShieldCheck, Map, AlertTriangle
} from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE CORRIGIDAS (V8/COMPAT NAMESPACED) ---
import { auth, db } from './firebaseConfig';
import firebase from 'firebase/app';

// --- COMPONENTE DE MODAL ---
const ModalShell = ({ title, icon: Icon, onClose, children }: any) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-8 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-2xl"><Icon className="w-6 h-6 text-slate-800" /></div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{title}</h3>
        </div>
        <button onClick={onClose} className="p-4 hover:bg-slate-100 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
      </div>
      <div className="p-8 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const App: React.FC = () => {
  // --- AUTH & GLOBAL STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [configError, setConfigError] = useState(false);

  // --- DATA STATE ---
  const [records, setRecords] = useState<CattleRecord[]>([]);
  const [pharmacyMedicines, setPharmacyMedicines] = useState<MedicineOption[]>([]);
  const [farmConfig, setFarmConfig] = useState<FarmConfig | null>(null);
  const [units, setUnits] = useState<FarmUnit[]>([]);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'units'>('register');
  const [showPharmacyManager, setShowPharmacyManager] = useState(false);
  
  // --- FORM STATE ---
  const [animalNumber, setAnimalNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [corral, setCorral] = useState('');
  const [selectedDisease, setSelectedDisease] = useState('');
  
  const [medications, setMedications] = useState<{medicine: string, dosage: string}[]>(
    Array.from({ length: 6 }, () => ({ medicine: '', dosage: '' }))
  );

  // Verificação de configuração inicial
  useEffect(() => {
    // @ts-ignore
    const isPlaceholder = auth.app.options.apiKey === "SUA_API_KEY_AQUI";
    if (isPlaceholder) setConfigError(true);
  }, []);

  // --- MONITORAMENTO DE AUTH (Sintaxe Namespaced) ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userDoc = await db.collection("users").doc(firebaseUser.uid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data() as User;
            setCurrentUser({ ...userData, id: firebaseUser.uid });
            
            if (userData.role === 'super_admin') {
              setActiveTab('units');
            } else {
              const farmDoc = await db.collection("units").doc(userData.unitId).get();
              if (farmDoc.exists) {
                // @ts-ignore
                setFarmConfig({ farmName: farmDoc.data().name, unitId: userData.unitId });
              }
              setActiveTab('register');
            }
          } else {
            setLoginError('Perfil não encontrado no Firestore.');
            await auth.signOut();
            setCurrentUser(null);
          }
        } catch (error: any) {
          console.error("Erro ao buscar perfil:", error);
          setLoginError(`Erro de conexão: ${error.message}`);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setFarmConfig(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- SINCRONIZAÇÃO EM TEMPO REAL (Sintaxe Namespaced) ---
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'super_admin') {
      const unsubUnits = db.collection("units").orderBy("createdAt", "desc").onSnapshot((snap) => {
        setUnits(snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as FarmUnit)));
      });
      return () => unsubUnits();
    }

    if (currentUser.unitId) {
      const unsubRecords = db.collection("records")
        .where("unitId", "==", currentUser.unitId)
        .orderBy("timestamp", "desc")
        .limit(100)
        .onSnapshot((snap) => {
          setRecords(snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as CattleRecord)));
        });

      const unsubPharmacy = db.collection("pharmacy")
        .where("unitId", "==", currentUser.unitId)
        .onSnapshot((snap) => {
          const data = snap.docs.map((doc) => ({ ...doc.data() } as MedicineOption));
          setPharmacyMedicines(data.length > 0 ? data : DEFAULT_MEDICINES);
        });

      return () => { unsubRecords(); unsubPharmacy(); };
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setActionLoading(true);
    try {
      await auth.signInWithEmailAndPassword(loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setLoginError('E-mail ou senha incorretos.');
      } else {
        setLoginError(`Erro ao entrar: ${err.message}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => auth.signOut();

  const handleRegisterTreatment = async () => {
    if (!currentUser || !farmConfig) return;
    if (!animalNumber.trim()) return alert('Informe o número do brinco.');
    if (!corral) return alert('Selecione o curral/lote.');
    if (!selectedDisease) return alert('Informe a enfermidade.');
    
    const validMeds = medications.filter(m => m.medicine && parseFloat(m.dosage) > 0);
    if (validMeds.length === 0) return alert('Adicione pelo menos um medicamento com dosagem.');

    setActionLoading(true);
    try {
      await db.runTransaction(async (transaction) => {
        const medEntries: MedicationEntry[] = [];
        for (const m of validMeds) {
          const medObj = pharmacyMedicines.find(p => p.label === m.medicine);
          if (!medObj) throw new Error(`Medicamento ${m.medicine} não encontrado.`);
          
          const medRef = db.collection("pharmacy").doc(medObj.value);
          const medSnap = await transaction.get(medRef);
          
          if (!medSnap.exists) throw new Error(`Dados de estoque para ${m.medicine} indisponíveis.`);
          
          // @ts-ignore
          const currentStock = medSnap.data().stockML;
          const dose = parseFloat(m.dosage);
          if (currentStock < dose) throw new Error(`Estoque insuficiente de ${m.medicine}.`);
          
          transaction.update(medRef, { stockML: currentStock - dose });
          medEntries.push({ medicine: m.medicine, dosage: dose, cost: dose * (medObj.pricePerML || 0) });
        }
        
        // Cria referência para novo documento
        const recordRef = db.collection("records").doc();
        const recordData = {
          animalNumber, date, corral, diseases: [selectedDisease],
          medications: medEntries, timestamp: Date.now(), registeredBy: currentUser.name,
          type: 'treatment' as RecordType, unitId: currentUser.unitId
        };
        
        transaction.set(recordRef, recordData);
      });

      alert('Registro salvo com sucesso!');
      
      setAnimalNumber('');
      setMedications(Array.from({ length: 6 }, () => ({ medicine: '', dosage: '' })));
      setSelectedDisease('');
    } catch (err: any) {
      alert(err.message || 'Erro ao processar tratamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const dashboardData = useMemo(() => {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return months.map((m, idx) => {
      const monthRecords = records.filter(r => new Date(r.date + 'T00:00:00').getMonth() === idx);
      return {
        month: m,
        medicated: monthRecords.filter(r => r.type === 'treatment').length,
        entry: monthRecords.filter(r => r.type === 'entry').reduce((acc, r) => acc + (r.quantity || 0), 0),
        death: monthRecords.filter(r => r.type === 'death').length,
      };
    });
  }, [records]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1a14] text-emerald-500">
      <Loader2 className="w-12 h-12 animate-spin mb-4" />
      <span className="font-black uppercase tracking-widest text-[10px]">Autenticando na Nuvem...</span>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a1a14]">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-block p-5 bg-emerald-50 rounded-[2rem] mb-4"><Building2 className="w-12 h-12 text-emerald-600" /></div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Boi Medicado</h1>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Controle Sanitário</p>
          </div>
          
          {configError && (
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[10px] font-bold text-amber-800 uppercase leading-tight">Atenção: Configure suas chaves do Firebase no arquivo firebaseConfig.ts</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4 tracking-widest">E-mail Corporativo</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="usuario@email.com" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-slate-900 outline-none focus:ring-2 ring-emerald-500 transition-all placeholder:text-slate-300" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4 tracking-widest">Sua Senha</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-slate-900 outline-none focus:ring-2 ring-emerald-500 transition-all placeholder:text-slate-300" />
            </div>
            {loginError && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-center text-red-600 font-black text-[9px] uppercase leading-tight">{loginError}</p>
              </div>
            )}
            <button disabled={actionLoading || configError} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Acessar Sistema'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">Versão Cloud 2025.01</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-6 flex items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl text-white shadow-lg ${currentUser.role === 'super_admin' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
            {currentUser.role === 'super_admin' ? <ShieldCheck className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase leading-none truncate max-w-[150px] md:max-w-none">
              {currentUser.role === 'super_admin' ? 'Painel Administrativo' : farmConfig?.farmName || 'Unidade não Vinculada'}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              {currentUser.role === 'super_admin' ? 'Acesso Total' : `${currentUser.role}: ${currentUser.name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="hidden md:flex bg-slate-100 p-1 rounded-2xl">
             {currentUser.role === 'super_admin' ? (
               <button onClick={() => setActiveTab('units')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'units' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Unidades</button>
             ) : (
               <>
                 <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Painel</button>
                 <button onClick={() => setActiveTab('register')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'register' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Manejo</button>
               </>
             )}
           </div>
           <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      {activeTab === 'units' && currentUser.role === 'super_admin' ? (
        <main className="w-full max-w-7xl">
          <div className="bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600"><Map className="w-8 h-8" /></div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Fazendas</h2>
               </div>
               <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-3"><Plus className="w-5 h-5" /> Nova Unidade</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {units.map(unit => (
                 <div key={unit.id} className="p-8 bg-slate-50 rounded-[2.5rem] border hover:border-indigo-500 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                       <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors"><Building2 className="w-6 h-6" /></div>
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${unit.active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                         {unit.active ? 'Ativa' : 'Expirada'}
                       </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase mb-1">{unit.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">ID: {unit.id}</p>
                    <div className="flex gap-2">
                       <button className="flex-1 py-3 bg-white rounded-xl text-[9px] font-black uppercase border hover:bg-indigo-50 transition-colors">Configurar</button>
                       <button className="p-3 bg-white rounded-xl border hover:bg-red-50 transition-colors"><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                    </div>
                 </div>
               ))}
               {units.length === 0 && (
                 <div className="col-span-full py-20 text-center">
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma unidade sincronizada.</p>
                 </div>
               )}
            </div>
          </div>
        </main>
      ) : activeTab === 'dashboard' ? (
        <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-9 bg-white rounded-[3rem] shadow-2xl p-8 border border-slate-100 overflow-x-auto">
             <div className="flex items-center gap-3 mb-8"><BarChart3 className="w-6 h-6 text-emerald-600" /><h2 className="text-xl font-black text-slate-800 uppercase leading-none">Relatórios Cloud</h2></div>
             <table className="w-full min-w-[800px] text-left border-collapse">
               <thead className="bg-[#1e293b] text-white">
                 <tr>
                   <th className="p-4 text-[10px] uppercase text-center rounded-tl-2xl">Mês</th>
                   <th className="p-4 text-[10px] uppercase text-center">Medicações</th>
                   <th className="p-4 text-[10px] uppercase text-center">Entradas</th>
                   <th className="p-4 text-[10px] uppercase text-center rounded-tr-2xl">Mortes</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {dashboardData.map((d, i) => (
                   <tr key={i} className="hover:bg-slate-50 transition-colors">
                     <td className="p-4 text-[11px] font-bold text-slate-700 capitalize text-center">{d.month}</td>
                     <td className="p-4 text-[11px] font-black text-center">{d.medicated}</td>
                     <td className="p-4 text-[11px] font-black text-center text-emerald-600">+{d.entry}</td>
                     <td className="p-4 text-[11px] font-black text-center text-red-500">-{d.death}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           <div className="lg:col-span-3 space-y-6">
              <div className="bg-slate-900 text-white rounded-[3rem] p-8 shadow-2xl">
                 <h3 className="text-[10px] font-black uppercase opacity-40 mb-6">Estoque em Tempo Real</h3>
                 <div className="space-y-4">
                    {pharmacyMedicines.slice(0, 5).map(m => (
                      <div key={m.value} className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-[10px] font-bold uppercase truncate max-w-[120px]">{m.label}</span>
                          <span className={`text-[11px] font-black ${m.stockML < 100 ? 'text-red-400' : 'text-emerald-400'}`}>{m.stockML} mL</span>
                      </div>
                    ))}
                    <button onClick={() => setShowPharmacyManager(true)} className="w-full py-3 bg-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-white/20 transition-all">Ver Inventário Completo</button>
                 </div>
              </div>
           </div>
        </main>
      ) : (
        <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 bg-white rounded-[3rem] shadow-2xl p-8 border border-slate-100">
            <div className="flex items-center gap-3 mb-10 border-b pb-6"><ClipboardCheck className="w-6 h-6 text-emerald-600" /><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Ficha Sanitária Digital</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase">Brinco</label><input type="text" value={animalNumber} onChange={e => setAnimalNumber(e.target.value)} placeholder="000000-0" className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none text-2xl font-black text-emerald-700 outline-none" /></div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Localização (Curral)</label>
                  <select value={corral} onChange={e => setCorral(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-600"><option value="">Selecionar...</option>{DEFAULT_CORRALS.map(c => <option key={c.value} value={c.label}>{c.label}</option>)}</select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Diagnóstico</label>
                  <select value={selectedDisease} onChange={e => setSelectedDisease(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700"><option value="">Selecione...</option>{DEFAULT_DISEASES.map(d => <option key={d.value} value={d.label}>{d.label}</option>)}</select>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase">Tratamento</label>
                <div className="space-y-2">
                  {medications.map((med, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select value={med.medicine} onChange={e => { const up = [...medications]; up[idx] = { ...up[idx], medicine: e.target.value }; setMedications(up); }} className="flex-grow px-3 py-3 bg-slate-50 rounded-xl text-[10px] font-bold border-none outline-none"><option value="">Remédio</option>{pharmacyMedicines.map(m => <option key={m.value} value={m.label}>{m.label}</option>)}</select>
                      <input type="number" placeholder="mL" value={med.dosage} onChange={e => { const up = [...medications]; up[idx] = { ...up[idx], dosage: e.target.value }; setMedications(up); }} className="w-16 px-3 py-3 bg-slate-50 rounded-xl text-[10px] font-bold text-center border-none outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <button disabled={actionLoading} onClick={handleRegisterTreatment} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> Sincronizar Ficha Animal</>}
              </button>
            </div>
          </section>
          
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white rounded-[3rem] p-8 shadow-2xl space-y-4">
               <h3 className="text-xs font-black opacity-40 uppercase tracking-widest mb-2">Ações Rápidas</h3>
               <button className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-lg"><Skull className="w-5 h-5" /> Registrar Morte</button>
               <button className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-amber-700 transition-all shadow-lg"><Undo2 className="w-5 h-5" /> Retorno ao Pasto</button>
            </div>
            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 flex items-center gap-4 text-emerald-600">
               <div className="p-3 bg-emerald-50 rounded-2xl"><Calendar className="w-6 h-6" /></div>
               <div>
                  <span className="font-black uppercase tracking-tighter text-sm block">Modo Offline Ativo</span>
                  <span className="text-[8px] font-bold uppercase text-slate-400">Dados salvos localmente</span>
               </div>
            </div>
          </aside>
        </main>
      )}

      {showPharmacyManager && (
        <ModalShell title="Inventário da Unidade" icon={Package} onClose={() => setShowPharmacyManager(false)}>
           <div className="space-y-4">
              {pharmacyMedicines.map(m => (
                <div key={m.value} className="flex justify-between items-center p-6 bg-slate-50 border rounded-[2rem] hover:border-emerald-500 transition-all">
                  <div>
                    <p className="text-sm font-black uppercase text-slate-800 leading-none mb-1">{m.label}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Medicamento Sanitário</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600 leading-none">{m.stockML} mL</p>
                  </div>
                </div>
              ))}
           </div>
        </ModalShell>
      )}

      <footer className="mt-12 py-10 text-slate-300 text-[9px] font-black uppercase tracking-[0.4em] text-center border-t border-slate-200 w-full max-w-7xl">
        Boi Medicado Cloud • Gestão Digital de Sanidade • 2025
      </footer>
    </div>
  );
};

export default App;
