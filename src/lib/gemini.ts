// src/lib/gemini.ts
// Utility to call Gemini API for inventory prediction

export async function fetchGeminiInventoryPrediction({
  apiKey,
  menuWithSales,
  dateRange
}: {
  apiKey: string;
  menuWithSales: any[];
  dateRange: string;
}) {
  const prompt = `You are an inventory prediction assistant. Given the following menu sales data from the past week:
${JSON.stringify(menuWithSales, null, 2)}

Predict the inventory ingredients needed for the ${dateRange.replace('-', ' ')}.

Return ONLY a valid JSON array with this exact format (no markdown, no extra text):
[
  {"name": "ingredient_name", "quantity": number, "unit": "unit_type", "price": number}
]

Base your predictions on the sales patterns shown in the data.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        { parts: [ { text: prompt } ] }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log("Gemini API response:", data);
  
  // Gemini returns the text in data.candidates[0].content.parts[0].text
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  if (!text) {
    console.error("No text in Gemini response");
    return [];
  }
  
  console.log("Gemini response text:", text);
  
  // Try to extract JSON from the response (remove markdown code blocks if present)
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  
  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", e, jsonText);
    return [];
  }
}
