import { intentarLogin, getCurrentUser } from "./admin-auth.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value.trim();

    const error = document.getElementById("loginError");

    const ok = await intentarLogin(user, pass);

    if (!ok) {
        error.style.display = "block";
        return;
    }

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
});

// Si ya está logueado
if (getCurrentUser()) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("panel").style.display = "block";
}
