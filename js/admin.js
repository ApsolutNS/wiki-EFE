// js/admin.js
"use strict";

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* =========================================================
   ESTADO GLOBAL
========================================================= */
const colArticulos = collection(db, "articulos");
const colLogs = collection(db, "logs_articulos");
let articulosCache = [];
let editor; // ToastUI
let appInitialized = false;

const SESSION_KEY = "wiki_fe_admin_user";

/* =========================================================
   LOGIN LOCAL (solo panel, NO Firestore)
   --> cambia las credenciales a las que tú quieras
========================================================= */
const ADMIN_USERS = {
  // usuario: { password, nombreVisible }
  anunez: { password: "admin123", nombre: "Alex Nuñez" },
  admin: { password: "admin123", nombre: "Administrador" }
};

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(userObj) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
}

function clearCurrentUser() {
  localStorage.removeItem(SESSION_KEY);
}

function showPanel() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("panel").style.display = "block";
}

function showLogin() {
  document.getElementById("panel").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
}

/* =========================================================
   LOADING
========================================================= */
function setLoading(show, text = "Procesando…") {
  const overlay = document.getElementById("loadingOverlay");
  const label = document.getElementById("loadingText");
  if (!overlay || !label) return;
  label.textContent = text;
  overlay.style.display = show ? "flex" : "none";
}

/* =========================================================
   UTILS
========================================================= */
function toDateSafe(value) {
  if (!value) return new Date();
  if (value.toDate) return value.toDate();
  return new Date(value);
}

