const themeBtn = document.getElementById("themeToggle");

function aplicarTema() {
    const dark = localStorage.getItem("fe_admin_dark") === "1";
    document.body.classList.toggle("dark", dark);
    themeBtn.textContent = dark ? "Modo claro" : "Modo oscuro";
}

themeBtn.addEventListener("click", () => {
    const nuevo = !(localStorage.getItem("fe_admin_dark") === "1");
    localStorage.setItem("fe_admin_dark", nuevo ? "1" : "0");
    aplicarTema();
});

aplicarTema();
