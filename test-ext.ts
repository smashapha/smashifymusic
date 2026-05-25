async function run() {
  const res = await fetch("https://ais-dev-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app/api/functions/v1/create-payment", { method: "POST" });
  console.log(res.status, await res.text());
}
run();