/* Registrar logs básicos (opcional pero útil) */
async function registrarLog(payload) {
  try {
    await addDoc(colLogs, {
      ...payload,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("No se pudo registrar log:", e.message);
  }
}

/* =========================================================
   CARGA TABLA
========================================================= */
async function cargarTabla() {
  const tbody = document.getElementById("tablaArticulos");
  try {
    setLoading(true, "Cargando artículos…");
    tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

    const snap = await getDocs(colArticulos);
    articulosCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    articulosCache.sort((a, b) => {
      const fa = a.fecha ? toDateSafe(a.fecha) : 0;
      const fb = b.fecha ? toDateSafe(b.fecha) : 0;
      return fb - fa;
    });

    renderTabla(articulosCache);
  } catch (err) {
    console.error(err);
    alert("Error cargando artículos: " + err.message);
  } finally {
    setLoading(false);
  }
}

function actualizarDashboard(lista) {
  document.getElementById("contadorArticulos").textContent =
    `${lista.length} artículos`;

  document.getElementById("contadorVisibles").textContent =
    `${lista.filter(a => a.visibleAgentes).length} visibles`;

  document.getElementById("contadorDestacados").textContent =
    `${lista.filter(a => a.destacado).length} destacados`;

  const cats = {};
  lista.forEach(a => {
    const c = a.categoria || "Sin categoría";
    cats[c] = (cats[c] || 0) + 1;
  });

  const cont = document.getElementById("metricsCategorias");
  cont.innerHTML = Object.keys(cats).length
    ? Object.entries(cats)
        .map(([cat, cant]) => `<span class="cat-pill">${cat}: ${cant}</span>`)
        .join("")
    : "";
}

function renderTabla(lista) {
  const tbody = document.getElementById("tablaArticulos");
  actualizarDashboard(lista);

  if (!lista.length) {
    tbody.innerHTML = "<tr><td colspan='6'>Sin artículos registrados.</td></tr>";
    return;
  }

  tbody.innerHTML = lista.map(a => {
    const fechaStr = a.fecha
      ? toDateSafe(a.fecha).toLocaleDateString("es-PE")
      : "-";
    return `
      <tr>
        <td>${a.titulo || ""}</td>
        <td>${a.categoria || ""}</td>
        <td>${a.visibleAgentes ? "Sí" : "No"}</td>
        <td>${a.destacado ? "⭐" : "—"}</td>
        <td>${fechaStr}</td>
        <td>
          <div class="actions">
            <button class="btn-xs btn-ver" data-id="${a.id}">Ver</button>
            <button class="btn-xs primary btn-editar" data-id="${a.id}">Editar</button>
            <button class="btn-xs danger btn-eliminar" data-id="${a.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".btn-ver").forEach(btn =>
    btn.addEventListener("click", () => verArticulo(btn.dataset.id))
  );
  tbody.querySelectorAll(".btn-editar").forEach(btn =>
    btn.addEventListener("click", () => editarArticulo(btn.dataset.id))
  );
  tbody.querySelectorAll(".btn-eliminar").forEach(btn =>
    btn.addEventListener("click", () => eliminarArticulo(btn.dataset.id))
  );
}

/* =========================================================
   VER / EDITAR / ELIMINAR
========================================================= */
function verArticulo(id) {
  const art = articulosCache.find(a => a.id === id);
  if (!art) return alert("Artículo no encontrado");

  document.getElementById("modalTitle").textContent = art.titulo || "";
  const fechaTxt = art.fecha
    ? toDateSafe(art.fecha).toLocaleString("es-PE")
    : "-";

  document.getElementById("modalMeta").textContent =
    `${art.categoria || "Sin categoría"} • ${fechaTxt}`;

  document.getElementById("modalContent").innerHTML = art.contenido || "";
  const modal = document.getElementById("modal");
  modal.style.display = "flex";

  document.getElementById("btnCopiar").onclick = async () => {
    const temp = document.createElement("div");
    temp.innerHTML = art.contenido || "";
    await navigator.clipboard.writeText(temp.innerText);
    alert("Contenido copiado.");
  };
}

async function editarArticulo(id) {
  try {
    setLoading(true, "Cargando artículo…");
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("Artículo no disponible");
      return;
    }
    const art = snap.data();

    document.getElementById("articuloId").value = id;
    document.getElementById("titulo").value = art.titulo || "";
    document.getElementById("categoria").value = art.categoria || "";
    document.getElementById("resumen").value = art.resumen || "";
    document.getElementById("visibleAgentes").value =
      art.visibleAgentes ? "true" : "false";
    document.getElementById("destacado").value =
      art.destacado ? "true" : "false";

    editor.setHTML(art.contenido || "");
    document.getElementById("formTitle").textContent = "Editar artículo";

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  } catch (e) {
    console.error(e);
    alert("Error al cargar el artículo: " + e.message);
  } finally {
    setLoading(false);
  }
}

async function eliminarArticulo(id) {
  if (!confirm("¿Eliminar este artículo?")) return;

  try {
    setLoading(true, "Eliminando artículo…");
    const ref = doc(db, "articulos", id);
    const snap = await getDoc(ref);
    const anterior = snap.exists() ? snap.data() : null;

    await deleteDoc(ref);

    await registrarLog({
      articuloId: id,
      accion: "delete",
      antes: anterior,
      despues: null,
      usuarioEmail: getCurrentUser()?.username || null
    });

    alert("Artículo eliminado correctamente.");
    await cargarTabla();
  } catch (e) {
    console.error(e);
    alert("Error al eliminar: " + e.message);
  } finally {
    setLoading(false);
  }
}

/* =========================================================
   BUSCADOR
========================================================= */
function initBuscadorTabla() {
  const input = document.getElementById("searchTabla");
  input.addEventListener("input", (evt) => {
    const q = (evt.target.value || "").toLowerCase().trim();
    if (!q) {
      renderTabla(articulosCache);
      return;
    }
    const filtrados = articulosCache.filter(a =>
      (a.titulo || "").toLowerCase().includes(q) ||
      (a.resumen || "").toLowerCase().includes(q) ||
      (a.categoria || "").toLowerCase().includes(q)
    );
    renderTabla(filtrados);
  });
}

/* =========================================================
   FORMULARIO / GUARDAR
========================================================= */
function limpiarFormulario() {
  document.getElementById("articuloId").value = "";
  document.getElementById("titulo").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("resumen").value = "";
  document.getElementById("visibleAgentes").value = "true";
  document.getElementById("destacado").value = "false";
  editor.setHTML("");
  document.getElementById("formTitle").textContent = "Nuevo artículo";
}

async function guardarArticuloHandler() {
  const id = document.getElementById("articuloId").value.trim();
  const articulo = {
    titulo: document.getElementById("titulo").value.trim(),
    categoria: document.getElementById("categoria").value.trim(),
    resumen: document.getElementById("resumen").value.trim(),
    contenido: editor.getHTML(),
    visibleAgentes: document.getElementById("visibleAgentes").value === "true",
    destacado: document.getElementById("destacado").value === "true"
  };

  if (!articulo.titulo || !articulo.categoria || !articulo.resumen) {
    alert("Completa título, categoría y resumen.");
    return;
  }

  const usuarioEmail = getCurrentUser()?.username || null;

  try {
    setLoading(true, id ? "Actualizando artículo…" : "Creando artículo…");

    if (id) {
      const ref = doc(db, "articulos", id);
      const snap = await getDoc(ref);
      const anterior = snap.exists() ? snap.data() : null;

      await setDoc(ref, {
        ...articulo,
        version: (anterior?.version || 0) + 1,
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
      }, { merge: true });

      await registrarLog({
        articuloId: id,
        accion: "update",
        antes: anterior,
        despues: articulo,
        usuarioEmail
      });

      alert("Artículo actualizado correctamente.");
    } else {
      const ref = await addDoc(colArticulos, {
        ...articulo,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
      });

      await registrarLog({
        articuloId: ref.id,
        accion: "create",
        antes: null,
        despues: articulo,
        usuarioEmail
      });

      alert("Artículo creado correctamente.");
    }

    limpiarFormulario();
    await cargarTabla();
  } catch (e) {
    console.error(e);
    alert("Error al guardar: " + e.message);
  } finally {
    setLoading(false);
  }
}

/* =========================================================
   MODAL
========================================================= */
function initModal() {
  const modal = document.getElementById("modal");
  document.getElementById("btnCerrarModal").addEventListener("click", () => {
    modal.style.display = "none";
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
}

/* =========================================================
   THEME
========================================================= */
function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  const KEY = "fe_admin_theme";

  function apply(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark");
      btn.textContent = "Modo claro";
    } else {
      document.body.classList.remove("dark");
      btn.textContent = "Modo oscuro";
    }
  }

  const saved = localStorage.getItem(KEY) || "light";
  apply(saved);

  btn.addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(KEY, next);
    apply(next);
  });
}

/* =========================================================
   LOGIN UI
========================================================= */
function initLoginUI() {
  const userInput = document.getElementById("loginUser");
  const passInput = document.getElementById("loginPass");
  const btnLogin = document.getElementById("loginBtn");
  const err = document.getElementById("loginError");

  async function handleLogin() {
    const user = (userInput.value || "").trim();
    const pass = (passInput.value || "").trim();
    err.style.display = "none";

    if (!user || !pass) {
      err.textContent = "Complete usuario y contraseña.";
      err.style.display = "block";
      return;
    }

    const cfg = ADMIN_USERS[user];
    if (!cfg || cfg.password !== pass) {
      err.textContent = "Credenciales incorrectas.";
      err.style.display = "block";
      return;
    }

    setCurrentUser({ username: user, nombre: cfg.nombre });
    applyUserToSidebar();
    showPanel();
    if (!appInitialized) {
      initAppAfterLogin();
    }
  }

  btnLogin.addEventListener("click", handleLogin);

  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
}

function applyUserToSidebar() {
  const u = getCurrentUser();
  const name = u?.nombre || "Administrador";
  document.getElementById("sidebarName").textContent = name;
  const avatar = document.getElementById("sidebarAvatar");
  avatar.textContent = name.charAt(0).toUpperCase();
}

/* =========================================================
   LOGOUT
========================================================= */
function initLogout() {
  const btn = document.getElementById("btnLogout");
  btn.addEventListener("click", () => {
    clearCurrentUser();
    showLogin();
  });
}

/* =========================================================
   INICIALIZACIÓN GENERAL
========================================================= */
function initEditor() {
  const { Editor } = window.toastui;
  editor = new Editor({
    el: document.getElementById("editor"),
    height: "360px",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    usageStatistics: false
  });
}

async function initAppAfterLogin() {
  if (appInitialized) return;
  appInitialized = true;

  initEditor();
  initThemeToggle();
  initModal();
  initBuscadorTabla();
  initLogout();

  document.getElementById("btnGuardar").addEventListener("click", guardarArticuloHandler);
  document.getElementById("btnLimpiar").addEventListener("click", limpiarFormulario);
  document.getElementById("btnNuevo").addEventListener("click", limpiarFormulario);

  await cargarTabla();
}

/* =========================================================
   DOM READY
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initLoginUI();

  const user = getCurrentUser();
  if (user) {
    applyUserToSidebar();
    showPanel();
    initAppAfterLogin();
  } else {
    showLogin();
  }
});
