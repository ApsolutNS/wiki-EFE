// /api/search-ia.js
import OpenAI from "openai";
import admin from "firebase-admin";

// Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    // 1. Validar query
    const q = req.query.q || "";
    if (!q) {
      return res.status(400).json({ error: "Falta parámetro q" });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 2. Obtener embedding de la consulta
    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: q
    });

    const qEmb = embRes.data[0].embedding;

    // 3. Leer documentos desde Firestore
    const snap = await db.collection("articulos").get();
    let docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));

    // Solo documentos con embedding guardado
    docs = docs.filter(d => d.embedding);

    if (docs.length === 0) {
      return res.status(200).json({
        resultados: [],
        mensaje: "No hay artículos con embeddings generados."
      });
    }

    // 4. Similitud coseno
    function cosine(a, b) {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    // 5. Calcular similitud y ordenar
    const resultados = docs
      .map(d => ({
        ...d,
        score: cosine(qEmb, d.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // TOP 5

    // 6. Responder
    return res.status(200).json({ resultados });

  } catch (err) {
    console.error("ERROR SEARCH IA:", err);
    return res.status(500).json({
      error: "Error en el servidor",
      detalle: err.message
    });
  }
}
