import OpenAI from "openai";
import admin from "firebase-admin";

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
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Leer artículos
    const snap = await db.collection("articulos").get();
    let docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));

    if (docs.length === 0) {
      return res.status(400).json({ error: "No hay artículos en Firestore" });
    }

    // Proceso de embeddings
    for (const articulo of docs) {
      const texto = `
TÍTULO: ${articulo.titulo}
CATEGORÍA: ${articulo.categoria}
CONTENIDO: ${articulo.contenido}
      `;

      // Crear embedding
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texto
      });

      const embedding = emb.data[0].embedding;

      // Guardar en Firestore
      await db.collection("articulos").doc(articulo.id).update({
        embedding
      });

      console.log(`Embedding generado: ${articulo.id}`);
    }

    return res.status(200).json({
      status: "ok",
      message: "Embeddings generados correctamente"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}
