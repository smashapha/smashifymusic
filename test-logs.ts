// read applet logs using a node script
import fs from "fs";
const logs = fs.readFileSync("/app/applet/applet.log", "utf8");
console.log(logs.slice(-2000));
