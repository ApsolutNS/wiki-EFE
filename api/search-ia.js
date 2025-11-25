import OpenAI from "openai";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const q = req.query.q || "";

  if (!q) {
    return res.status(400).json({ error: "Falta parámetro q" });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Obtener embedding de la consulta
  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q
  });

  const qEmb = embRes.data[0].embedding;

  // Obtener los documentos
  const snap = await db.collection("articulos").get();
  let docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));

  // Filtrar solo artículos con embeddings
  docs = docs.filter(d => d.embedding);

  // Similitud coseno
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  // Calcular similitud
  docs = docs.map(d => ({
    ...d,
    score: cosine(qEmb, d.embedding)
  }))
  .sort((a,b) => b.score - a.score)
  .slice(0, 5);

  return res.status(200).json({ resultados: docs });
}
