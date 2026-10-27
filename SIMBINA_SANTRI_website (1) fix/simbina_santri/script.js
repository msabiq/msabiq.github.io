/* SIMBINA SANTRI - JavaScript untuk tugas sekolah
   Data disimpan di Local Storage browser. Jangan gunakan data sensitif nyata
   untuk versi demonstrasi ini.
*/
const STORAGE_KEY = "simbinaSantriDataV1";

const todayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const formatDate = value => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? escapeHTML(value) :
    date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
const initials = name => (name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.santri) && Array.isArray(parsed.violations) && Array.isArray(parsed.guidance)) return parsed;
    }
  } catch (error) {
    console.warn("Data lokal tidak dapat dibaca:", error);
  }
  // Contoh data fiktif agar dashboard terlihat saat pertama dibuka.
  return {
    santri: [
      { id: "S001", name: "Ahmad Fikri", className: "Kelas 2", room: "Al-Falah" },
      { id: "S002", name: "Muhammad Rizki", className: "Kelas 3", room: "Al-Ikhlas" },
      { id: "S003", name: "Abdul Rahman", className: "Kelas 1", room: "Al-Hikmah" }
    ],
    violations: [
      { id: "V001", santriId: "S002", type: "Keterlambatan kegiatan", date: todayISO(), note: "Contoh catatan simulasi untuk latihan administrasi.", status: "Aktif" },
      { id: "V002", santriId: "S001", type: "Tidak mengikuti kegiatan", date: todayISO(), note: "Contoh catatan simulasi; perlu verifikasi pengurus.", status: "Selesai" }
    ],
    guidance: [
      { id: "B001", santriId: "S002", title: "Pembinaan kedisiplinan waktu", date: todayISO(), followUpDate: "", description: "Diskusi tentang pengaturan waktu dan komitmen mengikuti kegiatan.", status: "Aktif" },
      { id: "B002", santriId: "S001", title: "Refleksi dan pendampingan", date: todayISO(), followUpDate: todayISO(), description: "Contoh pembinaan yang telah selesai. Data ini hanya simulasi.", status: "Selesai" }
    ]
  };
}
let data = loadData();
let activePage = "dashboard";
let modalType = "";
let editingId = null;
let toastTimer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    showToast("Data tidak dapat disimpan. Periksa ruang penyimpanan browser.");
  }
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function santriById(id) {
  return data.santri.find(person => person.id === id);
}
function nameById(id) {
  return santriById(id)?.name || "Data santri tidak ditemukan";
}
function statusBadge(status, guidance = false) {
  const done = status === "Selesai";
  const label = done ? "Selesai" : (guidance ? "Berjalan" : "Perlu tindak lanjut");
  return `<span class="status ${done ? "status-done" : "status-active"}">${label}</span>`;
}
function personCell(person) {
  if (!person) return `<span class="person-name">Data santri tidak ditemukan</span>`;
  return `<div class="person-cell"><span class="person-avatar">${escapeHTML(initials(person.name))}</span><span><span class="person-name">${escapeHTML(person.name)}</span><span class="sub-cell">${escapeHTML(person.id)}</span></span></div>`;
}
function setPage(page) {
  if (!$("#page-" + page)) return;
  activePage = page;
  $$(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + page));
  $$(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  const titles = { dashboard: "Dashboard", santri: "Data Santri", pelanggaran: "Data Pelanggaran", pembinaan: "Pembinaan Santri", laporan: "Laporan" };
  $("#topbarHeading").textContent = titles[page];
  $("#breadcrumbCurrent").textContent = titles[page];
  closeSidebar();
  if (page === "laporan") renderReports();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#mobileOverlay").classList.add("show");
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#mobileOverlay").classList.remove("show");
}

