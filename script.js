const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyTxMELKFJWz_1yI8Jk_MVfxM7rDVkjAejGJDf-TQs6ZiLIsxElR3gcQeSnjhisqWjFog/exec";
const SYNC_INTERVAL_MS = 8000;

let students = [];
let selectedRow = null;
let selectedStudent = null;
let syncTimer = null;

const DEMO_STUDENTS = [
  {
    rowNumber: 2,
    name: "Abhi Kayasth",
    email: "abhi@example.com",
    mobile: "7383021062",
    course: "Python",
    joiningDate: "2026-06-01",
    endingDate: "2026-06-30",
    courseReview: "excellent practical learning",
    verificationStatus: "Approved",
    certificateId: "",
    generated: "No",
    remarks: "Ready"
  },
  {
    rowNumber: 3,
    name: "Riya Shah",
    email: "riya@example.com",
    mobile: "9601257564",
    course: "Web Development",
    joiningDate: "2026-06-05",
    endingDate: "2026-07-05",
    courseReview: "strong project discipline",
    verificationStatus: "Approved",
    certificateId: "",
    generated: "No",
    remarks: "Ready"
  },
  {
    rowNumber: 4,
    name: "Meet Patel",
    email: "meet@example.com",
    mobile: "9876543210",
    course: "Tally Prime",
    joiningDate: "2026-05-10",
    endingDate: "2026-06-10",
    courseReview: "career-ready understanding",
    verificationStatus: "Approved",
    certificateId: "SAMYAK-2026-0003",
    generated: "Yes",
    remarks: "Generated"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  loadApprovedStudents();
  startLiveSync();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePreview();
});

function showMessage(text, type = "") {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`.trim();
  el.style.display = "block";
}

function hideMessage() {
  const el = document.getElementById("message");
  if (el) el.style.display = "none";
}

function setSyncStatus(text, type = "") {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.textContent = text;
  el.className = `sync-chip ${type}`.trim();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  }
  return String(value);
}

function todayText() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function hasEndpoint() {
  return API_ENDPOINT && !API_ENDPOINT.includes("PASTE_YOUR");
}

async function callApi(params) {
  if (!hasEndpoint()) throw new Error("Apps Script URL missing");
  const url = `${API_ENDPOINT}?${new URLSearchParams(params).toString()}&t=${Date.now()}`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error(`Server error ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function normalizeStudentList(data) {
  if (Array.isArray(data?.students)) return data.students;
  if (Array.isArray(data?.data)) return data.data.map(mapLooseStudent);
  if (Array.isArray(data)) return data.map(mapLooseStudent);
  return [];
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source[key] !== null && String(source[key]).trim() !== "") return source[key];
  }
  return "";
}

function mapLooseStudent(row, index) {
  return {
    rowNumber: Number(firstValue(row, ["rowNumber", "row", "Row"])) || index + 2,
    name: firstValue(row, ["name", "Name", "Full Name", "Full Name "]),
    email: firstValue(row, ["email", "Email", "Email ", "Email Address", "Email Address ", "Email address"]),
    mobile: firstValue(row, ["mobile", "Mobile", "Mobile ", "Mobile Number", "Mobile Number "]),
    course: firstValue(row, ["course", "Course", "Course ", "Course Name", "Course Name "]),
    joiningDate: firstValue(row, ["joiningDate", "Joining Date", "Course Joining Date", "Course Joining Date "]),
    endingDate: firstValue(row, ["endingDate", "Ending Date", "Course Completion Date", "Course Completion Date "]),
    courseReview: firstValue(row, ["courseReview", "Course Review", "Course Review"]),
    verificationStatus: firstValue(row, ["verificationStatus", "Verification Status"]),
    certificateId: firstValue(row, ["certificateId", "Certificate ID"]),
    generated: firstValue(row, ["generated", "Generated"]),
    remarks: firstValue(row, ["remarks", "Remarks", "Any Feedback", "Any Feedback "])
  };
}

