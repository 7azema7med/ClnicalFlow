export const extractPatientData = async (rawText: string) => {
  try {
    const response = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText })
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error("Failed to extract patient data", e);
    return null;
  }
};

export const chatWithAI = async (message: string, history: any[] = []) => {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });
    
    if (!response.ok) return "I'm sorry, I'm having trouble connecting to the AI service.";
    const data = await response.json();
    return data.text;
  } catch (e) {
    console.error("Failed to chat with AI", e);
    return "I'm sorry, I'm having trouble connecting right now.";
  }
};
