import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentProject = null;

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ensureDashboardStatus() {
  let box = document.getElementById("dashboardStatus");
  if (box) return box;
  const topbar = document.querySelector(".app-topbar");
  box = document.createElement("div");
  box.id = "dashboardStatus";
  box.className = "inline-note save-status hidden";
  topbar?.insertAdjacentElement("afterend", box);
  return box;
}

const dashboardStatus = ensureDashboardStatus();

function setDashboardStatus(message = "", kind = "info") {
  if (!dashboardStatus) return;
  if (!message) {
    dashboardStatus.textContent = "";
    dashboardStatus.className = "inline-note save-status hidden";
    return;
  }
  dashboardStatus.textContent = message;
  dashboardStatus.className = `inline-note save-status status-${kind}`;
}

async function loadProjectById(projectId) {
  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

async function loadLatestProject(userId) {
  const rememberedId = localStorage.getItem("itsbadChatLastProjectId");
  if (rememberedId) {
    const rememberedProject = await loadProjectById(rememberedId);
    if (rememberedProject?.userId === userId) return rememberedProject;
  }

  let snapshot;
  try {
    const indexedQuery = query(collection(db, "projects"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(1));
    snapshot = await getDocs(indexedQuery);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (error) {
    const needsIndex = error?.code === "failed-precondition" || String(error?.message || "").toLowerCase().includes("requires an index");
    if (needsIndex) {
      console.warn("Missing composite index for projects(userId ==, createdAt desc). Falling back to non-indexed query path.", error);
      setDashboardStatus(
        "Missing Firestore index: projects(userId ==, createdAt desc). Create it in Firebase Console > Firestore > Indexes, then reload for fastest lookup.",
        "error"
      );
    } else {
      throw error;
    }
  }

  const q = query(collection(db, "projects"), where("userId", "==", userId), limit(20));
  snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const projects = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  projects.sort((a, b) => {
    const aValue = a.clientCreatedAt || a.createdAt?.seconds || 0;
    const bValue = b.clientCreatedAt || b.createdAt?.seconds || 0;
    return bValue - aValue;
  });

  return projects[0];
}

function populateDashboard(project) {
  if (!project) return;
  currentProject = project;
  localStorage.setItem("itsbadChatLastProjectId", project.id);

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
    setDashboardStatus("Branding saved.", "success");
  } catch (error) {
    console.error(error);
    setDashboardStatus(error.message || "Could not save branding.", "error");
  }
});

document.getElementById("copyEmbedBtn")?.addEventListener("click", async () => {
  const embed = document.getElementById("embedCode").value;
  try {
    await navigator.clipboard.writeText(embed);
    setDashboardStatus("Embed code copied.", "success");
  } catch {
    setDashboardStatus("Could not copy automatically. Please copy it manually.", "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please sign in from the landing page first.");
    window.location.href = "index.html";
    return;
  }
  try {
    setDashboardStatus("Loading your latest chatbot project…", "info");
    const project = await loadLatestProject(user.uid);
    if (!project) {
      setDashboardStatus("No saved project was found for this account yet. Go back to the landing page and save one first.", "error");
      return;
    }
    populateDashboard(project);
    setDashboardStatus("Dashboard loaded.", "success");
  } catch (error) {
    console.error(error);
    setDashboardStatus(
      `${error.message || "Failed to load your dashboard."} If you still see an index error in the Firebase console, create a composite index for projects.userId + createdAt desc — but this version now tries to avoid that query path.`,
      "error"
    );
  }
});
