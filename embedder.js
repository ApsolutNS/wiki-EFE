// embedder.js
// Script para generar embeddings de los artículos y guardarlos en Firestore

import "dotenv/config.js";           // Asegúrate de tener el paquete "dotenv"
import OpenAI from "openai";
import admin from "firebase-admin";

// ============================
//   INICIALIZAR FIREBASE ADMIN
// ============================
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log("✅ Firebase Admin inicializado.");
  } catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error);
    process.exit(1);
  }
}

const db = admin.firestore();

// ============================
//   INICIALIZAR OPENAI
// ============================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generarEmbeddings() {
  try {
    console.log("🔍 Leyendo artículos desde Firestore...");

    const snap = await db.collection("articulos").get();
    if (snap.empty) {
      console.log("⚠ No hay documentos en la colección 'articulos'.");
      return;
    }

    const docsSinEmbedding = [];
    snap.forEach(doc => {
      const data = doc.data();
      // Consideramos que falta embedding si no existe o es vacío
      if (!data.embedding || !Array.isArray(data.embedding) || data.embedding.length === 0) {
        docsSinEmbedding.push({
          id: doc.id,
          ...data
        });
      }
    });

    if (docsSinEmbedding.length === 0) {
      console.log("✅ Todos los artículos ya tienen embedding.");
      return;
    }

    console.log(`📝 Documentos sin embedding: ${docsSinEmbedding.length}`);

    // Opcional: procesar en batches si tienes muchos documentos
    const batchSize = 10;
    let procesados = 0;

    for (let i = 0; i < docsSinEmbedding.length; i += batchSize) {
      const batchDocs = docsSinEmbedding.slice(i, i + batchSize);

      // Texto para cada documento
      const inputs = batchDocs.map(d => {
        const titulo = d.titulo || "SIN TÍTULO";
        const categoria = d.categoria || "SIN CATEGORÍA";
        const contenido = d.contenido || "";

        return `TÍTULO: ${titulo}\nCATEGORÍA: ${categoria}\n${contenido}`;
      });

      console.log(`➡ Generando embeddings para documentos ${i + 1} a ${i + batchDocs.length}...`);

      // Llamada a OpenAI en batch
      const embRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: inputs
      });

      // Guardar cada embedding en Firestore
      const writes = [];
      batchDocs.forEach((docData, idx) => {
        const emb = embRes.data[idx].embedding;
        const ref = db.collection("articulos").doc(docData.id);
        writes.push(ref.update({ embedding: emb }));
      });

      await Promise.all(writes);
      procesados += batchDocs.length;
      console.log(`✅ Embeddings guardados para ${procesados} documentos.`);
    }

    console.log("🎉 Proceso completado. Total documentos actualizados:", procesados);
  } catch (error) {
    console.error("❌ Error generando embeddings:", error);
  } finally {
    // Cerrar proceso
    process.exit(0);
  }
}

// Ejecutar
generarEmbeddings();
