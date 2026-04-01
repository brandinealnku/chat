import { auth, db, storage } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const state = {
  useCase: "",
  businessType: "",
  sourceType: "",
  websiteUrl: "",
  uploadedFiles: [],
  contentNotes: "",
  tone: "",
  email: "",
  password: "",
  previewGenerated: false
};

const stepMeta = {
  1: "Choose your main goal",
  2: "Select your business type",
  3: "Add your source content",
  4: "Choose your tone",
  5: "Create account and save"
};

let currentStep = 1;
const totalSteps = 5;

const progressLabel = document.getElementById("progressLabel");
const progressHint = document.getElementById("progressHint");
const progressBarFill = document.getElementById("progressBarFill");
const previewBotTitle = document.getElementById("previewBotTitle");
const previewBotSubtitle = document.getElementById("previewBotSubtitle");
const previewThread = document.getElementById("previewThread");
const summarySetup = document.getElementById("summarySetup");
const statGoal = document.getElementById("statGoal");
const statSource = document.getElementById("statSource");
const statTone = document.getElementById("statTone");
const sourceTypeInput = document.getElementById("sourceType");
const websiteUrlInput = document.getElementById("websiteUrl");
const fileUploadInput = document.getElementById("fileUpload");
const contentNotesInput = document.getElementById("contentNotes");
const emailCapture = document.getElementById("emailCapture");
const passwordCapture = document.getElementById("passwordCapture");
const saveBotBtn = document.getElementById("saveBotBtn");
const stepFive = document.getElementById("step5");

function ensureStatusBox() {
  let box = document.getElementById("saveStatus");
  if (box) return box;
  box = document.createElement("div");
  box.id = "saveStatus";
  box.className = "inline-note save-status hidden";
  stepFive?.appendChild(box);
  return box;
}

const saveStatus = ensureStatusBox();

function setStatus(message = "", kind = "info") {
  if (!saveStatus) return;
  if (!message) {
    saveStatus.textContent = "";
    saveStatus.className = "inline-note save-status hidden";
    return;
  }
  saveStatus.textContent = message;
  saveStatus.className = `inline-note save-status status-${kind}`;
}

function isPlaceholderFirebaseConfig() {
  const options = auth?.app?.options || {};
  return [options.apiKey, options.projectId, options.appId].some((value) =>
    typeof value === "string" && value.startsWith("YOUR_")
  );
}

function humanizeFirebaseError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "That email already has an account. Try the same password you used before.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a stronger password with at least 6 characters.",
    "auth/invalid-credential": "That email/password combination was not accepted. Double-check your password.",
    "auth/wrong-password": "That password did not match the existing account.",
    "auth/network-request-failed": "Firebase could not be reached. Check your internet connection and try again.",
    "permission-denied": "Firestore or Storage rules blocked the request. Check your Firebase rules.",
    "storage/unauthorized": "Storage rules blocked the file upload. Check your Firebase Storage rules.",
    "storage/canceled": "The upload was canceled before it completed.",
    "storage/unknown": "Storage returned an unknown error. Check the browser console for details."
  };
  return map[code] || error?.message || "Something went wrong while saving your project.";
}

function setStep(step) {
  currentStep = step;
  document.querySelectorAll(".step-view").forEach((view) => view.classList.remove("active"));
  const activeStep = document.getElementById(`step${step}`);
  if (activeStep) activeStep.classList.add("active");
  progressLabel.textContent = `Step ${step} of ${totalSteps}`;
  progressHint.textContent = stepMeta[step] || "";
  progressBarFill.style.width = `${(step / totalSteps) * 100}%`;
}

function resetPreviewThread() {
  previewThread.innerHTML = `<div class="chat-bubble bot">Hi — I’m your future chatbot. As you make selections, I’ll update this preview to reflect your use case and style.</div>`;
}

function appendPreviewBubble(message, role = "bot") {
  const div = document.createElement("div");
  div.className = `chat-bubble ${role}`;
  div.textContent = message;
  previewThread.appendChild(div);
}

