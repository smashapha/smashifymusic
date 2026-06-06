fetch("https://ais-dev-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app/api/pay/create-payment", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 100, type: 'artist_standard', email: 'test@example.com' })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Response:", await r.text());
}).catch(console.error);
