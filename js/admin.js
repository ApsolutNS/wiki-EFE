// js/admin.js
"use strict";

import { db } from "./firebase-config.js";
import { normalizar, toDateSafe, debounce } from "./utils.js";
import { intentarLogin, getCurrentUser, logoutAdmin } from "./admin-auth.js";

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

/* ========== ToastUI Editor instancia global ========== */
let editor; // se inicializa en DOMContentLoaded

/* ========== Colecciones ========== */
const colArticulos = collection(db, "articulos");
const colLogs = collection(db, "admin_logs");

/* ========== Estado ========== */
let articulosCache = [];

/* ========== Helpers UI ========== */
function setLoading(show, text = "Procesando…") {
  const overlay = document.getElementById("loadingOverlay");
  const label = document.getElementById("loadingText");
  if (!overlay || !label) return;
  label.textContent = text;
  overlay.style.display = show ? "flex" : "none";
}

function mostrarPanelAdmin(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("panel").style.display = "block";

  // Datos en sidebar
  const nameEl = document.getElementById("sidebarUserName");
  const roleEl = document.getElementById("sidebarUserRole");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl) nameEl.textContent = user.username;
  if (roleEl) roleEl.textContent = user.role || "Admin";
  if (avatarEl) avatarEl.textContent = (user.username || "A").charAt(0).toUpperCase();
}

