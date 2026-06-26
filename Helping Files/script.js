const API_ENDPOINT = "PASTE_YOUR_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE";
const MAX_BATCH = 5;

let students = [];
let selectedRows = [];
let previewStudents = [];
let previewIndex = 0;
let selectedStudent = null;

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

async function loadApprovedStudents() {
  hideMessage();
  const grid = document.getElementById("studentGrid");
  if (grid) grid.innerHTML = '<tr><td colspan="11" class="empty">Loading approved records...</td></tr>';

  if (!hasEndpoint()) {
    students = DEMO_STUDENTS.map((student) => ({ ...student }));
    renderCourseFilter();
    renderGrid();
    updateSelectionUI();
    showMessage("Demo mode is active. Paste your Apps Script Web App URL in script.js to load real sheet rows.");
    return;
  }

  try {
    const data = await callApi({ action: "list" });
    students = Array.isArray(data.students) ? data.students : [];
    selectedRows = selectedRows.filter((row) => students.some((student) => Number(student.rowNumber) === Number(row)));
    renderCourseFilter();
    renderGrid();
    updateSelectionUI();
    if (!students.length) showMessage("No approved records found in the verification sheet.");
  } catch (err) {
    students = DEMO_STUDENTS.map((student) => ({ ...student }));
    selectedRows = [];
    renderCourseFilter();
    renderGrid();
    updateSelectionUI();
    showMessage(`Could not load sheet data, so demo rows are shown. ${err.message || ""}`, "error");
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
  const generatedFilter = document.getElementById("generatedFilter")?.value || "pending";
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
    grid.innerHTML = '<tr><td colspan="11" class="empty">No matching approved records.</td></tr>';
    return;
  }

  grid.innerHTML = visible.map((student) => {
    const rowNumber = Number(student.rowNumber);
    const isGenerated = normalize(student.generated) === "yes";
    const isSelected = selectedRows.includes(rowNumber);
    const generateLabel = isGenerated ? "Regenerate" : "Generate";

    return `
      <tr class="${isSelected ? "is-selected" : ""}">
        <td class="select-col">
          <label class="check-wrap" title="Select this row">
            <input type="checkbox" ${isSelected ? "checked" : ""} onchange="toggleRowSelection(${rowNumber}, this.checked)">
          </label>
        </td>
        <td><strong>${escapeHtml(student.name)}</strong></td>
        <td>${escapeHtml(student.email)}</td>
        <td>${escapeHtml(student.mobile)}</td>
        <td>${escapeHtml(student.course)}</td>
        <td>${escapeHtml(formatDate(student.joiningDate))}</td>
        <td>${escapeHtml(formatDate(student.endingDate))}</td>
        <td>${escapeHtml(student.courseReview)}</td>
        <td>${escapeHtml(student.certificateId || "-")}</td>
        <td><span class="pill ${isGenerated ? "yes" : "no"}">${isGenerated ? "Yes" : "No"}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" onclick="generateOne(${rowNumber})">${generateLabel}</button>
            <button class="secondary" type="button" onclick="previewRows([${rowNumber}])">Preview</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function toggleRowSelection(rowNumber, checked) {
  rowNumber = Number(rowNumber);
  if (checked) {
    if (selectedRows.length >= MAX_BATCH && !selectedRows.includes(rowNumber)) {
      showMessage(`You can select maximum ${MAX_BATCH} rows at once.`, "error");
      renderGrid();
      return;
    }
    if (!selectedRows.includes(rowNumber)) selectedRows.push(rowNumber);
  } else {
    selectedRows = selectedRows.filter((row) => row !== rowNumber);
  }
  updateSelectionUI();
  renderGrid();
}

function clearSelection() {
  selectedRows = [];
  updateSelectionUI();
  renderGrid();
}

function updateSelectionUI() {
  const count = selectedRows.length;
  const countEl = document.getElementById("selectedCount");
  const bar = document.getElementById("selectionBar");
  const title = document.getElementById("selectionTitle");

  if (countEl) countEl.textContent = `${count}/${MAX_BATCH}`;
  if (title) title.textContent = `${count} selected`;
  if (bar) bar.style.display = count ? "flex" : "none";
}

function getStudentByRow(rowNumber) {
  return students.find((student) => Number(student.rowNumber) === Number(rowNumber));
}

function buildCertificateId(student) {
  if (student.certificateId) return student.certificateId;
  const year = new Date().getFullYear();
  return `SAMYAK-${year}-${String(Number(student.rowNumber) - 1).padStart(4, "0")}`;
}

function previewSelected() {
  if (!selectedRows.length) {
    showMessage("Select at least one approved sheet row first.", "error");
    return;
  }
  previewRows(selectedRows);
}

function previewRows(rowNumbers) {
  previewStudents = rowNumbers
    .slice(0, MAX_BATCH)
    .map(getStudentByRow)
    .filter(Boolean)
    .map((student) => ({ ...student, certificateId: buildCertificateId(student) }));

  if (!previewStudents.length) return;
  previewIndex = 0;
  showPreviewAt(previewIndex);
  document.getElementById("previewPanel").style.display = "block";
  document.getElementById("previewPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showPreviewAt(index) {
  if (!previewStudents.length) return;
  previewIndex = (index + previewStudents.length) % previewStudents.length;
  selectedStudent = previewStudents[previewIndex];
  renderCertificate(selectedStudent);
  renderPreviewDots();
}

function previousPreview() {
  showPreviewAt(previewIndex - 1);
}

function nextPreview() {
  showPreviewAt(previewIndex + 1);
}

function renderPreviewDots() {
  const dots = document.getElementById("previewDots");
  const meta = document.getElementById("previewMeta");
  if (!dots) return;

  dots.innerHTML = previewStudents.map((student, index) => (
    `<button class="preview-dot ${index === previewIndex ? "active" : ""}" type="button" onclick="showPreviewAt(${index})" title="${escapeHtml(student.name)}"></button>`
  )).join("");

  if (meta) meta.textContent = `Certificate ${previewIndex + 1} of ${previewStudents.length}`;
}

async function generateOne(rowNumber) {
  selectedRows = [Number(rowNumber)];
  updateSelectionUI();
  await generateSelected();
}

async function generateSelected() {
  if (!selectedRows.length) {
    showMessage("Select at least one row to generate certificates.", "error");
    return;
  }
  if (selectedRows.length > MAX_BATCH) {
    showMessage(`Maximum ${MAX_BATCH} certificates can be generated at once.`, "error");
    return;
  }

  previewRows(selectedRows);

  if (!hasEndpoint()) {
    students = students.map((student) => {
      if (!selectedRows.includes(Number(student.rowNumber))) return student;
      return {
        ...student,
        certificateId: buildCertificateId(student),
        generated: "Yes"
      };
    });
    showMessage("Demo certificates generated locally. Connect Apps Script to update Google Sheet rows.", "ok");
    renderGrid();
    previewRows(selectedRows);
    return;
  }

  showMessage("Generating selected certificates and updating sheet...", "");

  try {
    const data = await callApi({ action: "generateBatch", rows: selectedRows.join(",") });
    const updatedStudents = Array.isArray(data.students) ? data.students : [];
    showMessage(`${updatedStudents.length} certificate(s) generated and sheet updated.`, "ok");
    await loadApprovedStudents();
    const generatedRows = updatedStudents.map((student) => Number(student.rowNumber));
    selectedRows = generatedRows.slice(0, MAX_BATCH);
    updateSelectionUI();
    renderGrid();
    previewRows(selectedRows);
  } catch (err) {
    showMessage(err.message || "Batch generation failed.", "error");
  }
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

function certificateHtmlForPrint() {
  const certificate = document.getElementById("certificateEl");
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  if (!certificate) return "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate Print</title>
  ${styles}
  <style>
    body { margin: 0; background: #fff; }
    .print-wrap { padding: 0; }
    .certificate { width: 1120px; max-width: 100%; margin: 0 auto; box-shadow: none !important; }
    @page { size: A4 landscape; margin: 6mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="print-wrap">${certificate.outerHTML}</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 250);
    };
  <\/script>
</body>
</html>`;
}

function printCertificate() {
  if (!selectedStudent) {
    showMessage("Preview or generate a certificate first.", "error");
    return;
  }

  const printWindow = window.open("", "_blank", "width=1200,height=850");
  if (!printWindow) {
    showMessage("Popup blocked. Please allow popups, then try again.", "error");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(certificateHtmlForPrint());
  printWindow.document.close();
}


