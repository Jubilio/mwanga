// Node 24 native fetch

async function run() {
  const url = 'http://localhost:11434/api/chat';
  const payload = {
    model: 'gemma4:latest',
    messages: [
      { role: 'system', content: 'Você é um assistente financeiro de Moçambique.' },
      { role: 'user', content: 'Você está aí?' }
    ],
    options: { temperature: 0.7 },
    stream: false
  };

  console.log('Sending request to Ollama:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Ollama Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Ollama Request Failed:', err);
  }
}

run();
