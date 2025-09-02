/* ================== UTIL & ROUND ================== */
function roundHalfEven(x, n){
  const p = Math.pow(10, n);
  const y = x * p;
  const f = Math.floor(y);
  const diff = y - f;
  if (Math.abs(diff - 0.5) < 1e-12) return ((f % 2 === 0) ? f : f + 1) / p;
  return Math.round(y) / p;
}
function roundN(x, n, halfEven){
  return halfEven ? roundHalfEven(x, n)
                  : Math.round((x + Number.EPSILON) * 10**n) / 10**n;
}
function fmt(x, n, halfEven){
  if (!isFinite(x)) return "—";
  return roundN(x, n, halfEven).toFixed(n);
}
const $ = (id) => document.getElementById(id);

/* ================== UI BASICS ================== */
function limpar(){
  ["pbu","brix","ls","temp"].forEach(id => $(id).value = (id==="temp" ? "20" : ""));
  $("outputs").style.display = "none";
  const m = $("msg"); m.textContent=""; m.className="status";
}

/* ================== CÁLCULO (MODO PIMS) ================== */
function calc(){
  const halfEven = $("halfEven")?.checked ?? true;
  const pbu  = parseFloat($("pbu").value);
  const brix = parseFloat($("brix").value);
  const ls   = parseFloat($("ls").value);
  const T    = parseFloat($("temp").value);
  const msg  = $("msg");
  msg.textContent = ""; msg.className = "status";

  if ([pbu,brix,ls,T].some(v => isNaN(v))){
    msg.textContent = "Preencha todos os campos.";
    msg.classList.add("warn");
    return;
  }

  // 1) Fibra (fixa 2c)
  const fibra_calc = 0.379 + 0.0919 * pbu;
  const fibra = roundN(fibra_calc, 2, halfEven);

  // 2) LC
  const lc = ls * (1 + 0.000255 * (T - 20));

  // 3) Pol% caldo (fixa 2c)
  const pol_c_calc = lc * (0.2605 - 0.0009882 * brix);
  const pol_c = roundN(pol_c_calc, 2, halfEven);

  // 4) Pureza (fixa 2c) a partir do Pol arredondado
  const pza_calc = 100 * (pol_c / brix);
  const pza = roundN(pza_calc, 2, halfEven);

  // 5) FPza
  const fpza = (pza >= 82.28 && pza <= 84.28) ? 1 : (pza / 83.28);

  // 6) C
  const C = 1.0313 - 0.00575 * fibra;

  // 7) PCC (3c)
  const pcc_calc = pol_c * (1 - 0.01 * fibra) * C * fpza;
  const pcc = roundN(pcc_calc, 3, halfEven);

  // 8) AR e ARC
  const ar  = 6.9539 - 0.0688 * pza;
  const arc = ar * (1 - 0.01 * fibra) * C;

  // 9) ATR (2c) usando PCC exibido
  const atr_calc = (pcc * 9.36814) + (arc * 8.9);
  const atr = roundN(atr_calc, 2, halfEven);

  // Mensagem
  const warnings = [];
  if (brix < 8 || brix > 27) warnings.push("BRIX fora de 8–27");
  if (pbu  < 110 || pbu  > 260) warnings.push("PBU fora de 110–260");
  if (pza  < 65 || pza  > 96) warnings.push("Pureza fora de 65–96");
  if (warnings.length){ msg.textContent = "Atenção: " + warnings.join(" • "); msg.classList.add("warn"); }
  else { msg.textContent = "Cálculo concluído."; msg.classList.add("ok"); }

  // Saídas
  $("polc").textContent  = fmt(pol_c, 2, halfEven);
  $("pza").textContent   = fmt(pza, 2, halfEven);
  $("pcc").textContent   = fmt(pcc, 3, halfEven);
  $("fibra").textContent = fmt(fibra, 2, halfEven);
  $("atr").textContent   = fmt(atr, 2, halfEven);

  $("outputs").style.display = "block";
}

/* ================== PULAR PARA O PRÓXIMO CAMPO ================== */
/* robusto para:
   - script no fim do body (DOMContentLoaded já passou)
   - iOS/Android (Enter às vezes vira 'Go/Next/Done')
   - auto-pulo quando “parece preenchido”
*/
function setupAutoTab() {
  const ordem = ["pbu", "brix", "ls", "temp"];
  const falta = ordem.filter(id => !$(id));
  if (falta.length){
    console.error("IDs não encontrados no HTML:", falta);
    return;
  }
  console.log("AutoTab: inputs OK", ordem);

  // Regras para considerar “preenchido” (ajuste se quiser)
  const podePular = {
    pbu:  (v) => /^\d{3}\.\d$/.test(v),      
    brix: (v) => /^\d{2}\.\d{2}$/.test(v),     
    ls:   (v) => /^\d{2}\.\d{2}$/.test(v),
    temp: (_) => false
  };

  ordem.forEach((id, i) => {
    const el = $(id);
    const proxId = ordem[i + 1];
    const proximo = proxId ? $(proxId) : null;

    // ENTER / TAB -> próximo (ou calcula no último)
    ["keydown","keyup"].forEach(evt => {
      el.addEventListener(evt, (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (proximo) {
            proximo.focus();
            if (proximo.select) proximo.select();
          } else {
            // último campo: ENTER dispara cálculo
            if (e.key === "Enter") calc();
          }
        }
      });
    });

    // AUTO-PULO quando a regra considerar “preenchido”
    if (proximo) {
      // 'input' cobre mobile; 'change' cobre perda de foco
      ["input","change","blur"].forEach(evt => {
        el.addEventListener(evt, () => {
          if (podePular[id](el.value)) {
            proximo.focus();
            if (proximo.select) proximo.select();
          }
        });
      });
    }
  });
}

/* ================== BOOT ================== */
// Se houver erro de JS, mostre no console (ajuda a diagnosticar)
window.addEventListener("error", (e) => {
  console.error("Erro JS:", e.message);
});

function boot(){
  // garante que elementos já existem
  setupAutoTab();
  console.log("boot ok");
}

// funciona independente de onde o script é incluído
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}