function updateSummary() {
  statGoal.textContent = state.useCase || "—";
  statSource.textContent = state.sourceType || "—";
  statTone.textContent = state.tone || "—";
  const parts = [];
  if (state.useCase) parts.push(state.useCase);
  if (state.businessType) parts.push(state.businessType);
  if (state.sourceType) parts.push(state.sourceType);
  if (state.uploadedFiles.length) parts.push(`${state.uploadedFiles.length} file(s)`);
  if (state.tone) parts.push(`${state.tone} tone`);
  summarySetup.textContent = parts.length ? `Current setup: ${parts.join(" • ")}.` : "Choose a goal, source type, and tone to generate a stronger preview.";
  previewBotTitle.textContent = state.useCase ? `${state.useCase} Bot` : "Your Chatbot";
  previewBotSubtitle.textContent = state.businessType ? `Built for ${state.businessType}` : "Waiting for your setup choices…";
}

function validateStep(step) {
  if (step === 1 && !state.useCase) return alert("Please choose a primary chatbot goal."), false;
  if (step === 2 && !state.businessType) return alert("Please choose a business type or use case."), false;
  if (step === 3) {
    state.sourceType = sourceTypeInput.value.trim();
    state.websiteUrl = websiteUrlInput.value.trim();
    state.contentNotes = contentNotesInput.value.trim();
    if (!state.sourceType) return alert("Please select a source type."), false;
  }
  if (step === 4 && !state.tone) return alert("Please choose a tone style."), false;
  if (step === 5) {
    state.email = emailCapture.value.trim();
    state.password = passwordCapture.value.trim();
    if (!state.email) return alert("Please enter your email."), false;
    if (state.password.length < 6) return alert("Please create a password with at least 6 characters."), false;
  }
  return true;
}

function buildGeneratedPreview() {
  resetPreviewThread();
  appendPreviewBubble(`Hi — I’m your ${state.useCase || "AI"} assistant for ${state.businessType || "your business"}.`, "bot");
  appendPreviewBubble(`I’ll answer in a ${state.tone || "helpful"} tone using ${state.sourceType || "your content"} as my source knowledge.`, "bot");
  if (state.websiteUrl) {
    appendPreviewBubble(`Website added: ${state.websiteUrl}`, "user");
    appendPreviewBubble("Perfect — I can use that site content to answer visitor questions.", "bot");
  }
  if (state.uploadedFiles.length) {
    appendPreviewBubble(`Files added: ${state.uploadedFiles.map((file) => file.name).join(", ")}`, "user");
    appendPreviewBubble("Great — uploaded documents can be processed into a searchable knowledge base.", "bot");
  }
  state.previewGenerated = true;
  updateSummary();
}