async function fetchStudentData() {
  const attempts = [{}, { action: "list" }, { action: "get" }, { action: "read" }];
  let lastError = null;

  for (const params of attempts) {
    try {
      return await callApi(params);
    } catch (err) {
      lastError = err;
      if (!/invalid action/i.test(String(err.message || err))) break;
    }
  }

  throw lastError || new Error("Could not load sheet data.");
}

function startLiveSync() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(loadApprovedStudents, SYNC_INTERVAL_MS);
}

async function loadApprovedStudents() {
  const grid = document.getElementById("studentGrid");
  if (grid && !students.length) grid.innerHTML = '<tr><td colspan="11" class="empty">Loading sheet records...</td></tr>';

  if (!hasEndpoint()) {
    students = DEMO_STUDENTS.map((student) => ({ ...student }));
    selectedRow = selectedRow && students.some((student) => Number(student.rowNumber) === Number(selectedRow)) ? selectedRow : null;
    renderCourseFilter();
    renderGrid();
    updateSelectionUI();
    setSyncStatus("Demo data", "warn");
    showMessage("Demo mode is active. Paste your Apps Script Web App URL in script.js to load live sheet rows.");
    return;
  }

  try {
    setSyncStatus("Syncing sheet...");
    const data = await fetchStudentData();
    students = normalizeStudentList(data);
    selectedRow = selectedRow && students.some((student) => Number(student.rowNumber) === Number(selectedRow)) ? selectedRow : null;
    selectedStudent = selectedRow ? prepareCertificateStudent(getStudentByRow(selectedRow)) : selectedStudent;
    renderCourseFilter();
    renderGrid();
    updateSelectionUI();
    if (selectedStudent && document.getElementById("previewPanel")?.style.display !== "none") renderCertificate(selectedStudent);
    setSyncStatus(`Live sync: ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`, "ok");
    if (!students.length) showMessage("No records found in the sheet.");
    else hideMessage();
  } catch (err) {
    setSyncStatus("Sync failed", "error");
    if (!students.length) {
      students = DEMO_STUDENTS.map((student) => ({ ...student }));
      renderCourseFilter();
      renderGrid();
    }
    showMessage(`Could not load sheet data. ${err.message || ""}`, "error");
  }
}

function renderCourseFilter() {
  const select = document.getElementById("courseFilter");
  if (!select) return;
  const current = select.value || "all";
  const courses = [...new Set(students.map((student) => String(student.course || "").trim()).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All courses</option>' + courses.map((course) => (
    `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`
  )).join("");
  select.value = courses.includes(current) ? current : "all";
}

function filteredStudents() {
  const q = normalize(document.getElementById("searchInput")?.value);
  const generatedFilter = document.getElementById("generatedFilter")?.value || "all";
  const courseFilter = document.getElementById("courseFilter")?.value || "all";

  return students.filter((student) => {
    const generated = normalize(student.generated) === "yes";
    const matchesGenerated =
      generatedFilter === "all" ||
      (generatedFilter === "yes" && generated) ||
      (generatedFilter === "pending" && !generated);
    const matchesCourse = courseFilter === "all" || String(student.course || "") === courseFilter;
    const haystack = normalize([student.name, student.email, student.mobile, student.course, student.certificateId].join(" "));
    return matchesGenerated && matchesCourse && (!q || haystack.includes(q));
  });
}

function renderGrid() {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;

  const total = students.length;
  const done = students.filter((s) => normalize(s.generated) === "yes").length;
  const pending = total - done;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("doneCount").textContent = done;
  updateSelectionUI();

  const visible = filteredStudents();
  if (!visible.length) {
    grid.innerHTML = '<tr><td colspan="11" class="empty">No matching sheet records.</td></tr>';
    return;
  }

  grid.innerHTML = visible.map((student) => {
    const rowNumber = Number(student.rowNumber);
    const isGenerated = normalize(student.generated) === "yes";
    const isSelected = Number(selectedRow) === rowNumber;

    return `
      <tr class="${isSelected ? "is-selected" : ""}">
        <td class="select-col">
          <label class="check-wrap" title="Select this row">
            <input type="radio" name="selectedStudent" ${isSelected ? "checked" : ""} onchange="selectStudent(${rowNumber})">
          </label>
        </td>
        <td><strong>${escapeHtml(student.name)}</strong></td>
        <td>${escapeHtml(student.email)}</td>
        <td>${escapeHtml(student.mobile)}</td>
        <td>${escapeHtml(student.course)}</td>
        <td>${escapeHtml(formatDate(student.joiningDate))}</td>
        <td>${escapeHtml(formatDate(student.endingDate))}</td>
        <td>${escapeHtml(student.courseReview)}</td>
        <td>${escapeHtml(student.certificateId || buildCertificateId(student))}</td>
        <td><span class="pill ${isGenerated ? "yes" : "no"}">${isGenerated ? "Yes" : "No"}</span></td>
        <td>
          <button type="button" onclick="selectStudent(${rowNumber})">Preview</button>
        </td>
      </tr>
    `;
  }).join("");
}

