import OpenAI from "openai";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const q = req.query.q || "";

  if (!q) return res.status(400).json({ error: "Falta q" });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Embedding de la consulta
  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q
  });
  const qEmb = embRes.data[0].embedding;

  // Obtener artículos
  const snap = await db.collection("articulos").get();

  let docs = [];
  snap.forEach(d => {
    docs.push({
      id: d.id,
      ...d.data()
    });
  });

  // Similitud coseno
  function cosine(a, b) {
    let dot=0, na=0, nb=0;
    for (let i=0;i<a.length;i++){
      dot+=a[i]*b[i];
      na+=a[i]*a[i];
      nb+=b[i]*b[i];
    }
    return dot / (Math.sqrt(na)*Math.sqrt(nb));
  }

  // Calcular similitud con cada artículo
  docs = docs
    .filter(d => d.embedding) // solo los que tengan embeddings
    .map(d => ({
      ...d,
      score: cosine(qEmb, d.embedding)
    }))
    .sort((a,b)=> b.score - a.score)
    .slice(0, 5);

  return res.status(200).json({ resultados: docs });
}
