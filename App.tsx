
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CattleRecord, MedicationEntry, MedicineOption, DiseaseOption, 
  CorralOption, Treatment, User, FarmConfig, FarmUnit, UserRole, RecordType
} from './types';
import { 
  DISEASES as DEFAULT_DISEASES, MEDICINES as DEFAULT_MEDICINES, 
  CORRALS as DEFAULT_CORRALS, AUTHORIZED_USERS as DEFAULT_USERS 
} from './constants';
import { getTreatmentInsight } from './geminiService';
import { 
  ClipboardCheck, RefreshCcw, X, Plus, 
  Activity, LogOut, UserCircle, Users, 
  Skull, CheckCircle2, Building2, ShieldCheck, KeyRound, 
  Utensils, Undo2, Package, BarChart3, Settings, Globe, Eye, EyeOff, Calendar, Edit2, Save, ArrowDownToLine
} from 'lucide-react';

// COMPONENTE MOVIDO PARA FORA PARA EVITAR PERDA DE FOCO
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
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- SUPER ADMIN STATE ---
  const [globalUnits, setGlobalUnits] = useState<FarmUnit[]>([]);
  const [globalUsers, setGlobalUsers] = useState<(User & { password: string })[]>([]);
  const [showUnitCreator, setShowUnitCreator] = useState(false);
  const [selectedUnitForUsers, setSelectedUnitForUsers] = useState<FarmUnit | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'operator' as UserRole });

  // --- UNIT STATE ---
  const [farmConfig, setFarmConfig] = useState<FarmConfig | null>(null);
  const [records, setRecords] = useState<CattleRecord[]>([]);
  const [pharmacyMedicines, setPharmacyMedicines] = useState<MedicineOption[]>([]);
  const [managedDiseases, setManagedDiseases] = useState<DiseaseOption[]>([]);
  const [managedCorrals, setManagedCorrals] = useState<CorralOption[]>([]);

  // --- UI ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'units'>('register');
  const [showPharmacyManager, setShowPharmacyManager] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<{show: boolean, type: RecordType | null}>({show: false, type: null});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // --- FORM ---
  const [animalNumber, setAnimalNumber] = useState('');
  const [movementQty, setMovementQty] = useState<number>(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [corral, setCorral] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState(['', '']);
  const [medications, setMedications] = useState<{medicine: string, dosage: string}[]>(Array(6).fill({ medicine: '', dosage: '' }));

  // --- PHARMACY ---
  const [newMedName, setNewMedName] = useState('');
  const [newMedStock, setNewMedStock] = useState<number>(0);
  const [newMedPrice, setNewMedPrice] = useState<number>(0);

  // --- PERSISTENCE ---
  const loadGlobal = (key: string, def: any) => {
    const data = localStorage.getItem(`bm_global_${key}`);
    return data ? JSON.parse(data) : def;
  };
  const persistGlobal = (key: string, data: any) => {
    localStorage.setItem(`bm_global_${key}`, JSON.stringify(data));
  };

  const loadUnitData = (unitId: string, farmName: string = 'Confinamento') => {
    const load = (key: string, def: any) => {
      const data = localStorage.getItem(`bm_unit_${unitId}_${key}`);
      return data ? JSON.parse(data) : def;
    };
    setRecords(load('records', []));
    setPharmacyMedicines(load('pharmacy', DEFAULT_MEDICINES));
    setManagedDiseases(load('diseases', DEFAULT_DISEASES));
    setManagedCorrals(load('corrals', DEFAULT_CORRALS));
    setFarmConfig({ farmName, unitId, initialStock: 0 });
  };

  const persistUnitData = (key: string, data: any) => {
    if (!currentUser?.unitId || currentUser.role === 'super_admin') return;
    localStorage.setItem(`bm_unit_${currentUser.unitId}_${key}`, JSON.stringify(data));
  };

  useEffect(() => {
    const units = loadGlobal('units', []);
    const users = loadGlobal('users', DEFAULT_USERS);
    setGlobalUnits(units);
    setGlobalUsers(users);

    const session = localStorage.getItem('bm_session');
    if (session) {
      const user = JSON.parse(session);
      const unit = units.find((u: FarmUnit) => u.id === user.unitId);
      if (user.role !== 'super_admin' && (!unit || !unit.active || Date.now() > unit.expiresAt)) {
        handleLogout();
        return;
      }
      setCurrentUser(user);
      if (user.role === 'super_admin') setActiveTab('units');
      else loadUnitData(user.unitId, unit?.name);
    }
  }, []);

  const handleAnimalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 7);
    if (rawValue.length === 7) setAnimalNumber(`${rawValue.slice(0, 6)}-${rawValue.slice(6)}`);
    else setAnimalNumber(rawValue);
  };

  const generateMemorableId = (farmName: string) => {
    const initials = farmName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${initials}-${hash}`;
  };

  const getDaysRemaining = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const username = loginUsername.trim().toLowerCase();
    const password = loginPassword.trim();
    if (username === 'admin' && password === 'super123') {
      const adminUser: User = { id: 'admin', name: 'Super Admin', username: 'admin', role: 'super_admin', unitId: 'global' };
      setCurrentUser(adminUser);
      localStorage.setItem('bm_session', JSON.stringify(adminUser));
      setActiveTab('units');
      return;
    }
    const user = globalUsers.find((u) => u.username.toLowerCase() === username && u.password === password);
    if (user) {
      const unit = globalUnits.find(u => u.id === user.unitId);
      if (!unit || !unit.active || Date.now() > unit.expiresAt) {
        setLoginError('Acesso Bloqueado: Verifique sua licença.');
        return;
      }
      const { password: _, ...sessionUser } = user;
      setCurrentUser(sessionUser);
      localStorage.setItem('bm_session', JSON.stringify(sessionUser));
      loadUnitData(user.unitId, unit.name);
      setActiveTab(user.role === 'manager' ? 'dashboard' : 'register');
      setLoginError('');
    } else setLoginError('Usuário ou Senha inválidos.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bm_session');
    setFarmConfig(null);
  };

  const handleCreateUnit = (name: string, days: number) => {
    const unitId = generateMemorableId(name);
    const newUnit: FarmUnit = { id: unitId, name, active: true, createdAt: Date.now(), expiresAt: Date.now() + (days * 24 * 60 * 60 * 1000) };
    const updated = [...globalUnits, newUnit];
    setGlobalUnits(updated);
    persistGlobal('units', updated);
    setShowUnitCreator(false);
    alert(`Unidade Criada: ${unitId}`);
  };

  const handleAddUser = () => {
    if (!selectedUnitForUsers) return;
    const newUserObj = { ...newUser, id: crypto.randomUUID(), unitId: selectedUnitForUsers.id };
    const updated = [...globalUsers, newUserObj];
    setGlobalUsers(updated);
    persistGlobal('users', updated);
    setIsAddingUser(false);
    setNewUser({ name: '', username: '', password: '', role: 'operator' });
    alert('Usuário criado com sucesso!');
  };

  const handleUpdatePassword = (userId: string) => {
    const updated = globalUsers.map(u => u.id === userId ? { ...u, password: tempPassword } : u);
    setGlobalUsers(updated);
    persistGlobal('users', updated);
    setEditingUserId(null);
    setTempPassword('');
    alert('Senha atualizada com sucesso!');
  };

  const handleRegisterTreatment = async () => {
    if (!animalNumber || !corral) return alert('Brinco e Curral são obrigatórios');
    const medEntries: MedicationEntry[] = [];
    const updatedPharmacy = [...pharmacyMedicines];
    for (const m of medications) {
      if (m.medicine && m.dosage) {
        const dose = parseFloat(m.dosage);
        const medObj = updatedPharmacy.find(p => p.label === m.medicine);
        if (medObj) {
          if (medObj.stockML < dose) return alert(`Estoque insuficiente de ${m.medicine}`);
          medObj.stockML -= dose;
          medEntries.push({ medicine: m.medicine, dosage: dose, cost: dose * medObj.pricePerML });
        }
      }
    }
    const newRecord: CattleRecord = { id: crypto.randomUUID(), animalNumber, date, corral: managedCorrals.find(c => c.value === corral)?.label || corral, diseases: selectedDiseases.filter(d => d), medications: medEntries, timestamp: Date.now(), registeredBy: currentUser?.name || 'Sistema', synced: false, type: 'treatment' };
    const upRecords = [newRecord, ...records];
    setRecords(upRecords);
    setPharmacyMedicines(updatedPharmacy);
    persistUnitData('records', upRecords);
    persistUnitData('pharmacy', updatedPharmacy);
    alert(`Registro salvo!`);
    setAnimalNumber('');
    setMedications(Array(6).fill({ medicine: '', dosage: '' }));
  };

  const handleMovement = () => {
    if (!showMovementModal.type) return;
    const newRecord: CattleRecord = { id: crypto.randomUUID(), quantity: (showMovementModal.type === 'death' || showMovementModal.type === 'return_to_pasture') ? 1 : movementQty, animalNumber: (showMovementModal.type === 'death' || showMovementModal.type === 'return_to_pasture') ? animalNumber : undefined, date, corral: managedCorrals.find(c => c.value === corral)?.label || 'Geral', diseases: [], medications: [], timestamp: Date.now(), registeredBy: currentUser?.name || 'Sistema', synced: false, type: showMovementModal.type };
    const up = [newRecord, ...records];
    setRecords(up);
    persistUnitData('records', up);
    setShowMovementModal({show: false, type: null});
    setAnimalNumber('');
  };

  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dashboardData = useMemo(() => {
    const data: any[] = months.map(m => ({ month: m, medicated: 0, entry: 0, slaughter: 0, returnToPasture: 0, death: 0, stock: 0, morbidity: 0 }));
    let currentStock = farmConfig?.initialStock || 0;
    months.forEach((m, idx) => {
      const monthRecords = records.filter(r => new Date(r.date + 'T00:00:00').getMonth() === idx);
      const med = monthRecords.filter(r => r.type === 'treatment').length;
      const ent = monthRecords.filter(r => r.type === 'entry').reduce((acc, r) => acc + (r.quantity || 0), 0);
      const sla = monthRecords.filter(r => r.type === 'slaughter').reduce((acc, r) => acc + (r.quantity || 0), 0);
      const ret = monthRecords.filter(r => r.type === 'return_to_pasture').reduce((acc, r) => acc + (r.quantity || (r.animalNumber ? 1 : 0)), 0);
      const dea = monthRecords.filter(r => r.type === 'death').reduce((acc, r) => acc + (r.quantity || 1), 0);
      currentStock = currentStock + ent - sla - dea - ret;
      data[idx] = { month: m, medicated: med, entry: ent, slaughter: sla, returnToPasture: ret, death: dea, stock: currentStock, morbidity: currentStock > 0 ? (med/currentStock)*100 : 0 };
    });
    return data;
  }, [records, farmConfig]);

  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-[#0a1a14]">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-block p-5 bg-emerald-50 rounded-[2rem] mb-4"><Building2 className="w-12 h-12 text-emerald-600" /></div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Boi Medicado</h1>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Suporte & Gestão Bovina</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Usuário" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-slate-900 outline-none" />
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Senha" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-slate-900 outline-none" />
            {loginError && <p className="text-center text-red-500 font-bold text-[10px] uppercase bg-red-50 py-2 rounded-xl border border-red-100">{loginError}</p>}
            <button className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <header className="max-w-7xl mx-auto flex justify-between items-center mb-12 bg-white p-8 rounded-[3rem] shadow-xl">
           <div className="flex items-center gap-4">
              <Globe className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">Painel de Suporte</h1>
           </div>
           <button onClick={handleLogout} className="p-4 bg-red-50 text-red-500 rounded-full hover:bg-red-100"><LogOut /></button>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <button onClick={() => setShowUnitCreator(true)} className="aspect-video bg-white border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center hover:border-blue-500 hover:text-blue-500 transition-all text-slate-300">
              <Plus className="w-12 h-12 mb-4" />
              <span className="font-black uppercase tracking-widest text-[10px]">Nova Licença</span>
           </button>

           {globalUnits.map(unit => {
             const daysLeft = getDaysRemaining(unit.expiresAt);
             return (
               <div key={unit.id} className="bg-white p-8 rounded-[3rem] shadow-lg border border-slate-100 flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Building2 /></div>
                      <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${daysLeft > 15 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {daysLeft === 0 ? 'ATIVA' : 'ATIVA'}
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase mb-2 truncate">{unit.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 bg-slate-50 p-2 rounded-xl border">
                       ID: {unit.id}
                    </div>
                  </div>
                  <div className="mt-8 flex gap-2">
                     <button onClick={() => setSelectedUnitForUsers(unit)} className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest">GERENCIAR USUÁRIOS</button>
                     <button className="p-4 bg-slate-100 text-slate-500 rounded-2xl"><Settings className="w-5 h-5" /></button>
                  </div>
               </div>
             );
           })}
        </main>

        {showUnitCreator && (
          <ModalShell title="Licenciar Fazenda" icon={Building2} onClose={() => setShowUnitCreator(false)}>
             <div className="space-y-6">
                <input id="unitNameInput" type="text" placeholder="Nome da Fazenda" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" />
                <select id="unitDaysInput" className="w-full p-6 bg-slate-50 rounded-3xl font-bold border-none outline-none">
                     <option value="30">30 Dias</option>
                     <option value="180">180 Dias</option>
                     <option value="365">365 Dias</option>
                </select>
                <button onClick={() => {
                  const input = document.getElementById('unitNameInput') as HTMLInputElement;
                  const days = document.getElementById('unitDaysInput') as HTMLSelectElement;
                  if(input.value) handleCreateUnit(input.value, parseInt(days.value));
                }} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl">Gerar ID e Ativar</button>
             </div>
          </ModalShell>
        )}

        {selectedUnitForUsers && (
          <ModalShell title={`Suporte: ${selectedUnitForUsers.name}`} icon={Users} onClose={() => setSelectedUnitForUsers(null)}>
             <div className="space-y-4">
                <button onClick={() => setIsAddingUser(!isAddingUser)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-blue-500 hover:text-blue-500">
                  {isAddingUser ? 'Cancelar' : '+ Novo Usuário para esta Unidade'}
                </button>

                {isAddingUser && (
                  <div className="p-6 bg-blue-50 rounded-[2rem] space-y-4 border border-blue-100">
                    <input type="text" placeholder="Nome Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-4 bg-white rounded-xl text-xs font-bold" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-4 bg-white rounded-xl text-xs font-bold" />
                      <input type="text" placeholder="Senha Inicial" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full p-4 bg-white rounded-xl text-xs font-bold" />
                    </div>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full p-4 bg-white rounded-xl text-xs font-bold">
                       <option value="operator">Operador</option>
                       <option value="manager">Gerente</option>
                    </select>
                    <button onClick={handleAddUser} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px]">Salvar Novo Acesso</button>
                  </div>
                )}

                {globalUsers.filter(u => u.unitId === selectedUnitForUsers.id).map(user => (
                  <div key={user.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col gap-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className={`p-3 rounded-2xl ${user.role === 'manager' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}><UserCircle className="w-5 h-5" /></div>
                           <div>
                              <h4 className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{user.name}</h4>
                              <span className="text-[7px] font-black uppercase bg-white px-2 py-0.5 rounded-full border">{user.role}</span>
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 border-t pt-4 border-slate-200/50">
                        <div>
                           <label className="text-[7px] font-black uppercase text-slate-400 block mb-1">Login</label>
                           <div className="p-3 bg-white rounded-xl text-xs font-mono font-bold text-slate-700 border">{user.username}</div>
                        </div>
                        <div>
                           <label className="text-[7px] font-black uppercase text-slate-400 block mb-1">Senha de Suporte</label>
                           {editingUserId === user.id ? (
                             <div className="flex gap-2">
                               <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} className="flex-grow p-3 bg-white rounded-xl text-xs font-mono font-bold border border-blue-500 outline-none" />
                               <button onClick={() => handleUpdatePassword(user.id)} className="p-3 bg-blue-600 text-white rounded-xl"><Save className="w-4 h-4" /></button>
                             </div>
                           ) : (
                             <div className="p-3 bg-white rounded-xl text-xs font-mono font-bold text-slate-900 border flex justify-between items-center">
                                {showPasswords[user.id] ? user.password : '••••••••'}
                                <div className="flex gap-2">
                                  <button onClick={() => { setEditingUserId(user.id); setTempPassword(user.password); }} className="text-slate-300 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => setShowPasswords(p => ({...p, [user.id]: !p[user.id]}))} className="text-slate-300 hover:text-slate-600">
                                     {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </ModalShell>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-6 flex items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg"><Building2 className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase leading-none truncate max-w-[200px]">{farmConfig?.farmName}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">ID: <span className="text-emerald-600 font-black">{farmConfig?.unitId}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
           {currentUser.role === 'manager' && (
             <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Painel</button>
                <button onClick={() => setActiveTab('register')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'register' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Sanidade</button>
             </div>
           )}
           <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-9 bg-white rounded-[3rem] shadow-2xl p-8 border border-slate-100 overflow-x-auto">
             <div className="flex items-center gap-3 mb-8"><BarChart3 className="w-6 h-6 text-emerald-600" /><h2 className="text-xl font-black text-slate-800 uppercase leading-none">Visão da Unidade</h2></div>
             <table className="w-full min-w-[800px] text-left border-collapse">
               <thead className="bg-[#4472c4] text-white">
                 <tr>
                   <th className="p-3 text-[10px] uppercase border border-slate-200 text-center">Mês</th>
                   <th className="p-3 text-[10px] uppercase border border-slate-200 text-center">Medicações</th>
                   <th className="p-3 text-[10px] uppercase border border-slate-200 text-center">Entradas</th>
                   <th className="p-3 text-[10px] uppercase border border-slate-200 text-center">Abates</th>
                   <th className="p-3 text-[10px] uppercase border border-slate-200 text-center">Mortes</th>
                   <th className="p-3 text-[10px] uppercase border border-slate-200 text-center">Estoque</th>
                 </tr>
               </thead>
               <tbody>
                 {dashboardData.map((d, i) => (
                   <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                     <td className="p-3 text-[11px] font-bold text-slate-700 border border-slate-200 capitalize">{d.month}</td>
                     <td className="p-3 text-[11px] font-black text-center border border-slate-200">{d.medicated}</td>
                     <td className="p-3 text-[11px] font-black text-center border border-slate-200 text-emerald-600">+{d.entry}</td>
                     <td className="p-3 text-[11px] font-black text-center border border-slate-200">-{d.slaughter}</td>
                     <td className="p-3 text-[11px] font-black text-center border border-slate-200 text-red-500">-{d.death}</td>
                     <td className="p-3 text-[11px] font-black text-center border border-slate-200 text-emerald-700">{d.stock}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           <div className="lg:col-span-3 space-y-6">
              <div className="bg-slate-900 text-white rounded-[3rem] p-8 shadow-2xl">
                 <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">Insumos</h3>
                 <div className="space-y-4">
                    {pharmacyMedicines.slice(0, 4).map(m => (
                      <div key={m.value} className="flex justify-between items-center border-b border-white/10 pb-2">
                         <span className="text-[10px] font-bold uppercase">{m.label}</span>
                         <span className={`text-[11px] font-black ${m.stockML < 100 ? 'text-red-400' : 'text-emerald-400'}`}>{m.stockML} mL</span>
                      </div>
                    ))}
                    <button onClick={() => setShowPharmacyManager(true)} className="w-full py-3 bg-white/10 rounded-xl text-[9px] font-black uppercase">Farmácia</button>
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 <button onClick={() => setShowMovementModal({show: true, type: 'entry'})} className="flex items-center gap-4 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 font-black uppercase text-[10px] text-slate-800"><ArrowDownToLine className="text-blue-500" /> Entrada</button>
                 <button onClick={() => setShowMovementModal({show: true, type: 'slaughter'})} className="flex items-center gap-4 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 font-black uppercase text-[10px] text-slate-800"><Utensils className="text-red-500" /> Abate</button>
              </div>
           </div>
        </main>
      ) : (
        <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 bg-white rounded-[3rem] shadow-2xl p-8 border border-slate-100">
            <div className="flex items-center gap-3 mb-10 border-b pb-6"><ClipboardCheck className="w-6 h-6 text-emerald-600" /><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Sanidade do Animal</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase">Brinco</label><input type="text" value={animalNumber} onChange={handleAnimalNumberChange} placeholder="000000-0" className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none text-2xl font-black text-emerald-700 outline-none" /></div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Curral</label>
                  <select value={corral} onChange={e => setCorral(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-600"><option value="">Selecionar...</option>{managedCorrals.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Doença</label>
                  <select value={selectedDiseases[0]} onChange={e => setSelectedDiseases([e.target.value, selectedDiseases[1]])} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700"><option value="">Selecione...</option>{managedDiseases.map(d => <option key={d.value} value={d.label}>{d.label}</option>)}</select>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase">Medicamentos</label>
                <div className="space-y-2">
                  {medications.map((med, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select value={med.medicine} onChange={e => { const up = [...medications]; up[idx].medicine = e.target.value; setMedications(up); }} className="flex-grow px-3 py-3 bg-slate-50 rounded-xl text-[10px] font-bold border-none outline-none"><option value="">Item</option>{pharmacyMedicines.map(m => <option key={m.value} value={m.label}>{m.label}</option>)}</select>
                      <input type="text" placeholder="mL" value={med.dosage} onChange={e => { const up = [...medications]; up[idx].dosage = e.target.value; setMedications(up); }} className="w-16 px-3 py-3 bg-slate-50 rounded-xl text-[10px] font-bold text-center border-none outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t flex gap-4">
              <button onClick={handleRegisterTreatment} className="flex-grow py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl hover:bg-emerald-700 transition-all">Salvar Ficha Animal</button>
            </div>
          </section>
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white rounded-[3rem] p-8 shadow-2xl space-y-4">
               <h3 className="text-xs font-black opacity-40 uppercase tracking-widest mb-2">Mortalidade / Saída</h3>
               <button onClick={() => setShowMovementModal({show: true, type: 'death'})} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-red-700 transition-all"><Skull className="w-5 h-5" /> Registrar Morte</button>
               <button onClick={() => setShowMovementModal({show: true, type: 'return_to_pasture'})} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-amber-700 transition-all"><Undo2 className="w-5 h-5" /> Retorno ao Pasto</button>
            </div>
            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
               <div className="flex items-center gap-4 text-emerald-600">
                  <div className="p-3 bg-emerald-50 rounded-2xl"><Calendar className="w-6 h-6" /></div>
                  <div>
                    <span className="font-black uppercase tracking-tighter text-sm block leading-none">{getDaysRemaining(globalUnits.find(u => u.id === currentUser.unitId)?.expiresAt || 0)} Dias</span>
                    <span className="text-[8px] font-black uppercase text-slate-400">Licença Válida</span>
                  </div>
               </div>
            </div>
          </aside>
        </main>
      )}

      {showMovementModal.show && (
        <ModalShell title={`Movimento: ${showMovementModal.type}`} icon={Activity} onClose={() => setShowMovementModal({show: false, type: null})}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase block">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border outline-none" /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase block">Animal / Qtd</label><input type="text" value={animalNumber} onChange={handleAnimalNumberChange} placeholder="000000-0" className="w-full p-4 bg-slate-50 rounded-2xl font-black border outline-none" /></div>
            </div>
            <button onClick={handleMovement} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl">Confirmar Registro</button>
          </div>
        </ModalShell>
      )}

      {showPharmacyManager && (
        <ModalShell title="Estoque de Remédios" icon={Package} onClose={() => setShowPharmacyManager(false)}>
           <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-[2.5rem] space-y-4 border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="text" value={newMedName} onChange={e => setNewMedName(e.target.value)} placeholder="Nome" className="p-4 bg-white rounded-xl text-xs font-bold border outline-none" />
                  <input type="number" value={newMedStock} onChange={e => setNewMedStock(Number(e.target.value))} placeholder="Qtd mL" className="p-4 bg-white rounded-xl text-xs font-bold border outline-none" />
                  <input type="number" value={newMedPrice} onChange={e => setNewMedPrice(Number(e.target.value))} placeholder="R$/mL" className="p-4 bg-white rounded-xl text-xs font-bold border outline-none" />
                </div>
                <button onClick={() => {
                  const newMed: MedicineOption = { label: newMedName, value: newMedName.toLowerCase().replace(/\s/g, '_'), stockML: newMedStock, pricePerML: newMedPrice };
                  const up = [...pharmacyMedicines, newMed];
                  setPharmacyMedicines(up);
                  persistUnitData('pharmacy', up);
                  setNewMedName(''); setNewMedStock(0); setNewMedPrice(0);
                }} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Cadastrar Medicamento</button>
              </div>
              <div className="space-y-2">
                {pharmacyMedicines.map(m => (
                  <div key={m.value} className="flex justify-between items-center p-5 bg-white border rounded-3xl">
                    <div><p className="text-sm font-black uppercase text-slate-800 leading-none mb-1">{m.label}</p><p className="text-[9px] font-bold text-slate-400">R$ {m.pricePerML.toFixed(2)}/mL</p></div>
                    <div className="text-right"><p className="text-lg font-black text-emerald-600 leading-none">{m.stockML} mL</p></div>
                  </div>
                ))}
              </div>
           </div>
        </ModalShell>
      )}

      <footer className="mt-12 py-10 text-slate-300 text-[9px] font-black uppercase tracking-[0.4em] text-center border-t border-slate-200 w-full max-w-7xl">
        Boi Medicado Pro • Suporte Especializado • 2025
      </footer>
    </div>
  );
};

export default App;
