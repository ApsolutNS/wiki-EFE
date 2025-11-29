export default function handler(req, res) {
  const allowed = process.env.ADMIN_ALLOWED_IPS?.split(",").map(ip => ip.trim());
  const ip = 
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress;

  console.log("IP detectada:", ip);
  console.log("IP autorizadas:", allowed);

  if (!allowed || !allowed.includes(ip)) {
    return res.status(403).json({ error: "Acceso denegado (IP no autorizada)" });
  }

  return res.status(200).json({ ok: true });
}
