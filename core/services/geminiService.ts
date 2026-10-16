export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export type ChatHistory = ChatHistoryItem[];

/**
 * Servicio cliente para comunicación con el asistente SAMI.
 * La clave GEMINI_API_KEY vive exclusivamente en el backend por seguridad.
 */
export const sendMessageToGemini = async (
  message: string,
  existingChat?: ChatHistory | null
): Promise<{ chat: ChatHistory; response: string }> => {
  const currentHistory: ChatHistory = Array.isArray(existingChat) ? [...existingChat] : [];

  const response = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      history: currentHistory
    })
  });

  if (!response.ok) {
    let errorMessage = 'Lo sentimos, ocurrió un error al procesar tu consulta con el asistente.';
    try {
      const errorData = await response.json();
      if (errorData?.error && typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      }
    } catch {
      // Use generic fallback
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const responseText = data.text || data.response || 'No se recibió respuesta del asistente.';

  const updatedChat: ChatHistory = [
    ...currentHistory,
    { role: 'user', text: message },
    { role: 'model', text: responseText }
  ];

  return {
    chat: updatedChat,
    response: responseText
  };
};
