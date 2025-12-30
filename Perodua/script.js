// ===== YEAR =====
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== HERO SLIDER (AUTO) =====
(function heroAutoSlider(){
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides || slides.length === 0) return;

  let i = 0;
  setInterval(() => {
    slides[i].classList.remove("active");
    i = (i + 1) % slides.length;
    slides[i].classList.add("active");
  }, 3500);
})();

// ===== LOAN CALCULATOR =====
// Simple flat-rate estimate (common quick estimate):
// monthly = (principal + (principal * (rate/100) * years)) / (years*12)
(function loanCalc(){
  const price = document.getElementById("carPrice");
  const deposit = document.getElementById("deposit");
  const interest = document.getElementById("interest");
  const years = document.getElementById("years");
  const btn = document.getElementById("calcBtn");

  const monthlyEl = document.getElementById("monthly");
  const loanAmountEl = document.getElementById("loanAmount");
  const totalInterestEl = document.getElementById("totalInterest");
  const shareBtn = document.getElementById("shareCalc");

  if (!price || !deposit || !interest || !years || !btn) return;

  const fmt = (n) => {
    const num = Number(n);
    if (!isFinite(num)) return "—";
    return "RM " + num.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calc = () => {
    const P = Math.max(0, Number(price.value) - Number(deposit.value)); // principal
    const r = Math.max(0, Number(interest.value)) / 100; // annual rate
    const y = Math.max(1, Number(years.value));
    const totalInterest = P * r * y;
    const totalPay = P + totalInterest;
    const m = totalPay / (y * 12);

    if (monthlyEl) monthlyEl.textContent = fmt(m);
    if (loanAmountEl) loanAmountEl.textContent = fmt(P);
    if (totalInterestEl) totalInterestEl.textContent = fmt(totalInterest);

    // WhatsApp message
    if (shareBtn) {
      const msg =
        `Hi, saya nak semak loan Perodua.%0A` +
        `Harga: ${fmt(Number(price.value))}%0A` +
        `Deposit: ${fmt(Number(deposit.value))}%0A` +
        `Faedah: ${Number(interest.value).toFixed(1)}% setahun%0A` +
        `Tempoh: ${y} tahun%0A` +
        `Anggaran ansuran bulanan: ${fmt(m)}%0A%0A` +
        `Boleh bagi quotation promosi terkini?`;
      shareBtn.href = "https://wa.me/60123456789?text=" + msg;
    }
  };

  btn.addEventListener("click", calc);

  // Auto update bila tukar input
  [price, deposit, interest, years].forEach(el => el.addEventListener("input", calc));

  // run once
  calc();
})();
