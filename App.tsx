
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CattleRecord, MedicationEntry, MedicineOption, DiseaseOption, 
  CorralOption, Treatment, User, FarmConfig, FarmUnit, UserRole, RecordType
} from './types';
import { 
  DISEASES as DEFAULT_DISEASES, MEDICINES as DEFAULT_MEDICINES, 
  CORRALS as DEFAULT_CORRALS 
} from './constants';
import { 
  ClipboardCheck, X, Plus, Activity, LogOut, UserCircle, Users, 
  Skull, CheckCircle2, Building2, Package, BarChart3, Settings, Globe, Eye, EyeOff, Calendar, Edit2, Save, ArrowDownToLine, Utensils, Undo2, Loader2
} from 'lucide-react';

// Firebase Imports
import { auth, db } from './firebaseConfig';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  orderBy, 
  limit, 
  Timestamp, 
  runTransaction 
} from 'firebase/firestore';

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

  // --- UNIT DATA (FIRESTORE) ---
  const [records, setRecords] = useState<CattleRecord[]>([]);
  const [pharmacyMedicines, setPharmacyMedicines] = useState<MedicineOption[]>([]);
  const [farmConfig, setFarmConfig] = useState<FarmConfig | null>(null);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'units'>('register');
  const [showPharmacyManager, setShowPharmacyManager] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<{show: boolean, type: RecordType | null}>({show: false, type: null});
  
  // --- FORM STATE ---
  const [animalNumber, setAnimalNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [corral, setCorral] = useState('');
  const [selectedDisease, setSelectedDisease] = useState('');
  const [medications, setMedications] = useState<{medicine: string, dosage: string}[]>(Array(6).fill({ medicine: '', dosage: '' }));

  // --- MONITORAMENTO DE AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setCurrentUser({ ...userData, id: firebaseUser.uid });
            
            if (userData.role === 'super_admin') {
              setActiveTab('units');
            } else {
              const farmDoc = await getDoc(doc(db, "units", userData.unitId));
              if (farmDoc.exists()) {
                setFarmConfig({ farmName: farmDoc.data().name, unitId: userData.unitId });
              }
            }
          }
        } catch (error) {
          console.error("Firebase fetch error:", error);
        }
      } else {
        setCurrentUser(null);
        setFarmConfig(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- SINCRONIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    if (!currentUser || currentUser.role === 'super_admin') return;

    const qRecords = query(
      collection(db, "records"), 
      where("unitId", "==", currentUser.unitId),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const unsubRecords = onSnapshot(qRecords, (snap) => {
      setRecords(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CattleRecord)));
    }, (error) => {
      console.error("Records snapshot error:", error);
    });

    const qPharmacy = query(collection(db, "pharmacy"), where("unitId", "==", currentUser.unitId));
    const unsubPharmacy = onSnapshot(qPharmacy, (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data() } as MedicineOption));
      setPharmacyMedicines(data.length > 0 ? data : DEFAULT_MEDICINES);
    }, (error) => {
      console.error("Pharmacy snapshot error:", error);
    });

    return () => { unsubRecords(); unsubPharmacy(); };
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setActionLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError('Acesso negado. Verifique os dados.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  // --- REFINAMENTO handleRegisterTreatment COM TRANSACTION ---
  const handleRegisterTreatment = async () => {
    if (!currentUser || !farmConfig) return;
    
    // 1. Validação de campos
    if (!animalNumber.trim()) return alert('Informe o número do brinco.');
    if (!corral) return alert('Selecione o curral/lote.');
    if (!selectedDisease) return alert('Informe a enfermidade.');
    
    const validMeds = medications.filter(m => m.medicine && parseFloat(m.dosage) > 0);
    if (validMeds.length === 0) return alert('Adicione pelo menos um medicamento com dosagem.');

    setActionLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const medEntries: MedicationEntry[] = [];
        
        // 2. Verificar estoque e preparar débitos para cada medicamento
        for (const m of validMeds) {
          const medObj = pharmacyMedicines.find(p => p.label === m.medicine);
          if (!medObj) throw new Error(`Medicamento ${m.medicine} não encontrado.`);
          
          const medRef = doc(db, "pharmacy", medObj.value);
          const medSnap = await transaction.get(medRef);
          
          if (!medSnap.exists()) throw new Error(`Dados de estoque para ${m.medicine} indisponíveis.`);
          
          const currentStock = medSnap.data().stockML;
          const dose = parseFloat(m.dosage);
          
          if (currentStock < dose) {
            throw new Error(`Estoque insuficiente de ${m.medicine}. Disponível: ${currentStock}mL`);
          }

          // Atualiza estoque atômico
          transaction.update(medRef, { stockML: currentStock - dose });
          
          medEntries.push({ 
            medicine: m.medicine, 
            dosage: dose, 
            cost: dose * (medObj.pricePerML || 0) 
          });
        }

        // 3. Salvar o registro final
        const recordRef = doc(collection(db, "records"));
        transaction.set(recordRef, {
          animalNumber,
          date,
          corral,
          diseases: [selectedDisease],
          medications: medEntries,
          timestamp: Date.now(),
          registeredBy: currentUser.name,
          type: 'treatment' as RecordType,
          unitId: currentUser.unitId
        });
      });

      alert('Registro salvo e estoque atualizado!');
      setAnimalNumber('');
      setMedications(Array(6).fill({ medicine: '', dosage: '' }));
      setSelectedDisease('');
    } catch (err: any) {
      console.error(err);
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
      <span className="font-black uppercase tracking-widest text-xs">Sincronizando Dados...</span>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-[#0a1a14]">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-block p-5 bg-emerald-50 rounded-[2rem] mb-4"><Building2 className="w-12 h-12 text-emerald-600" /></div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Boi Medicado</h1>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Acesso Restrito</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="E-mail Corporativo" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-slate-900 outline-none focus:ring-2 ring-emerald-500 transition-all" />
            <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Senha" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-slate-900 outline-none focus:ring-2 ring-emerald-500 transition-all" />
            {loginError && <p className="text-center text-red-500 font-bold text-[10px] uppercase bg-red-50 py-2 rounded-xl">{loginError}</p>}
            <button disabled={actionLoading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-6 flex items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg"><Building2 className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase leading-none truncate max-w-[150px] md:max-w-none">{farmConfig?.farmName}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Olá, <span className="text-emerald-600 font-black">{currentUser.name.split(' ')[0]}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="hidden md:flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Painel</button>
              <button onClick={() => setActiveTab('register')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'register' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Manejo</button>
           </div>
           <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
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
                      <select value={med.medicine} onChange={e => { const up = [...medications]; up[idx].medicine = e.target.value; setMedications(up); }} className="flex-grow px-3 py-3 bg-slate-50 rounded-xl text-[10px] font-bold border-none outline-none"><option value="">Remédio</option>{pharmacyMedicines.map(m => <option key={m.value} value={m.label}>{m.label}</option>)}</select>
                      <input type="number" placeholder="mL" value={med.dosage} onChange={e => { const up = [...medications]; up[idx].dosage = e.target.value; setMedications(up); }} className="w-16 px-3 py-3 bg-slate-50 rounded-xl text-[10px] font-bold text-center border-none outline-none" />
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
               <button onClick={() => setShowMovementModal({show: true, type: 'death'})} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-lg"><Skull className="w-5 h-5" /> Registrar Morte</button>
               <button onClick={() => setShowMovementModal({show: true, type: 'return_to_pasture'})} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-amber-700 transition-all shadow-lg"><Undo2 className="w-5 h-5" /> Retorno ao Pasto</button>
            </div>
            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 flex items-center gap-4 text-emerald-600">
               <div className="p-3 bg-emerald-50 rounded-2xl"><Calendar className="w-6 h-6" /></div>
               <div>
                  <span className="font-black uppercase tracking-tighter text-sm block">Modo Offline Ativo</span>
                  <span className="text-[8px] font-bold uppercase text-slate-400">Dados salvos localmente até detectar sinal</span>
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
