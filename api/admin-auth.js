/* ============================================================
   🔐 ADMIN-AUTH.JS
   Protección para admin.html — Modo: “Protección 3”
   - Clave secreta
   - IPs permitidas
   - Intentos limitados
   - Persistencia segura
============================================================ */

/* ========== CONFIGURACIÓN ========== */

// Cambia esta clave por una tuya (mínimo 10–16 caracteres)
export const ADMIN_KEY = "ALEX_FE_SECRET_2024";

// Lista de IPs autorizadas para acceder al panel
export const ALLOWED_IPS = [
    "190.237.104.213",
    "181.188.39.45",
    "200.121.67.20"
];

// Claves internas
const AUTH_FLAG = "fe_admin_auth_ok_v1";
const FAIL_FLAG = "fe_admin_fails_v1";
const MAX_FAILS = 5;

/* ========== FUNCIONES ========== */

// Obtiene IP pública
export async function getIP(){
    try{
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        return data.ip;
    }catch{
        return null;
    }
}

// Muestra pantalla de bloqueo
export function blockPage(msg="Acceso no autorizado"){
    document.body.innerHTML = `
        <div style="
            display:flex;align-items:center;justify-content:center;
            height:100vh;font-family:system-ui;
            color:#ef4444;font-size:20px;text-align:center;
        ">
            ${msg}
        </div>`;
    throw new Error(msg);
}

// Solicita clave
export async function checkAdminAccess(){
    // Si ya está autenticado → continuar
    if(localStorage.getItem(AUTH_FLAG) === "1"){
        return true;
    }

    // Si demasiados intentos → bloquear
    const fails = Number(localStorage.getItem(FAIL_FLAG) || 0);
    if(fails >= MAX_FAILS){
        blockPage("⛔ Demasiados intentos fallidos.");
    }

    /* ---- VALIDACIÓN DE IP ---- */
    const ip = await getIP();

    if(!ip){
        blockPage("No se pudo verificar la IP. Acceso bloqueado.");
    }

    if(!ALLOWED_IPS.includes(ip)){
        blockPage(`⛔ Tu IP (${ip}) no está autorizada.`);
    }

    /* ---- VALIDACIÓN DE CONTRASEÑA ---- */
    const key = prompt("Ingrese la clave de administrador:");

    if(key !== ADMIN_KEY){
        const newFails = fails + 1;
        localStorage.setItem(FAIL_FLAG, newFails);

        if(newFails >= MAX_FAILS){
            blockPage("⛔ Demasiados intentos incorrectos. Acceso bloqueado.");
        }

        blockPage("Clave incorrecta.");
    }

    /* ---- ACCESO CORRECTO ---- */
    localStorage.setItem(AUTH_FLAG, "1");
    localStorage.removeItem(FAIL_FLAG);
    return true;
}
