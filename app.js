import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentProject = null;
function slugify(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

async function loadLatestProject(userId) {
  const q = query(collection(db, "projects"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

function populateDashboard(project) {
  if (!project) return;
  currentProject = project;
  document.getElementById("projectName").textContent = project.name || "Your Chatbot";
  document.getElementById("projectGoal").textContent = project.useCase || "—";
  document.getElementById("projectBusiness").textContent = project.businessType || "—";
  document.getElementById("projectSource").textContent = project.sourceType || "—";
  document.getElementById("projectTone").textContent = project.tone || "—";
  document.getElementById("projectEmail").textContent = project.email || "—";
  document.getElementById("dashboardBotTitle").textContent = project.name || "Your Chatbot";
  document.getElementById("dashboardBotSubtitle").textContent = project.businessType ? `Built for ${project.businessType}` : "Ready for refinement";
  document.getElementById("knowledgeUrl").textContent = project.websiteUrl || "—";
  document.getElementById("knowledgeFiles").textContent = project.uploadedFiles?.length ? project.uploadedFiles.map((file) => file.name).join(", ") : "—";
  document.getElementById("knowledgeNotes").textContent = project.contentNotes || "—";
  document.getElementById("brandingTitle").value = project.name || "Your Chatbot";
  document.getElementById("brandingWelcome").value = project.welcomeMessage || "Hi — how can I help?";
  document.getElementById("embedCode").value = `<script src="https://yourdomain.com/widget.js" data-chatbot="${slugify(project.name || "your-chatbot")}" data-project-id="${project.id}"></script>`;
  document.getElementById("dashboardPreviewThread").innerHTML = `
    <div class="chat-bubble bot">${project.welcomeMessage || "Hi — I’m your configured chatbot. How can I help today?"}</div>
    <div class="chat-bubble user">What can you help me with?</div>
    <div class="chat-bubble bot">I can answer questions related to ${project.useCase || "your business"} using the configured knowledge sources.</div>
  `;
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".app-tab").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(`tab-${button.dataset.tab}`).classList.add("active");
  });
});

document.getElementById("saveBrandingBtn")?.addEventListener("click", async () => {
  if (!currentProject) return alert("No project loaded.");
  const newName = document.getElementById("brandingTitle").value.trim() || "Your Chatbot";
  const newWelcome = document.getElementById("brandingWelcome").value.trim() || "Hi — how can I help?";
  try {
    await updateDoc(doc(db, "projects", currentProject.id), { name: newName, welcomeMessage: newWelcome, updatedAt: serverTimestamp() });
    currentProject.name = newName;
    currentProject.welcomeMessage = newWelcome;
    populateDashboard(currentProject);
    alert("Branding saved.");
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not save branding.");
  }
});

document.getElementById("copyEmbedBtn")?.addEventListener("click", async () => {
  const embed = document.getElementById("embedCode").value;
  try { await navigator.clipboard.writeText(embed); alert("Embed code copied."); }
  catch { alert("Could not copy automatically. Please copy it manually."); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please sign in from the landing page first.");
    window.location.href = "index.html";
    return;
  }
  try {
    const project = await loadLatestProject(user.uid);
    if (!project) {
      alert("No project found for this account yet.");
      window.location.href = "index.html";
      return;
    }
    populateDashboard(project);
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to load your dashboard.");
  }
});