/* ====== Logs ====== */
async function registrarLogEntrada({ articuloId, accion, antes, despues, usuarioEmail }) {
  try {
    await addDoc(colLogs, {
      articuloId: articuloId || null,
      accion,
      antes: antes || null,
      despues: despues || null,
      usuarioEmail: usuarioEmail || null,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("No se pudo registrar log:", e.message);
  }
}

/* ====== Cargar tabla ====== */
async function cargarTabla() {
  const tbody = document.getElementById("tablaArticulos");
  try {
    setLoading(true, "Cargando artículos…");
    tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

    const snap = await getDocs(colArticulos);
    articulosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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

  document.getElementById("metricsCategorias").innerHTML =
    Object.keys(cats)
      .map(c => `<span class="cat-pill">${c}: ${cats[c]}</span>`)
      .join("");
}

function renderTabla(lista) {
  const tbody = document.getElementById("tablaArticulos");
  actualizarDashboard(lista);

  if (!lista.length) {
    tbody.innerHTML = "<tr><td colspan='6'>Sin artículos registrados.</td></tr>";
    return;
  }

  tbody.innerHTML = lista.map(a => `
    <tr>
      <td>${a.titulo || ""}</td>
      <td>${a.categoria || ""}</td>
      <td>${a.visibleAgentes ? "Sí" : "No"}</td>
      <td>${a.destacado ? "⭐" : "—"}</td>
      <td>${a.fecha ? toDateSafe(a.fecha).toLocaleDateString("es-PE") : "-"}</td>
      <td>
        <div class="actions">
          <button class="btn-xs btn-ver" data-id="${a.id}">Ver</button>
          <button class="btn-xs primary btn-editar" data-id="${a.id}">Editar</button>
          <button class="btn-xs danger btn-eliminar" data-id="${a.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");

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

/* ====== Ver / Editar / Eliminar ====== */
function verArticulo(id) {
  const art = articulosCache.find(a => a.id === id);
  if (!art) return alert("Artículo no encontrado");

  const fechaTxt = art.fecha
    ? toDateSafe(art.fecha).toLocaleString("es-PE")
    : "-";

  document.getElementById("modalTitle").textContent = art.titulo || "";
  document.getElementById("modalMeta").textContent =
    `${art.categoria || "Sin categoría"} • ${fechaTxt}`;

  // se muestra HTML tal cual lo guardaste (contenido del editor)
  document.getElementById("modalContent").innerHTML = art.contenido || "";

  const modal = document.getElementById("modal");
  modal.style.display = "block";

  document.getElementById("btnCopiar").onclick = async () => {
    const temp = document.createElement("div");
    temp.innerHTML = art.contenido || "";
    await navigator.clipboard.writeText(temp.innerText || "");
    alert("Contenido copiado.");
  };
}

async function editarArticulo(id) {
  const ref = doc(db, "articulos", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Artículo no disponible");

  const art = snap.data();

  document.getElementById("articuloId").value = id;
  document.getElementById("titulo").value = art.titulo || "";
  document.getElementById("categoria").value = art.categoria || "";
  document.getElementById("resumen").value = art.resumen || "";
  document.getElementById("visibleAgentes").value = art.visibleAgentes ? "true" : "false";
  document.getElementById("destacado").value = art.destacado ? "true" : "false";

  // Cargar contenido en ToastUI
  const html = art.contenido || "";
  editor.setHTML(html);

  document.getElementById("formTitle").textContent = "Editar artículo";
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

async function eliminarArticulo(id) {
  if (!confirm("¿Eliminar este artículo?")) return;

  const ref = doc(db, "articulos", id);
  const snap = await getDoc(ref);
  const anterior = snap.exists() ? snap.data() : null;

  await deleteDoc(ref);

  const user = getCurrentUser();
  await registrarLogEntrada({
    articuloId: id,
    accion: "delete",
    antes: anterior,
    despues: null,
    usuarioEmail: user?.username
  });

  alert("Eliminado correctamente");
  cargarTabla();
}

/* ====== Buscador ====== */
function initBuscadorTabla() {
  const input = document.getElementById("searchTabla");
  input.addEventListener("input", debounce(() => {
    const q = normalizar(input.value);
    if (!q) return renderTabla(articulosCache);

    const filtrados = articulosCache.filter(a =>
      normalizar(a.titulo).includes(q) ||
      normalizar(a.resumen).includes(q) ||
      normalizar(a.categoria).includes(q)
    );

    renderTabla(filtrados);
  }, 250));
}

/* ====== Form ====== */
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

  const user = getCurrentUser();
  const usuarioEmail = user?.username;

  try {
    setLoading(true, "Guardando artículo…");

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

      await registrarLogEntrada({
        articuloId: id,
        accion: "update",
        antes: anterior,
        despues: articulo,
        usuarioEmail
      });

      alert("Artículo actualizado.");
    } else {
      const ref = await addDoc(colArticulos, {
        ...articulo,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
      });

      await registrarLogEntrada({
        articuloId: ref.id,
        accion: "create",
        antes: null,
        despues: articulo,
        usuarioEmail
      });

      alert("Artículo creado.");
    }

    limpiarFormulario();
    cargarTabla();
  } catch (e) {
    console.error(e);
    alert("Error guardando artículo: " + e.message);
  } finally {
    setLoading(false);
  }
}

/* ====== Modal ====== */
function initModal() {
  const modal = document.getElementById("modal");
  const btnCerrar = document.getElementById("btnCerrarModal");

  btnCerrar.onclick = () => {
    modal.style.display = "none";
  };

  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });
}

/* ====== Theme ====== */
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

  apply(localStorage.getItem(KEY) || "light");

  btn.addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(KEY, next);
    apply(next);
  });
}

/* ====== Login + Logout ====== */
function initLogin() {
  const loginBtn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("loginError");

  loginBtn.addEventListener("click", async () => {
    errorEl.style.display = "none";

    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value.trim();

    if (!user || !pass) {
      errorEl.textContent = "Complete usuario y contraseña.";
      errorEl.style.display = "block";
      return;
    }

    try {
      setLoading(true, "Verificando credenciales…");
      const result = await intentarLogin(user, pass);

      if (!result) {
        errorEl.textContent = "Credenciales incorrectas o usuario deshabilitado.";
        errorEl.style.display = "block";
        return;
      }

      mostrarPanelAdmin(result);

      await registrarLogEntrada({
        articuloId: null,
        accion: "login",
        antes: null,
        despues: { usuario: result.username },
        usuarioEmail: result.username
      });

      // Cargar datos
      await cargarTabla();
    } catch (e) {
      console.error(e);
      errorEl.textContent = "Error en el login: " + e.message;
      errorEl.style.display = "block";
    } finally {
      setLoading(false);
    }
  });

  const sesion = getCurrentUser();
  if (sesion) {
    mostrarPanelAdmin(sesion);
    cargarTabla();
  }
}

function initLogout() {
  const btnLogout = document.getElementById("btnLogout");
  btnLogout.addEventListener("click", () => {
    logoutAdmin();
    location.reload();
  });
}

/* ====== INIT GLOBAL ====== */
document.addEventListener("DOMContentLoaded", () => {
  // ToastUI Editor
  editor = new toastui.Editor({
    el: document.querySelector("#wikiEditor"),
    height: "380px",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    usageStatistics: false,
    hideModeSwitch: true
  });

  initBuscadorTabla();
  initModal();
  initThemeToggle();
  initLogin();
  initLogout();

  document.getElementById("btnGuardar").onclick = guardarArticuloHandler;
  document.getElementById("btnLimpiar").onclick = limpiarFormulario;
  document.getElementById("btnNuevo").onclick = limpiarFormulario;
});
