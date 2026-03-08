/* =============== Funções Utilitárias de Arredondamento ================ */
function roundHalfEven(x, n){
  const p = Math.pow(10, n);
  const y = x * p;
  const f = Math.floor(y);
  const diff = y - f;
  if (Math.abs(diff - 0.5) < 1e-12) return ((f % 2 === 0) ? f : f + 1) / p;
  return Math.round(y) / p;
}
function roundN(x, n, halfEven){
  return halfEven ? roundHalfEven(x, n) : Math.round((x + Number.EPSILON) * 10**n) / 10**n;
}
function fmt(x, n, halfEven){
  if (!isFinite(x)) return "—";
  return roundN(x, n, halfEven).toFixed(n);
}
const $ = (id) => document.getElementById(id);

/* ================== VARIÁVEIS DA RODADA ================== */
let rodadaAtual = [];

/* ================== GERENCIAMENTO DA RODADA ================== */
function adicionarARodada(valorATR) {
  rodadaAtual.push(valorATR);
  atualizarInterfaceRodada();
}

function atualizarInterfaceRodada() {
  const section = $("historico");
  const lista = $("lista-analises");
  const mediaDisplay = $("media-atr");
  const countDisplay = $("count-analises");

  if (rodadaAtual.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  
  // Calcula a média
  const soma = rodadaAtual.reduce((acc, val) => acc + val, 0);
  const media = soma / rodadaAtual.length;
  const halfEven = true; // Mantém o padrão bancário para a média

  mediaDisplay.textContent = fmt(media, 2, halfEven);
  countDisplay.textContent = `${rodadaAtual.length} análise${rodadaAtual.length > 1 ? 's' : ''}`;

  // Monta a lista visual (mostrando do último para o primeiro)
  lista.innerHTML = rodadaAtual.map((v, i) => 
    `<div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.05);">
        <span style="color: var(--muted);">Análise ${i + 1}</span>
        <strong>${fmt(v, 2, halfEven)}</strong>
    </div>`
  ).reverse().join('');
}

function limparRodada() {
  if (confirm("Deseja zerar todas as análises desta rodada?")) {
    rodadaAtual = [];
    atualizarInterfaceRodada();
  }
}

function copiarMedia() {
  const mediaText = $("media-atr").textContent;
  if (mediaText && mediaText !== "—") {
    navigator.clipboard.writeText(mediaText).then(() => {
      const btn = document.querySelector("#historico .btn.success");
      const originalText = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(() => btn.textContent = originalText, 2000);
    });
  }
}

/* ================== Função Reset da Interface ================== */
function limpar(){
  ["pbu","brix","ls","temp"].forEach(id => $(id).value = (id==="temp" ? "20" : ""));
  $("outputs").style.display = "none";
  const m = $("msg"); m.textContent=""; m.className="status";
  $("pbu").focus(); // Volta o cursor pro primeiro campo pra acelerar a próxima
}

/* ================== CÁLCULO DE ACORDO COM CONSECANA ================== */
function calc(){
  const halfEven = true;
  // Trata a vírgula caso o usuário digite ao invés de ponto
  const pbu  = parseFloat($("pbu").value.replace(',', '.'));
  const brix = parseFloat($("brix").value.replace(',', '.'));
  const ls   = parseFloat($("ls").value.replace(',', '.'));
  const T    = parseFloat($("temp").value.replace(',', '.'));
  const msg  = $("msg");
  
  msg.textContent = ""; msg.className = "status";

  if ([pbu,brix,ls,T].some(v => isNaN(v))){
    msg.textContent = "Preencha todos os campos.";
    msg.classList.add("warn");
    return;
  }

  const fibra = roundN(0.379 + 0.0919 * pbu, 2, halfEven);
  const lc = ls * (1 + 0.000255 * (T - 20));
  const pol_c = roundN(lc * (0.2605 - 0.0009882 * brix), 2, halfEven);
  const pza = roundN(100 * (pol_c / brix), 2, halfEven);
  const fpza = (pza >= 82.28 && pza <= 84.28) ? 1 : (pza / 83.28);
  const C = 1.0313 - 0.00575 * fibra;
  const pcc = roundN(pol_c * (1 - 0.01 * fibra) * C * fpza, 3, halfEven);
  const ar  = 6.9539 - 0.0688 * pza;
  const arc = ar * (1 - 0.01 * fibra) * C;
  
  // ATR Final
  const atr_calc = (pcc * 9.36814) + (arc * 8.9);
  const atr = roundN(atr_calc, 2, halfEven);

  const warnings = [];
  if (brix < 8 || brix > 27) warnings.push("BRIX fora do limite");
  if (pbu  < 110 || pbu  > 260) warnings.push("PBU fora do limite");
  if (pza  < 65 || pza  > 96) warnings.push("Pureza fora do limite");
  
  if (warnings.length){ 
      msg.textContent = "Atenção: " + warnings.join(" • "); 
      msg.classList.add("warn"); 
  } else { 
      msg.textContent = "Cálculo concluído. Adicionado à rodada."; 
      msg.classList.add("ok"); 
  }

  $("polc").textContent  = fmt(pol_c, 2, halfEven);
  $("pza").textContent   = fmt(pza, 2, halfEven);
  $("pcc").textContent   = fmt(pcc, 3, halfEven);
  $("fibra").textContent = fmt(fibra, 2, halfEven);
  $("atr").textContent   = fmt(atr, 2, halfEven);

  $("outputs").style.display = "block";

  // SALVA NA RODADA
  adicionarARodada(atr);
  
  // Limpa os campos automaticamente para a próxima análise (opcional, comente se não quiser)
  ["pbu","brix","ls"].forEach(id => $(id).value = "");
  $("pbu").focus();
}

/* ================== PULAR PARA O PRÓXIMO CAMPO ================== */
function setupAutoTab() {
  const ordem = ["pbu", "brix", "ls", "temp"];
  const podePular = {
    pbu:  (v) => /^\d{3}\.\d+$/.test(v),      
    brix: (v) => /^\d{2}\.\d{2}$/.test(v),    
    ls:   (v) => /^\d{2}\.\d{2}$/.test(v),
    temp: (_) => false
  };

  ordem.forEach((id, i) => {
    const el = $(id);
    const proxId = ordem[i + 1];
    const proximo = proxId ? $(proxId) : null;

    ["keydown","keyup"].forEach(evt => {
      el.addEventListener(evt, (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (proximo) {
            proximo.focus();
            if (proximo.select) proximo.select();
          } else {
            if (e.key === "Enter") calc();
          }
        }
      });
    });

    if (proximo) {
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
function boot(){
  setupAutoTab();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}