function renderDashboard() {
  $("#statSantri").textContent = data.santri.length;
  $("#statPelanggaran").textContent = data.violations.length;
  $("#statAktif").textContent = data.guidance.filter(item => item.status === "Aktif").length;
  $("#statSelesai").textContent = data.guidance.filter(item => item.status === "Selesai").length;
  const recent = [...data.violations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  $("#recentViolations").innerHTML = recent.map(item => `
    <tr>
      <td>${personCell(santriById(item.santriId))}</td>
      <td>${escapeHTML(item.type)}</td>
      <td>${formatDate(item.date)}</td>
      <td>${statusBadge(item.status)}</td>
    </tr>`).join("");
  $("#recentEmpty").classList.toggle("hidden", recent.length > 0);
}

function renderSantri() {
  const query = $("#searchSantri").value.trim().toLowerCase();
  const rows = data.santri.filter(person =>
    `${person.id} ${person.name} ${person.className} ${person.room}`.toLowerCase().includes(query)
  );
  $("#santriCount").textContent = `${rows.length} data`;
  $("#santriTable").innerHTML = rows.map(person => `
    <tr>
      <td><strong>${escapeHTML(person.id)}</strong></td>
      <td>${personCell(person)}</td>
      <td>${escapeHTML(person.className || "—")}</td>
      <td>${escapeHTML(person.room || "—")}</td>
      <td><div class="action-group"><button class="small-action" data-edit="santri" data-id="${escapeHTML(person.id)}">Edit</button><button class="small-action danger" data-delete="santri" data-id="${escapeHTML(person.id)}">Hapus</button></div></td>
    </tr>`).join("");
  $("#santriEmpty").classList.toggle("hidden", rows.length > 0);
}

function renderViolations() {
  const query = $("#searchViolation").value.trim().toLowerCase();
  const status = $("#filterViolationStatus").value;
  const rows = [...data.violations]
    .filter(item => {
      const person = santriById(item.santriId);
      return `${person?.name || ""} ${item.santriId} ${item.type} ${item.note}`.toLowerCase().includes(query)
        && (!status || item.status === status);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  $("#violationTable").innerHTML = rows.map(item => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${personCell(santriById(item.santriId))}</td>
      <td>${escapeHTML(item.type)}</td>
      <td class="wrap-cell">${escapeHTML(item.note || "—")}</td>
      <td>${statusBadge(item.status)}</td>
      <td><div class="action-group"><button class="small-action" data-edit="violation" data-id="${escapeHTML(item.id)}">Edit</button><button class="small-action danger" data-delete="violation" data-id="${escapeHTML(item.id)}">Hapus</button></div></td>
    </tr>`).join("");
  $("#violationEmpty").classList.toggle("hidden", rows.length > 0);
}

function renderGuidance() {
  const query = $("#searchGuidance").value.trim().toLowerCase();
  const status = $("#filterGuidanceStatus").value;
  const rows = [...data.guidance]
    .filter(item => {
      const person = santriById(item.santriId);
      return `${person?.name || ""} ${item.title} ${item.description}`.toLowerCase().includes(query)
        && (!status || item.status === status);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  $("#guidanceList").innerHTML = rows.map(item => `
    <article class="guidance-card">
      <div class="guidance-card-top"><div><h3>${escapeHTML(item.title)}</h3><div class="muted">${escapeHTML(nameById(item.santriId))} · ${formatDate(item.date)}</div></div>${statusBadge(item.status, true)}</div>
      <p>${escapeHTML(item.description || "Tidak ada keterangan.")}</p>
      <div class="guidance-meta"><span>Nomor induk: ${escapeHTML(item.santriId)}</span>${item.followUpDate ? `<span>Tindak lanjut: ${formatDate(item.followUpDate)}</span>` : ""}</div>
      <div class="guidance-actions"><button class="small-action" data-toggle-guidance="${escapeHTML(item.id)}">${item.status === "Selesai" ? "Tandai berjalan" : "Tandai selesai"}</button><button class="small-action" data-edit="guidance" data-id="${escapeHTML(item.id)}">Edit</button><button class="small-action danger" data-delete="guidance" data-id="${escapeHTML(item.id)}">Hapus</button></div>
    </article>`).join("");
  $("#guidanceEmpty").classList.toggle("hidden", rows.length > 0);
}

function renderReports() {
  $("#reportSantri").textContent = data.santri.length;
  $("#reportViolations").textContent = data.violations.length;
  $("#reportActive").textContent = data.guidance.filter(item => item.status === "Aktif").length;
  $("#reportDone").textContent = data.guidance.filter(item => item.status === "Selesai").length;
  const rows = [...data.violations].sort((a, b) => b.date.localeCompare(a.date));
  $("#reportTable").innerHTML = rows.map(item => `
    <tr><td>${formatDate(item.date)}</td><td>${escapeHTML(item.santriId)}</td><td>${escapeHTML(nameById(item.santriId))}</td><td>${escapeHTML(item.type)}</td><td>${statusBadge(item.status)}</td></tr>`).join("");
  $("#reportEmpty").classList.toggle("hidden", rows.length > 0);
}
function renderAll() {
  renderDashboard();
  renderSantri();
  renderViolations();
  renderGuidance();
  renderReports();
}

const formConfigs = {
  santri: {
    title: "Tambah Data Santri",
    fields: [
      { name: "id", label: "Nomor Induk", type: "text", placeholder: "Contoh: S004", required: true, hint: "Gunakan nomor induk unik." },
      { name: "name", label: "Nama Santri", type: "text", placeholder: "Masukkan nama", required: true },
      { name: "className", label: "Kelas", type: "text", placeholder: "Contoh: Kelas 2", required: true },
      { name: "room", label: "Kamar", type: "text", placeholder: "Contoh: Al-Falah", required: true }
    ]
  },
  violation: {
    title: "Catat Pelanggaran",
    fields: [
      { name: "santriId", label: "Santri", type: "santri", required: true, full: true },
      { name: "date", label: "Tanggal Kejadian", type: "date", required: true },
      { name: "type", label: "Jenis Catatan", type: "select", options: ["Keterlambatan kegiatan", "Tidak mengikuti kegiatan", "Pelanggaran tata tertib", "Kebersihan lingkungan", "Lainnya"], required: true },
      { name: "note", label: "Keterangan Faktual", type: "textarea", placeholder: "Tuliskan keterangan secara singkat dan objektif.", required: true, full: true, hint: "Hindari label yang merendahkan. Catat fakta yang relevan." },
      { name: "status", label: "Status tindak lanjut", type: "select", options: ["Aktif", "Selesai"], required: true }
    ]
  },
  guidance: {
    title: "Tambah Pembinaan",
    fields: [
      { name: "santriId", label: "Santri", type: "santri", required: true, full: true },
      { name: "title", label: "Nama Pembinaan", type: "text", placeholder: "Contoh: Pembinaan kedisiplinan waktu", required: true, full: true },
      { name: "date", label: "Tanggal Pembinaan", type: "date", required: true },
      { name: "followUpDate", label: "Tanggal Tindak Lanjut (opsional)", type: "date" },
      { name: "description", label: "Catatan Pembinaan", type: "textarea", placeholder: "Tujuan, langkah pembinaan, dan catatan tindak lanjut.", required: true, full: true },
      { name: "status", label: "Status", type: "select", options: ["Aktif", "Selesai"], required: true }
    ]
  }
};

function createField(field, value = "") {
  const id = `field-${field.name}`;
  const fullClass = field.full ? " full" : "";
  let control = "";
  if (field.type === "textarea") {
    control = `<textarea id="${id}" name="${field.name}" placeholder="${escapeHTML(field.placeholder || "")}" ${field.required ? "required" : ""}>${escapeHTML(value)}</textarea>`;
  } else if (field.type === "select" || field.type === "santri") {
    const options = field.type === "santri"
      ? data.santri.map(person => `<option value="${escapeHTML(person.id)}" ${value === person.id ? "selected" : ""}>${escapeHTML(person.name)} (${escapeHTML(person.id)})</option>`).join("")
      : field.options.map(option => `<option value="${escapeHTML(option)}" ${value === option ? "selected" : ""}>${escapeHTML(option === "Aktif" ? "Perlu tindak lanjut" : option === "Selesai" ? "Selesai" : option)}</option>`).join("");
    control = `<select id="${id}" name="${field.name}" ${field.required ? "required" : ""}><option value="">Pilih ${field.type === "santri" ? "santri" : "opsi"}</option>${options}</select>`;
  } else {
    control = `<input id="${id}" name="${field.name}" type="${field.type}" value="${escapeHTML(value)}" placeholder="${escapeHTML(field.placeholder || "")}" ${field.required ? "required" : ""}>`;
  }
  return `<div class="field${fullClass}"><label for="${id}">${escapeHTML(field.label)}${field.required ? " *" : ""}</label>${control}${field.hint ? `<span class="field-hint">${escapeHTML(field.hint)}</span>` : ""}</div>`;
}

function openForm(type, id = null) {
  if (type !== "santri" && data.santri.length === 0) {
    showToast("Tambahkan data santri terlebih dahulu.");
    setPage("santri");
    return;
  }
  modalType = type;
  editingId = id;
  const config = formConfigs[type];
  const collection = type === "santri" ? data.santri : type === "violation" ? data.violations : data.guidance;
  const current = id ? collection.find(item => item.id === id) : null;
  $("#modalTitle").textContent = current ? `Edit ${type === "santri" ? "Data Santri" : type === "violation" ? "Catatan Pelanggaran" : "Pembinaan"}` : config.title;
  $("#formFields").innerHTML = config.fields.map(field => {
    const value = current ? (current[field.name] ?? "") : (field.name === "date" ? todayISO() : field.name === "status" ? (type === "violation" ? "Aktif" : "Aktif") : "");
    return createField(field, value);
  }).join("");
  if (type === "santri" && current) $("#field-id").readOnly = true;
  $("#modalBackdrop").classList.remove("hidden");
  setTimeout(() => $("#formFields input, #formFields select, #formFields textarea")?.focus(), 50);
}
function closeForm() {
  $("#modalBackdrop").classList.add("hidden");
  $("#dataForm").reset();
  modalType = "";
  editingId = null;
}
function handleFormSubmit(event) {
  event.preventDefault();
  const config = formConfigs[modalType];
  if (!config) return;
  const formData = new FormData(event.currentTarget);
  const values = Object.fromEntries(formData.entries());
  if (modalType === "santri") {
    values.id = values.id.trim();
    values.name = values.name.trim();
    if (!values.id || !values.name) return showToast("Nomor induk dan nama wajib diisi.");
    const duplicate = data.santri.some(person => person.id.toLowerCase() === values.id.toLowerCase() && person.id !== editingId);
    if (duplicate) return showToast("Nomor induk sudah digunakan.");
    if (editingId) {
      data.santri = data.santri.map(person => person.id === editingId ? { ...person, ...values, id: editingId } : person);
    } else {
      data.santri.push(values);
    }
  } else {
    const id = editingId || `${modalType === "violation" ? "V" : "B"}${Date.now().toString().slice(-8)}`;
    if (modalType === "violation") {
      data.violations = editingId
        ? data.violations.map(item => item.id === editingId ? { ...item, ...values, id } : item)
        : [...data.violations, { ...values, id }];
    } else {
      data.guidance = editingId
        ? data.guidance.map(item => item.id === editingId ? { ...item, ...values, id } : item)
        : [...data.guidance, { ...values, id }];
    }
  }
  saveData();
  closeForm();
  renderAll();
  showToast(editingId ? "Data berhasil diperbarui." : "Data berhasil disimpan.");
}

function deleteRecord(type, id) {
  const names = { santri: "data santri", violation: "catatan pelanggaran", guidance: "catatan pembinaan" };
  if (!confirm(`Yakin ingin menghapus ${names[type]} ini? Tindakan ini tidak dapat dibatalkan.`)) return;
  if (type === "santri") {
    const linked = data.violations.some(item => item.santriId === id) || data.guidance.some(item => item.santriId === id);
    if (linked && !confirm("Santri ini memiliki catatan terkait. Menghapusnya dapat membuat catatan tidak lagi terhubung. Tetap hapus?")) return;
    data.santri = data.santri.filter(item => item.id !== id);
  } else if (type === "violation") {
    data.violations = data.violations.filter(item => item.id !== id);
  } else {
    data.guidance = data.guidance.filter(item => item.id !== id);
  }
  saveData();
  renderAll();
  showToast("Data berhasil dihapus.");
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");
  if (nav) setPage(nav.dataset.page);
  const go = event.target.closest("[data-go]");
  if (go) setPage(go.dataset.go);
  const edit = event.target.closest("[data-edit]");
  if (edit) openForm(edit.dataset.edit, edit.dataset.id);
  const del = event.target.closest("[data-delete]");
  if (del) deleteRecord(del.dataset.delete, del.dataset.id);
  const toggle = event.target.closest("[data-toggle-guidance]");
  if (toggle) {
    const id = toggle.dataset.toggleGuidance;
    data.guidance = data.guidance.map(item => item.id === id ? { ...item, status: item.status === "Selesai" ? "Aktif" : "Selesai" } : item);
    saveData();
    renderAll();
    showToast("Status pembinaan diperbarui.");
  }
});

$("#addSantriBtn").addEventListener("click", () => openForm("santri"));
$("#addViolationBtn").addEventListener("click", () => openForm("violation"));
$("#addGuidanceBtn").addEventListener("click", () => openForm("guidance"));
$("#closeModal").addEventListener("click", closeForm);
$("#cancelModal").addEventListener("click", closeForm);
$("#modalBackdrop").addEventListener("click", event => { if (event.target === $("#modalBackdrop")) closeForm(); });
$("#dataForm").addEventListener("submit", handleFormSubmit);
$("#searchSantri").addEventListener("input", renderSantri);
$("#searchViolation").addEventListener("input", renderViolations);
$("#filterViolationStatus").addEventListener("change", renderViolations);
$("#searchGuidance").addEventListener("input", renderGuidance);
$("#filterGuidanceStatus").addEventListener("change", renderGuidance);
$("#printReportBtn").addEventListener("click", () => { setPage("laporan"); window.print(); });
$("#menuButton").addEventListener("click", openSidebar);
$("#closeSidebar").addEventListener("click", closeSidebar);
$("#mobileOverlay").addEventListener("click", closeSidebar);
document.addEventListener("keydown", event => { if (event.key === "Escape") { closeForm(); closeSidebar(); } });

$("#todayLabel").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
$("#yearNow").textContent = new Date().getFullYear();
renderAll();
