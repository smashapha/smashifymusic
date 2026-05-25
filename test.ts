async function run() {
  const res = await fetch("http://0.0.0.0:3000/api/functions/v1/create-payment", { method: "POST" });
  console.log(res.status, await res.text());
}
run();
