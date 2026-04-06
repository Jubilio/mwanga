const fs = require('fs');
require('dotenv').config();

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct:free';
  const logFile = 'test_results.log';

  function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
  }

  fs.writeFileSync(logFile, `--- STANDALONE OPENROUTER TEST: ${new Date().toISOString()} ---\n`);
  log(`Model: ${model}`);
  log(`API Key: ${apiKey ? 'Present' : 'Missing'}`);

  if (!apiKey) {
    log('Error: OPENROUTER_API_KEY is missing.');
    return;
  }

  const payload = {
    model: model,
    messages: [
      { role: 'user', content: 'Say "Mwanga is alive" in Portuguese.' }
    ]
  };

  try {
    log('Sending request to OpenRouter...');
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
      log(`HTTP Error ${res.status}: ${text}`);
      return;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    log('SUCCESS!');
    log(`Response Content: ${content}`);
  } catch (err) {
    log(`Fetch Error: ${err.message}`);
  }
}

testOpenRouter();
