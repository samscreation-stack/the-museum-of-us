
/* ==========================================
   PHASE 3C — ADMIN MEMORY EDITOR
========================================== */

(async function startAdminMemoryEditor() {
  "use strict";

  const client = window.museumSupabase;

  const form = document.getElementById("museum-memory-form");
  const status = document.getElementById("admin-memory-status");
  const memoryList = document.getElementById("admin-memory-list");
  const saveButton = document.getElementById("memory-save-button");
  const clearButton = document.getElementById("memory-clear-button");
  const refreshButton = document.getElementById("memory-refresh-button");
  const currentImage = document.getElementById("memory-current-image");

  if (
    !client ||
    !form ||
    !status ||
    !memoryList ||
    !saveButton ||
    !clearButton ||
    !refreshButton ||
    !currentImage
  ) {
    console.error("Admin memory editor: required HTML element missing.");
    return;
  }

  const fields = {
    id: form.elements.namedItem("memory_id"),
    title: form.elements.namedItem("title"),
    caption: form.elements.namedItem("caption"),
    body: form.elements.namedItem("body"),
    collection: form.elements.namedItem("collection"),
    postType: form.elements.namedItem("post_type"),
    date: form.elements.namedItem("memory_date"),
    image: form.elements.namedItem("image"),
    altText: form.elements.namedItem("alt_text"),
    sortOrder: form.elements.namedItem("sort_order"),
    published: form.elements.namedItem("is_published"),
    featured: form.elements.namedItem("is_featured")
  };

  const COLLECTION_NAMES = {
    gallery: "Memory Gallery",
    timeline: "Our Story — Timeline",
    letters: "Letters Archive",
    hidden: "Hidden Exhibition"
  };

  const POST_TYPE_NAMES = {
    photo: "Photo Memory",
    letter: "Letter",
    milestone: "Milestone",
    note: "Short Note"
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const IMAGE_TYPES = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif"
  };

  let memories = [];

  function setStatus(message, state = "info") {
    status.textContent = message;
    status.dataset.state = state;
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text || "";
    return element;
  }

  function formatDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(`${dateValue}T12:00:00`);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  async function verifyAdmin() {
    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData.user) {
      setStatus("Please sign in with your admin account.", "error");
      return false;
    }

    const { data: profile, error: profileError } = await client
      .from("museum_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      setStatus("Admin access is required for the memory editor.", "error");
      return false;
    }

    return true;
  }

  function validateImage(file) {
    if (!file) return { error: null, contentType: null };

    const fileName = file.name.toLowerCase();
    const mimeType = (file.type || "").toLowerCase();

    if (
      /\.(heic|heif)$/.test(fileName) ||
      /image\/hei[cf]/.test(mimeType)
    ) {
      return {
        error:
          "This looks like an iPhone HEIC/HEIF photo. Please convert it to JPEG before uploading."
      };
    }

    const extension = fileName.includes(".")
      ? fileName.split(".").pop()
      : "";

    const expectedType = IMAGE_TYPES[extension];

    if (!expectedType) {
      return {
        error: "Unsupported image format. Use JPEG, PNG, WebP, or GIF."
      };
    }

    if (mimeType && mimeType !== expectedType) {
      return {
        error:
          "The file type does not match its extension. Export or save a supported image copy and try again."
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        error: "This image exceeds the 5 MB limit. Please choose a smaller copy."
      };
    }

    return {
      error: null,
      contentType: expectedType
    };
  }

  async function uploadPrivateImage(file, contentType) {
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .slice(-80);

    const token =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const path = `memories/${token}-${safeName}`;

    const { data, error } = await client
      .storage
      .from("museum-photos")
      .upload(path, file, {
        contentType,
        upsert: false
      });

    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }

    return data.path || path;
  }

  async function removePrivateImage(path) {
    if (!path) return null;

    const { error } = await client
      .storage
      .from("museum-photos")
      .remove([path]);

    return error || null;
  }

  async function showCurrentImage(path, altText) {
    currentImage.replaceChildren();

    if (!path) return;

    const label = createTextElement(
      "p",
      "admin-memory-help",
      "Current image. It will stay unless you upload a replacement."
    );

    currentImage.appendChild(label);

    const { data, error } = await client
      .storage
      .from("museum-photos")
      .createSignedUrl(path, 300);

    if (error || !data || !data.signedUrl) {
      currentImage.appendChild(
        createTextElement(
          "p",
          "admin-memory-help",
          "Preview unavailable. The saved image path has not been changed."
        )
      );
      return;
    }

    const image = document.createElement("img");
    image.src = data.signedUrl;
    image.alt = altText || "Current memory image preview";
    image.loading = "lazy";
    image.decoding = "async";

    currentImage.appendChild(image);
  }

  function resetEditor() {
    form.reset();
    fields.id.value = "";
    fields.sortOrder.value = "0";
    if (fields.featured) {
      fields.featured.checked = false;
    }
    currentImage.replaceChildren();
    saveButton.textContent = "Save memory";
  }

  async function editMemory(memory) {
    form.reset();

    fields.id.value = memory.id;
    fields.title.value = memory.title || "";
    fields.caption.value = memory.caption || "";
    fields.body.value = memory.body || "";
    fields.collection.value = memory.collection || "gallery";
    fields.postType.value =
      memory.post_type ||
      (memory.collection === "letters" ? "letter" : "photo");
    fields.date.value = memory.memory_date || "";
    fields.altText.value = memory.alt_text || "";
    fields.sortOrder.value = String(memory.sort_order ?? 0);
    fields.published.checked = Boolean(memory.is_published);
    if (fields.featured) {
      fields.featured.checked = Boolean(memory.is_featured);
    }
    fields.image.value = "";

    saveButton.textContent = "Update memory";

    await showCurrentImage(memory.image_path, memory.alt_text);

    setStatus(
      `Editing "${memory.title}". Save your changes when ready.`,
      "info"
    );

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deleteMemory(memory) {
    const confirmed = window.confirm(
      `Delete "${memory.title}" permanently? This cannot be undone.`
    );

    if (!confirmed) return;

    setStatus("Deleting memory…");
    const oldLabel = memory.title;

    const { data, error } = await client
      .from("museum_memories")
      .delete()
      .eq("id", memory.id)
      .select("id")
      .maybeSingle();

    if (error) {
      setStatus(`Could not delete the memory: ${error.message}`, "error");
      return;
    }

    if (!data) {
      setStatus(
        "No memory was deleted. Refresh the archive and try again.",
        "error"
      );
      return;
    }

    let cleanupError = null;

    if (memory.image_path) {
      cleanupError = await removePrivateImage(memory.image_path);
    }

    if (fields.id.value === memory.id) {
      resetEditor();
    }

    await loadMemories();

    if (cleanupError) {
      setStatus(
        `Memory "${oldLabel}" was deleted, but its image could not be removed. Check Storage before trying again. ${cleanupError.message}`,
        "error"
      );
    } else {
      setStatus(`Memory "${oldLabel}" was deleted.`, "success");
    }
  }

  function makeActionButton(label, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;

    if (className) button.className = className;

    button.addEventListener("click", action);
    return button;
  }

  function renderMemories() {
    memoryList.replaceChildren();

    if (memories.length === 0) {
      memoryList.appendChild(
        createTextElement(
          "p",
          "admin-memory-help",
          "No memories saved yet. Create your first memory above."
        )
      );
      return;
    }

    for (const memory of memories) {
      const card = document.createElement("article");
      card.className = "admin-memory-item";

      const top = document.createElement("div");
      top.className = "admin-memory-item__top";

      const heading = document.createElement("div");

      heading.appendChild(
        createTextElement("h4", "", memory.title)
      );

      const details = [
        COLLECTION_NAMES[memory.collection] || "Memory",
        POST_TYPE_NAMES[memory.post_type] || "Photo Memory",
        formatDate(memory.memory_date),
        `Order: ${memory.sort_order ?? 0}`,
        memory.is_featured ? "Featured" : ""
      ].filter(Boolean).join(" · ");

      heading.appendChild(
        createTextElement(
          "p",
          "admin-memory-item__details",
          details
        )
      );

      const badge = createTextElement(
        "span",
        memory.is_published
          ? "admin-memory-badge admin-memory-badge--published"
          : "admin-memory-badge",
        memory.is_published ? "Published" : "Hidden"
      );

      top.append(heading, badge);
      card.appendChild(top);

      if (memory.caption) {
        card.appendChild(
          createTextElement(
            "p",
            "admin-memory-item__details",
            memory.caption
          )
        );
      }

      const actions = document.createElement("div");
      actions.className = "admin-memory-item__actions";

      actions.appendChild(
        makeActionButton("Edit", "", () => editMemory(memory))
      );

      actions.appendChild(
        makeActionButton("Delete", "admin-memory-delete", () =>
          deleteMemory(memory)
        )
      );

      card.appendChild(actions);
      memoryList.appendChild(card);
    }
  }

  async function loadMemories() {
    const { data, error } = await client
      .from("museum_memories")
      .select(
        "id, title, caption, body, collection, post_type, memory_date, image_path, alt_text, sort_order, is_published, is_featured, created_at, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`Could not load memories: ${error.message}`, "error");
      return false;
    }

    memories = data || [];
    renderMemories();
    return true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    saveButton.disabled = true;
    setStatus("Saving memory…");

    let uploadedPath = null;
    let databaseSaveSucceeded = false;

    try {
      const memoryId = fields.id.value.trim();
      const existingMemory =
        memories.find((item) => item.id === memoryId) || null;

      const imageFile = fields.image.files[0] || null;
      const imageValidation = validateImage(imageFile);

      if (imageValidation.error) {
        throw new Error(imageValidation.error);
      }

      if (imageFile) {
        uploadedPath = await uploadPrivateImage(
          imageFile,
          imageValidation.contentType
        );
      }

      const memoryData = {
        title: fields.title.value.trim(),
        caption: fields.caption.value.trim(),
        body: fields.body.value.trim(),
        collection: fields.collection.value,
        post_type: fields.postType.value,
        memory_date: fields.date.value || null,
        image_path:
          uploadedPath ||
          (existingMemory ? existingMemory.image_path : null),
        alt_text: fields.altText.value.trim(),
        sort_order: Number(fields.sortOrder.value || 0),
        is_published: fields.published.checked,
        is_featured: Boolean(fields.featured?.checked),
        updated_at: new Date().toISOString()
      };

      let savedMemory;
      let saveError;

      if (memoryId) {
        const result = await client
          .from("museum_memories")
          .update(memoryData)
          .eq("id", memoryId)
          .select("id")
          .maybeSingle();

        savedMemory = result.data;
        saveError = result.error;
      } else {
        const result = await client
          .from("museum_memories")
          .insert(memoryData)
          .select("id")
          .single();

        savedMemory = result.data;
        saveError = result.error;
      }

      if (saveError) {
        throw new Error(saveError.message);
      }

      if (!savedMemory) {
        throw new Error("No saved memory was returned. Refresh and try again.");
      }

      databaseSaveSucceeded = true;

      let cleanupWarning = "";

      if (
        uploadedPath &&
        existingMemory &&
        existingMemory.image_path &&
        existingMemory.image_path !== uploadedPath
      ) {
        const oldImageError = await removePrivateImage(
          existingMemory.image_path
        );

        if (oldImageError) {
          cleanupWarning =
            ` The new image was saved, but the old image could not be removed: ${oldImageError.message}`;
        }
      }

      resetEditor();

      const refreshed = await loadMemories();

      if (refreshed) {
        setStatus(
          `Memory ${memoryId ? "updated" : "created"} successfully.${cleanupWarning}`,
          cleanupWarning ? "error" : "success"
        );
      }

    } catch (error) {
      if (uploadedPath && !databaseSaveSucceeded) {
        const cleanupError = await removePrivateImage(uploadedPath);

        if (cleanupError) {
          console.error(
            "The upload failed to save to the database, and its uploaded image could not be cleaned up:",
            cleanupError
          );
        }
      }

      setStatus(`Save failed: ${error.message}`, "error");

    } finally {
      saveButton.disabled = false;

      if (!fields.id.value) {
        saveButton.textContent = "Save memory";
      } else {
        saveButton.textContent = "Update memory";
      }
    }
  });

  clearButton.addEventListener("click", () => {
    resetEditor();
    setStatus("Form cleared. Your saved memories are unchanged.", "info");
  });

  refreshButton.addEventListener("click", async () => {
    setStatus("Refreshing the archive…");

    const refreshed = await loadMemories();

    if (refreshed) {
      setStatus(
        `Archive refreshed. ${memories.length} saved ${memories.length === 1 ? "memory" : "memories"}.`,
        "success"
      );
    }
  });

  if (!(await verifyAdmin())) return;

  setStatus("Loading saved memories…");

  const loaded = await loadMemories();

  if (loaded) {
    setStatus(
      memories.length
        ? `Curator access verified. ${memories.length} saved ${memories.length === 1 ? "memory" : "memories"}.`
        : "Curator access verified. Your archive is ready for its first memory.",
      "success"
    );
  }
})();
