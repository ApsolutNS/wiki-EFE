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

  // Obtener artículos sin embeddings
  const snap = await db.collection("articulos").get();

  let documentos = [];
  snap.forEach(doc => documentos.push({ id: doc.id, ...doc.data() }));

  // Construcción del contexto
  const contexto = documentos
    .map(d => 
`TÍTULO: ${d.titulo}
CATEGORÍA: ${d.categoria}
RESUMEN: ${d.resumen}
CONTENIDO:
${d.contenido}`)
    .join("\n\n--------------------------\n\n");

  // Llamada al modelo
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
Eres el asistente oficial de FINANCIERA EFECTIVA.

Responde SOLO usando el siguiente contexto.
Si la respuesta NO está 100% en el contexto, responde exactamente:
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
