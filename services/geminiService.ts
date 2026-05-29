
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `Actúas como 'SAMI', un asistente experto de IA para la plataforma SAMI. Te especializas en contabilidad peruana, microcréditos para MYPES (Micro y Pequeñas Empresas) y educación empresarial. Tu tono debe ser profesional, servicial y alentador. Responde a las preguntas en el contexto de ayudar a un dueño de una pequeña empresa en Perú. Utiliza un lenguaje claro y evita la jerga compleja a menos que la expliques. Formatea tus respuestas con markdown cuando sea apropiado para una mejor legibilidad (listas, negritas, etc.).`;

const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set.");
  }
  return apiKey;
};

export const sendMessageToGemini = async (message: string, existingChat: Chat | null) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const chat = existingChat || ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  const result: GenerateContentResponse = await chat.sendMessage({ message });
  const responseText = result.text;

  if (!responseText) {
    throw new Error("No response text received from Gemini.");
  }

  return { chat, response: responseText };
};
