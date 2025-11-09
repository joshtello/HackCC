// src/lib/openai.ts
// Utility to call OpenAI ChatGPT API for inventory prediction

export async function fetchInventoryPrediction({
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert inventory forecaster for a cafe. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log("OpenAI API response:", data);
  
  // OpenAI returns the text in data.choices[0].message.content
  const text = data.choices?.[0]?.message?.content || "";
  
  if (!text) {
    console.error("No text in OpenAI response");
    return [];
  }
  
  console.log("OpenAI response text:", text);
  
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
    console.error("Failed to parse OpenAI response as JSON:", e, jsonText);
    return [];
  }
}
