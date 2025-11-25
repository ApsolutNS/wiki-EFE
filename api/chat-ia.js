import OpenAI from "openai";

import admin from "firebase-admin";

// Para evitar inicializar Firebase más de una vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { pregunta } = JSON.parse(req.body || "{}");

  if (!pregunta) {
    return res.status(400).json({ error: "Falta pregunta" });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Obtener artículos
  const snap = await db.collection("articulos").get();
  let documentos = [];

  snap.forEach(d => documentos.push({ id: d.id, ...d.data() }));

  // Crear contexto
  let contexto = documentos
    .map(d => `TÍTULO: ${d.titulo}\nCATEGORÍA: ${d.categoria}\n${d.contenido}`)
    .join("\n\n----------\n\n");

  // Llamar IA
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
Eres un asistente experto de FINANCIERA EFECTIVA.
Usa EXCLUSIVAMENTE esta información del contexto.
Si falta información, responde: "No tengo información oficial sobre ese punto."
            
CONTEXTO:
${contexto}
        `
      },
      {
        role: "user",
        content: pregunta
      }
    ]
  });

  const respuesta = completion.choices[0].message.content;

  return res.status(200).json({ respuesta });
}
