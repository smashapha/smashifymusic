async function run() {
  const res = await fetch("https://ais-dev-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app/api/functions/v1/create-payment", { method: "OPTIONS" });
  console.log("OPTIONS status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
}
run();
