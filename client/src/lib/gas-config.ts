// ==========================================
// GAS URL Configuration
// ==========================================
// GAS URL sendiri (kelompok kita) — diambil dari env variable
export const GAS_OWN_URL = process.env.NEXT_PUBLIC_GAS_BASE_URL2 ?? "";

// GAS URL kelompok lain — ganti URL ini untuk swap test
// Contoh: "https://script.google.com/macros/s/AKfycbx.../exec"
export const GAS_EXTERNAL_URL = "";
