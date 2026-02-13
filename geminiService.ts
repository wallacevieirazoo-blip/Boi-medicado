
import { GoogleGenAI } from "@google/genai";
import { CattleRecord } from "./types";

// Always use named parameter and direct process.env.API_KEY for initialization
// Guideline: Create a new GoogleGenAI instance right before making an API call
export const getTreatmentInsight = async (record: CattleRecord): Promise<string> => {
  if (!process.env.API_KEY) return "Configuração de API pendente.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analise o seguinte registro de sanidade animal em um confinamento bovino:
    - Doenças Identificadas: ${record.diseases.join(', ')}
    - Medicamentos Prescritos: ${record.medications.map(m => `${m.medicine} (Dose: ${m.dosage})`).join(', ')}
    - Local: ${record.corral}

    Como um veterinário especialista, forneça uma análise rápida (máximo 3 sentenças) sobre a compatibilidade do tratamento com as enfermidades citadas e se há alguma observação crítica.
    Responda em Português do Brasil.
  `;

  try {
    // Guideline: Use 'gemini-3-pro-preview' for complex reasoning tasks like veterinary analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        // Guideline: Set thinkingBudget for complex reasoning tasks
        thinkingConfig: { thinkingBudget: 4000 },
        temperature: 1,
      }
    });

    // Access the .text property directly (do not call as a method)
    return response.text || "Não foi possível gerar análise automática.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao consultar IA veterinária.";
  }
};
