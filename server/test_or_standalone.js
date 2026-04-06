require('dotenv').config();

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct:free';

  console.log('--- STANDALONE OPENROUTER TEST ---');
  console.log('Model:', model);
  console.log('API Key:', apiKey ? 'Present' : 'Missing');

  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY is missing.');
    return;
  }

  const payload = {
    model: model,
    messages: [
      { role: 'user', content: 'Say hello in one word.' }
    ]
  };

  try {
    console.log('Sending request to OpenRouter...');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mwanga.app',
        'X-Title': 'Mwanga Test'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP Error ${res.status}:`, text);
      return;
    }

    const data = await res.json();
    console.log('SUCCESS!');
    console.log('Response Content:', data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testOpenRouter();
