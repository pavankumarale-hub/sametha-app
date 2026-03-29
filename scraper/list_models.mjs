const key = process.argv[2];
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
const json = await res.json();
if (!res.ok) { console.error('Error:', JSON.stringify(json)); process.exit(1); }
for (const m of json.models ?? []) {
  if (m.supportedGenerationMethods?.includes('generateContent')) {
    console.log(m.name);
  }
}
