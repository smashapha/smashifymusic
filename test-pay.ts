async function run() {
  const res = await fetch('https://api.paychangu.com/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
