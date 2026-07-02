const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyTxMELKFJWz_1yI8Jk_MVfxM7rDVkjAejGJDf-TQs6ZiLIsxElR3gcQeSnjhisqWjFog/exec";
const SYNC_INTERVAL_MS = 8000;

const STANDARD_COURSES = [
  "MS Office",
  "C",
  "C++",
  "C/C++",
  "Python",
  "Advanced Python",
  "DSA With C",
  "DSA With C++",
  "DSA With Python",
  "Python / Advanced Python / DSA",
  "Digital Marketing",
  "Power BI",
  "SQL",
  "Ethical Hacking",
  "Basic + Advanced Excel",
  "Tally Prime With GST",
  "Spoken English",
  "Spoken English With Personality Development",
  "Personality Development",
  "Basic Computer"
];
let students = [];
let selectedRow = null;
let selectedStudent = null;
let selectedTemplate = "auto";
let syncTimer = null;

const CERTIFICATE_TEMPLATES = {
  auto: {
    className: "template-professional",
    previewScale: 0.86,
    heading: "COURSE COMPLETION - 2026",
    copy1: "has successfully completed a <mark id=\"certCourseMark\">{{course}}</mark> live project based internship with training conducted by Samyak Computer Classes (Authorized Franchisee - Osian Enterprise), Manjalpur Branch, Vadodara.",
    copy2: "The course started on <mark id=\"certJoining\">{{joining}}</mark> and completed on <mark id=\"certEnding\">{{ending}}</mark>. The student has demonstrated <mark id=\"certReview\">{{review}}</mark>, project discipline, and career-ready understanding throughout the training program."
  },
  standard: {
    className: "template-professional",
    previewScale: 0.86,
    heading: "COURSE COMPLETION - 2026",
    copy1: "has successfully completed a <mark id=\"certCourseMark\">{{course}}</mark> live project based internship with training conducted by Samyak Computer Classes (Authorized Franchisee - Osian Enterprise), Manjalpur Branch, Vadodara.",
    copy2: "The course started on <mark id=\"certJoining\">{{joining}}</mark> and completed on <mark id=\"certEnding\">{{ending}}</mark>. The student has demonstrated <mark id=\"certReview\">{{review}}</mark>, project discipline, and career-ready understanding throughout the training program."
  },
  classic: {
    className: "template-classic",
    previewScale: 0.84,
    heading: "CERTIFICATE COMPLETION - 2026",
    copy1: "has successfully completed a <mark id=\"certCourseMark\">{{course}}</mark> live project based internship with training conducted by Samyak Computer Classes (Authorized Franchisee - Osian Enterprise), Manjalpur Branch, Vadodara.",
    copy2: "The course started on <mark id=\"certJoining\">{{joining}}</mark> and completed on <mark id=\"certEnding\">{{ending}}</mark>. The student has demonstrated <mark id=\"certReview\">{{review}}</mark>, project discipline, and career-ready understanding throughout the training program."
  },
  modern: {
    className: "template-modern",
    previewScale: 0.92,
    heading: "COURSE COMPLETION - 2026",
    copy1: "is hereby certified for successfully completing a <mark id=\"certCourseMark\">{{course}}</mark> live project based internship with training conducted by Samyak Computer Classes (Authorized Franchisee - Osian Enterprise), Manjalpur Branch, Vadodara.",
    copy2: "The course started on <mark id=\"certJoining\">{{joining}}</mark> and completed on <mark id=\"certEnding\">{{ending}}</mark>. The student has demonstrated <mark id=\"certReview\">{{review}}</mark>, strong project discipline, and career-ready understanding throughout the training program."
  }
};

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
  syncTimer = setInterval(() => {
    if (!isPreviewOpen()) loadApprovedStudents();
  }, SYNC_INTERVAL_MS);
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
    selectedStudent = selectedRow ? selectedStudent || prepareCertificateStudent(getStudentByRow(selectedRow)) : selectedStudent;
    renderCourseFilter();
    renderGrid();
    updateSelectionUI();
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
  const sheetCourses = students.map((student) => String(student.course || "").trim()).filter(Boolean);
  const courses = [...new Set([...STANDARD_COURSES, ...sheetCourses])];
  select.innerHTML = '<option value="all">All courses</option>' + courses.map((course) => (
    `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`
  )).join("");
  select.value = courses.includes(current) || current === "all" ? current : "all";
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
    const matchesCourse = courseFilter === "all" || normalize(student.course) === normalize(courseFilter);
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

