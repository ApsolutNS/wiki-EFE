import OpenAI from "openai";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { pregunta } = JSON.parse(req.body || "{}");

  if (!pregunta) {
    return res.status(400).json({ error: "Falta la pregunta" });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Obtener artículos desde Firestore
  const snap = await db.collection("articulos").get();
  let documentos = [];
  snap.forEach(d => documentos.push({ id: d.id, ...d.data() }));

  // Crear el CONTEXTO
  const contexto = documentos
    .map(d => `TÍTULO: ${d.titulo}\nCATEGORÍA: ${d.categoria}\n${d.contenido}`)
    .join("\n\n-----------------\n\n");

  // Llamar al modelo
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
Eres el Asistente Inteligente de FINANCIERA EFECTIVA.
Responde SOLO usando información del contexto.
Si el dato no está en el contexto, responde: 
"No tengo información oficial sobre eso."
          
CONTEXTOS:
${contexto}
        `
      },
      {
        role: "user",
        content: pregunta
      }
    ]
  });

  return res.status(200).json({
    respuesta: completion.choices[0].message.content
  });
}
