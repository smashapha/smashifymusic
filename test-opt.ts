async function run() {
  const res = await fetch("http://0.0.0.0:3000/api/functions/v1/create-payment", { method: "OPTIONS" });
  console.log("OPTIONS status:", res.status);
  console.log("Allow header:", res.headers.get("Allow"));
}
run();