function setCertificateTemplate() {
  const select = document.getElementById("templateSelect");
  selectedTemplate = select?.value || "auto";
  if (selectedStudent) renderCertificate(selectedStudent);
}

function getTemplateForCourse(course) {
  const normalized = String(course || "").trim().toLowerCase();
  if (/python|web|digital|sql|power|marketing|excel|english/.test(normalized)) {
    return CERTIFICATE_TEMPLATES.modern;
  }
  if (/c\+\+|c\/c\+\+|c\b|dsa|tally|gst|computer/.test(normalized)) {
    return CERTIFICATE_TEMPLATES.classic;
  }
  return CERTIFICATE_TEMPLATES.standard;
}

function isPreviewOpen() {
  return document.getElementById("previewPanel")?.style.display !== "none";
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
  loadApprovedStudents();
}

function renderCertificate(student) {
  const certId = buildCertificateId(student);
  const course = student.course || "Course";
  const review = student.courseReview || "excellent practical learning";
  const certificate = document.getElementById("certificateEl");
  const template = CERTIFICATE_TEMPLATES[selectedTemplate] || CERTIFICATE_TEMPLATES.standard;

  if (certificate) {
    certificate.className = `certificate ${template.className}`;
    certificate.style.animation = "none";
    certificate.offsetHeight;
    certificate.style.animation = "certSwap 260ms ease both";
    certificate.style.transform = `scale(${template.previewScale})`;
  }

  document.getElementById("previewTitle").textContent = `${student.name} - ${course}`;
  document.getElementById("previewMeta").textContent = `Sheet row ${student.rowNumber}`;
  document.getElementById("certCourseHeading").textContent = `${course.toUpperCase()} ${template.heading}`;
  document.getElementById("certName").textContent = student.name || "Student Name";
  document.getElementById("certCopy1").innerHTML = template.copy1.replace("{{course}}", escapeHtml(course));
  document.getElementById("certCopy2").innerHTML = template.copy2
    .replace("{{joining}}", escapeHtml(formatDate(student.joiningDate) || "--"))
    .replace("{{ending}}", escapeHtml(formatDate(student.endingDate) || "--"))
    .replace("{{review}}", escapeHtml(review));
  document.getElementById("certReview").textContent = review;
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
    if (document.fonts?.ready) await document.fonts.ready;
    const exportHost = document.createElement("div");
    exportHost.className = "export-host";
    const exportCertificate = certificate.cloneNode(true);
    exportCertificate.id = "certificateExportEl";
    exportCertificate.classList.add("exporting", "export-clean");
    exportHost.appendChild(exportCertificate);
    document.body.appendChild(exportHost);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const canvas = await html2canvas(exportCertificate, {
      backgroundColor: "#fffdf8",
      scale: 1,
      width: 3508,
      height: 2480,
      windowWidth: 3600,
      windowHeight: 2550,
      useCORS: true,
      logging: false
    });
    const link = document.createElement("a");
    const safeName = String(selectedStudent.name || "certificate").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.download = `${safeName || "certificate"}-${buildCertificateId(selectedStudent)}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.98);
    link.click();
  } catch (err) {
    showMessage(`Could not download certificate image. ${err.message || ""}`, "error");
  } finally {
    document.querySelector(".export-host")?.remove();
  }
}
