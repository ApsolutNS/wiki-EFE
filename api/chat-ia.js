import OpenAI from "openai";
import admin from "firebase-admin";

// Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    // Solo permitir POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido (solo POST)" });
    }

    // Leer la pregunta enviada por el frontend
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { pregunta } = body || {};

    if (!pregunta || pregunta.trim() === "") {
      return res.status(400).json({ error: "Falta la pregunta" });
    }

    // Inicializar OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Leer todos los artículos desde Firestore
    const snap = await db.collection("articulos").get();
    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));

    // Si no hay datos, responder algo útil
    if (docs.length === 0) {
      return res.status(200).json({
        respuesta:
          "No tengo información cargada aún en la base de conocimientos. Agrega artículos al Firestore para que pueda responder."
      });
    }

    // Construir el CONTEXTO
    const contexto = docs
      .map(d => {
        const titulo = d.titulo || "SIN TÍTULO";
        const categoria = d.categoria || "SIN CATEGORÍA";
        const contenido = d.contenido || "SIN CONTENIDO";

        return `TÍTULO: ${titulo}
CATEGORÍA: ${categoria}
CONTENIDO:
${contenido}`;
      })
      .join("\n\n----------------------------\n\n");

    // Llamada al modelo
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres el Asistente Inteligente de FINANCIERA EFECTIVA.

Debes responder SOLO usando la información que se encuentra en el CONTEXTO.
Si el dato no está en el contexto, responde exactamente:

"No tengo información oficial sobre eso."

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

    const respuesta = completion.choices?.[0]?.message?.content || "Error al generar respuesta";

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error("ERROR EN /api/chat-ia:", error);
    return res.status(500).json({ error: "Error interno", detalle: error.message });
  }
}
