const STORAGE_KEYS = {
  TEMPLATES: "wa_direct_templates_v1",
  HISTORY: "wa_direct_history_v1",
};

const DEFAULT_TEMPLATES = [
  {
    id: "tpl-1",
    title: "Kurir Paket",
    text: "Halo Kak, kalau paket sudah sampai bisa ditaruh di depan pintu ya. Terima kasih.",
  },
  {
    id: "tpl-2",
    title: "Patokan Alamat",
    text: "Halo, ini patokan alamat saya: rumah pagar hitam di sebelah warung, masuk gang sekitar 50 meter.",
  },
  {
    id: "tpl-3",
    title: "Tanya Ketersediaan",
    text: "Halo Kak, mau tanya apakah barang ini masih ready dan bisa dikirim hari ini?",
  },
];

const countryCodeEl = document.getElementById("countryCode");
const phoneInputEl = document.getElementById("phoneInput");
const pasteBtn = document.getElementById("pasteBtn");
const messageInputEl = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const templateListEl = document.getElementById("templateList");
const newTplTitleEl = document.getElementById("newTplTitle");
const newTplTextEl = document.getElementById("newTplText");
const addTplBtn = document.getElementById("addTplBtn");
const historyListEl = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const toastEl = document.getElementById("toast");

let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function sanitizeNumber(rawPhone, rawCode) {
  const code = (rawCode || "62").replace(/\D/g, "") || "62";
  let num = (rawPhone || "").replace(/\D/g, "");
  if (!num) return "";
  if (num.startsWith("0")) {
    num = code + num.slice(1);
  } else if (num.startsWith("8")) {
    num = code + num;
  }
  return num.length >= 9 ? num : "";
}

function buildWaLink() {
  const cleanNum = sanitizeNumber(phoneInputEl.value, countryCodeEl.value);
  if (!cleanNum) {
    showToast("Nomor tujuan belum valid");
    phoneInputEl.focus();
    return null;
  }
  const text = messageInputEl.value.trim();
  const baseUrl = `https://wa.me/${cleanNum}`;
  return {
    number: cleanNum,
    text,
    url: text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl,
  };
}

function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATES));
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(list) {
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(list));
}

function renderTemplates() {
  const templates = loadTemplates();
  templateListEl.innerHTML = "";
  templates.forEach((tpl) => {
    const chip = document.createElement("div");
    chip.className = "tpl-chip";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "tpl-use";
    useBtn.textContent = tpl.title;
    useBtn.addEventListener("click", () => {
      messageInputEl.value = tpl.text;
      messageInputEl.focus();
      showToast(`Template "${tpl.title}" dipasang`);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "tpl-del";
    delBtn.textContent = "×";
    delBtn.title = "Hapus template";
    delBtn.addEventListener("click", () => {
      const updated = loadTemplates().filter((item) => item.id !== tpl.id);
      saveTemplates(updated.length ? updated : DEFAULT_TEMPLATES);
      renderTemplates();
      showToast("Template dihapus");
    });

    chip.append(useBtn, delBtn);
    templateListEl.appendChild(chip);
  });
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function pushHistory(number, text) {
  const current = loadHistory().filter((item) => item.number !== number);
  current.unshift({ number, preview: text || "(Tanpa pesan awal)" });
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(current.slice(0, 8)));
  renderHistory();
}

function renderHistory() {
  const items = loadHistory();
  historyListEl.innerHTML = "";
  if (!items.length) {
    historyListEl.innerHTML = '<li class="empty-state">Belum ada riwayat nomor</li>';
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const info = document.createElement("div");
    info.className = "history-info";
    info.innerHTML = `<span class="history-num">+${item.number}</span><span class="history-preview">${item.preview}</span>`;

    const reuseBtn = document.createElement("button");
    reuseBtn.type = "button";
    reuseBtn.className = "btn-secondary";
    reuseBtn.textContent = "Pakai";
    reuseBtn.addEventListener("click", () => {
      phoneInputEl.value = item.number;
      if (item.preview !== "(Tanpa pesan awal)") {
        messageInputEl.value = item.preview;
      }
      showToast("Nomor diisi ulang");
    });

    li.append(info, reuseBtn);
    historyListEl.appendChild(li);
  });
}

pasteBtn.addEventListener("click", async () => {
  try {
    const clip = await navigator.clipboard.readText();
    if (!clip.trim()) return showToast("Clipboard kosong");
    phoneInputEl.value = clip.trim();
    showToast("Nomor ditempel");
  } catch {
    showToast("Izin clipboard ditolak browser");
  }
});

sendBtn.addEventListener("click", () => {
  const payload = buildWaLink();
  if (!payload) return;
  pushHistory(payload.number, payload.text);
  window.open(payload.url, "_blank", "noopener,noreferrer");
});

copyLinkBtn.addEventListener("click", async () => {
  const payload = buildWaLink();
  if (!payload) return;
  try {
    await navigator.clipboard.writeText(payload.url);
    pushHistory(payload.number, payload.text);
    showToast("Link WhatsApp disalin");
  } catch {
    showToast("Gagal menyalin link");
  }
});

addTplBtn.addEventListener("click", () => {
  const title = newTplTitleEl.value.trim();
  const text = newTplTextEl.value.trim();
  if (!title || !text) {
    showToast("Isi judul dan pesan template dulu");
    return;
  }
  const updated = loadTemplates();
  updated.push({ id: `tpl-${Date.now()}`, title, text });
  saveTemplates(updated);
  newTplTitleEl.value = "";
  newTplTextEl.value = "";
  renderTemplates();
  showToast("Template baru disimpan");
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  renderHistory();
  showToast("Riwayat dibersihkan");
});

renderTemplates();
renderHistory();
