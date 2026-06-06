fetch("http://localhost:3000/api/pay/create-payment", {
  method: 'OPTIONS',
  headers: { 'Access-Control-Request-Method': 'POST', 'Origin': 'http://localhost:3000' }
}).then(async r => {
  console.log("Status:", r.status);
}).catch(console.error);
