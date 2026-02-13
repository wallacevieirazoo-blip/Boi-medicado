
import { DiseaseOption, MedicineOption, CorralOption, Treatment, User } from './types';

export const DISEASES: DiseaseOption[] = [
  { label: 'Pneumonia', value: 'pneumonia' },
  { label: 'Diarreia', value: 'diarreia' },
  { label: 'Manqueira', value: 'manqueira' },
  { label: 'Anaplasmose', value: 'anaplasmose' },
  { label: 'Babesiose', value: 'babesiose' },
  { label: 'Pododermatite', value: 'pododermatite' },
  { label: 'Mastite', value: 'mastite' },
];

export const MEDICINES: MedicineOption[] = [
  // Added stockML and pricePerML to meet MedicineOption type definition
  { label: 'Draxxin', value: 'draxxin', stockML: 1000, pricePerML: 2.50 },
  { label: 'Zuprevo', value: 'zuprevo', stockML: 1000, pricePerML: 1.80 },
  { label: 'Baytril', value: 'baytril', stockML: 1000, pricePerML: 0.90 },
  { label: 'Flunixin', value: 'flunixin', stockML: 1000, pricePerML: 0.40 },
  { label: 'Oxitetraciclina', value: 'oxitetraciclina', stockML: 1000, pricePerML: 0.30 },
  { label: 'Ceftiofur', value: 'ceftiofur', stockML: 1000, pricePerML: 1.20 },
  { label: 'Meloxicam', value: 'meloxicam', stockML: 1000, pricePerML: 0.50 },
];

export const CORRALS: CorralOption[] = [
  { label: 'Curral 01 - Engorda', value: 'c01' },
  { label: 'Curral 02 - Recria', value: 'c02' },
  { label: 'Curral 03 - Maternidade', value: 'c03' },
  { label: 'Curral 04 - Isolamento', value: 'c04' },
  { label: 'Piquete 10', value: 'p10' },
];

export const TREATMENTS: Treatment[] = [
  { 
    id: 't1', 
    diseaseLabel: 'Pneumonia', 
    medicines: ['Draxxin', 'Flunixin'] 
  },
  { 
    id: 't2', 
    diseaseLabel: 'Diarreia', 
    medicines: ['Oxitetraciclina'] 
  }
];

// Predefined users for demonstration with mandatory unitId added to match types.ts
export const AUTHORIZED_USERS: (User & { password: string })[] = [
  { id: '1', name: 'Gerente Administrativo', username: 'gerente', password: '109230', role: 'manager', unitId: 'u01' },
  { id: '2', name: 'Operador 01', username: 'op01', password: '123', role: 'operator', unitId: 'u01' },
  { id: '3', name: 'Operador 02', username: 'op02', password: '123', role: 'operator', unitId: 'u01' },
  { id: '4', name: 'Operador 03', username: 'op03', password: '123', role: 'operator', unitId: 'u01' },
  { id: '5', name: 'Operador 04', username: 'op04', password: '123', role: 'operator', unitId: 'u01' },
  { id: '6', name: 'Operador 05', username: 'op05', password: '123', role: 'operator', unitId: 'u01' },
  { id: '7', name: 'Operador 06', username: 'op06', password: '123', role: 'operator', unitId: 'u01' },
  { id: '8', name: 'Operador 07', username: 'op07', password: '123', role: 'operator', unitId: 'u01' },
  { id: '9', name: 'Operador 08', username: 'op08', password: '123', role: 'operator', unitId: 'u01' },
  { id: '10', name: 'Operador 09', username: 'op09', password: '123', role: 'operator', unitId: 'u01' },
];