function updateSelectionUI() {
  const countEl = document.getElementById("selectedCount");
  if (!countEl) return;
  const student = selectedRow ? getStudentByRow(selectedRow) : null;
  countEl.textContent = student?.name || "None";
}

function getStudentByRow(rowNumber) {
  return students.find((student) => Number(student.rowNumber) === Number(rowNumber));
}

function buildCertificateId(student) {
  if (student?.certificateId) return student.certificateId;
  const year = new Date().getFullYear();
  return `SAMYAK-${year}-${String(Number(student?.rowNumber || 1) - 1).padStart(4, "0")}`;
}

function prepareCertificateStudent(student) {
  if (!student) return null;
  return { ...student, certificateId: buildCertificateId(student) };
}

function selectStudent(rowNumber) {
  const student = getStudentByRow(rowNumber);
  if (!student) {
    showMessage("This sheet row is no longer available.", "error");
    return;
  }

  selectedRow = Number(rowNumber);
  selectedStudent = prepareCertificateStudent(student);
  renderGrid();
  renderCertificate(selectedStudent);
  openPreview();
}

function openPreview() {
  const panel = document.getElementById("previewPanel");
  if (!panel) return;
  panel.style.display = "grid";
  document.body.classList.add("modal-open");
}

function closePreview() {
  const panel = document.getElementById("previewPanel");
  if (!panel) return;
  panel.style.display = "none";
  document.body.classList.remove("modal-open");
}

function renderCertificate(student) {
  const certId = buildCertificateId(student);
  const course = student.course || "Course";
  const review = student.courseReview || "excellent practical learning";
  const certificate = document.getElementById("certificateEl");

  if (certificate) {
    certificate.style.animation = "none";
    certificate.offsetHeight;
    certificate.style.animation = "certSwap 260ms ease both";
  }

  document.getElementById("previewTitle").textContent = `${student.name} - ${course}`;
  document.getElementById("previewMeta").textContent = `Sheet row ${student.rowNumber}`;
  document.getElementById("certCourseHeading").textContent = `${course.toUpperCase()} COURSE COMPLETION - 2026`;
  document.getElementById("certName").textContent = student.name || "Student Name";
  document.getElementById("certCourseMark").textContent = course;
  document.getElementById("certJoining").textContent = formatDate(student.joiningDate) || "--";
  document.getElementById("certEnding").textContent = formatDate(student.endingDate) || "--";
  document.getElementById("certReview").textContent = review;
  document.getElementById("certVerificationNo").textContent = `VN-${certId}`;
  document.getElementById("certIssued").textContent = todayText();
  document.getElementById("certId").textContent = certId;
}

async function downloadCertificatePng() {
  if (!selectedStudent) {
    showMessage("Select a sheet row to preview first.", "error");
    return;
  }

  const certificate = document.getElementById("certificateEl");
  if (!certificate) return;
  if (typeof html2canvas !== "function") {
    showMessage("PNG exporter is still loading. Please try again in a moment.", "error");
    return;
  }

  try {
    const canvas = await html2canvas(certificate, {
      backgroundColor: "#fffdf8",
      scale: 2,
      useCORS: true
    });
    const link = document.createElement("a");
    const safeName = String(selectedStudent.name || "certificate").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.download = `${safeName || "certificate"}-${buildCertificateId(selectedStudent)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    showMessage(`Could not download PNG. ${err.message || ""}`, "error");
  }
}




