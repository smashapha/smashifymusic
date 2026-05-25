async function run() {
  const res = await fetch("https://akclwguqzeijscftatqp.supabase.co/functions/v1/create-payment", { method: "OPTIONS" });
  console.log(res.status);
}
run();
