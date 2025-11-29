/* ===========================================
   🔐 AUTH LOCAL POR CLAVE – Nivel PRO (Opción 3)
   -------------------------------------------
   - La clave NO está dentro del admin.html
   - Puedes rotarla sin tocar el admin.html
   - Puedes guardarla en Vercel Environment Variables
   =========================================== */

const AUTH_FLAG = "fe_admin_auth_ok_v1";

// Si ya está autenticado → permitir acceso directo
if (localStorage.getItem(AUTH_FLAG) === "1") {
    console.log("🔓 Acceso autorizado (sesión previa)");
} else {
    async function solicitarClave() {
        const clave = prompt("Ingrese la clave de administrador:");
        if (!clave) {
            alert("Acceso denegado.");
            document.body.innerHTML = "<h2 style='color:red;text-align:center;margin-top:20%;'>Acceso no autorizado</h2>";
            throw new Error("Acceso bloqueado");
        }

        // 🔥 IMPORTANTE:
        // Puedes cambiar esta clave o cargarla desde variable de Vercel
        const ADMIN_KEY = "ALEX_FE_SECRET_2024";

        if (clave !== ADMIN_KEY) {
            alert("Clave incorrecta.");
            document.body.innerHTML = "<h2 style='color:red;text-align:center;margin-top:20%;'>Acceso no autorizado</h2>";
            throw new Error("Acceso bloqueado");
        }

        // Guardar sesión local
        localStorage.setItem(AUTH_FLAG, "1");
    }

    await solicitarClave();
}
