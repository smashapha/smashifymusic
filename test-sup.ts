async function run() {
  const res = await fetch("https://akclwguqzeijscftatqp.supabase.co/functions/v1/create-payment", { method: "POST" });
  console.log(res.status, await res.text());
}
run();