async function uploadProjectFiles(userId, projectSlug) {
  if (!state.uploadedFiles.length) return [];

  const uploaded = [];
  for (const file of state.uploadedFiles) {
    const fileRef = ref(storage, `projects/${userId}/${projectSlug}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    uploaded.push({ name: file.name, size: file.size, type: file.type || "application/octet-stream", downloadURL });
  }
  return uploaded;
}

async function createOrSignInUser(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    }
    throw error;
  }
}

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function saveProjectToFirebase() {
  if (isPlaceholderFirebaseConfig()) {
    throw new Error("Firebase is still using placeholder values. Update firebase-config.js with your real Firebase project settings first.");
  }

  const user = await createOrSignInUser(state.email, state.password);
  const projectName = state.useCase ? `${state.useCase} Bot` : "Your Chatbot";
  const projectSlug = slugify(projectName);
  const uploadedFiles = await uploadProjectFiles(user.uid, projectSlug);

  const clientCreatedAt = Date.now();
  const docRef = await addDoc(collection(db, "projects"), {
    userId: user.uid,
    name: projectName,
    useCase: state.useCase,
    businessType: state.businessType,
    sourceType: state.sourceType,
    websiteUrl: state.websiteUrl,
    uploadedFiles,
    contentNotes: state.contentNotes,
    tone: state.tone,
    email: state.email,
    welcomeMessage: `Hi — I’m your ${state.useCase || "AI"} assistant. How can I help today?`,
    clientCreatedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  localStorage.setItem("itsbadChatLastProjectId", docRef.id);
  localStorage.setItem("itsbadChatLastProjectName", projectName);
  return docRef.id;
}

function showSuccessState() {
  document.querySelectorAll(".step-view").forEach((view) => view.classList.remove("active"));
  document.getElementById("successState").classList.add("active");
  progressLabel.textContent = "Completed";
  progressHint.textContent = "Ready for dashboard handoff";
  progressBarFill.style.width = "100%";
}

document.querySelectorAll("[data-step-group]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const card = event.target.closest(".choice-card");
    if (!card) return;
    group.querySelectorAll(".choice-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    state[group.dataset.stepGroup] = card.dataset.value;
    updateSummary();
  });
});

document.querySelectorAll("[data-next]").forEach((btn) => btn.addEventListener("click", () => { if (validateStep(currentStep)) setStep(Number(btn.dataset.next)); }));
document.querySelectorAll("[data-back]").forEach((btn) => btn.addEventListener("click", () => setStep(Number(btn.dataset.back))));
sourceTypeInput?.addEventListener("change", () => { state.sourceType = sourceTypeInput.value.trim(); updateSummary(); });
websiteUrlInput?.addEventListener("input", () => { state.websiteUrl = websiteUrlInput.value.trim(); updateSummary(); });
contentNotesInput?.addEventListener("input", () => { state.contentNotes = contentNotesInput.value.trim(); updateSummary(); });
fileUploadInput?.addEventListener("change", () => { state.uploadedFiles = Array.from(fileUploadInput.files || []); updateSummary(); });

document.getElementById("generatePreviewBtn")?.addEventListener("click", () => {
  if (!validateStep(4)) return;
  setStatus("");
  buildGeneratedPreview();
  setStep(5);
});

saveBotBtn?.addEventListener("click", async (event) => {
  if (!validateStep(5)) return;
  const btn = event.currentTarget;
  const original = btn.textContent;

  try {
    btn.disabled = true;
    btn.textContent = "Saving...";
    setStatus("Creating your account, uploading any files, and saving the project…", "info");
    await saveProjectToFirebase();
    setStatus("Project saved. Opening your dashboard…", "success");
    showSuccessState();
    window.setTimeout(() => {
      window.location.href = "app.html";
    }, 900);
  } catch (error) {
    console.error("SAVE PROJECT ERROR", error);
    setStatus(humanizeFirebaseError(error), "error");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

const demoThread = document.getElementById("demoThread");
const demoInput = document.getElementById("demoInput");
const sendDemoBtn = document.getElementById("sendDemoBtn");
function appendDemoBubble(message, role = "bot") {
  const div = document.createElement("div");
  div.className = `chat-bubble ${role}`;
  div.textContent = message;
  demoThread.appendChild(div);
}
function handleDemoPrompt(prompt) {
  if (!prompt.trim()) return;
  appendDemoBubble(prompt, "user");
  setTimeout(() => {
    let response = "This chatbot can answer questions, guide visitors, and move them toward the right next step based on your source content.";
    const lower = prompt.toLowerCase();
    if (lower.includes("pdf") || lower.includes("document")) {
      response = "Yes — a production version can use PDFs, syllabi, help docs, and internal files.";
    } else if (lower.includes("launch") || lower.includes("fast")) {
      response = "The fastest path is: choose a use case, add your website or docs, preview the bot, then move into the dashboard.";
    } else if (lower.includes("what can this chatbot do")) {
      response = "It can answer FAQs, qualify leads, support customers, and personalize conversations based on your website or uploaded docs.";
    }
    appendDemoBubble(response, "bot");
  }, 400);
}
sendDemoBtn?.addEventListener("click", () => {
  const prompt = demoInput.value;
  if (!prompt.trim()) return;
  handleDemoPrompt(prompt);
  demoInput.value = "";
});
demoInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendDemoBtn.click();
  }
});
document.querySelectorAll("[data-demo]").forEach((btn) => btn.addEventListener("click", () => handleDemoPrompt(btn.dataset.demo)));

updateSummary();
setStep(1);
