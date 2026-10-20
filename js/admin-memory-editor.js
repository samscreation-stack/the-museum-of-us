
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
  const postStart = document.getElementById("admin-post-start");
  const makePostButton = document.getElementById("admin-make-post");
  const typePicker = document.getElementById("admin-post-type-picker");
  const typeCards = document.querySelectorAll("[data-post-type]");
  const pickerBackButton = document.getElementById("admin-post-picker-back");
  const composerBackButton = document.getElementById("admin-composer-back");
  const composerHeading = document.getElementById("admin-composer-heading");
  const composerFormatChip = document.getElementById("admin-composer-format-chip");
  const composerIntroTitle = document.getElementById("admin-composer-intro-title");
  const composerIntroDescription = document.getElementById("admin-composer-intro-description");
  const titleField = document.getElementById("memory-title-field");
  const captionField = document.getElementById("memory-caption-field");
  const bodyField = document.getElementById("memory-body-field");
  const imageField = document.getElementById("memory-image-field");
  const altField = document.getElementById("memory-alt-field");
  const imageDropzone = document.getElementById("memory-image-dropzone");
  const chooseImageButton = document.getElementById("memory-choose-image");
  const editImageButton = document.getElementById("memory-edit-image-button");
  const previewCard = document.getElementById("memory-preview-card");
  const previewImage = document.getElementById("memory-preview-image");
  const previewPlaceholder = document.getElementById("memory-preview-placeholder");
  const previewTitle = document.getElementById("memory-preview-title");
  const previewCaption = document.getElementById("memory-preview-caption");
  const previewBody = document.getElementById("memory-preview-body");
  const previewType = document.getElementById("memory-preview-type");
  const previewDate = document.getElementById("memory-preview-date");
  const draftButton = document.getElementById("memory-draft-button");
  const imageEditorDialog = document.getElementById("memory-image-editor-dialog");
  const imageEditorSource = document.getElementById("memory-image-editor-source");
  const imageEditorClose = document.getElementById("memory-image-editor-close");
  const imageEditorCancel = document.getElementById("memory-image-editor-cancel");
  const imageEditorApply = document.getElementById("memory-image-editor-apply");
  const imageEditorAspect = document.getElementById("memory-image-aspect");
  const imageEditorBrightness = document.getElementById("memory-image-brightness");
  const imageEditorContrast = document.getElementById("memory-image-contrast");
  const imageEditorBrightnessValue = document.getElementById("memory-image-brightness-value");
  const imageEditorContrastValue = document.getElementById("memory-image-contrast-value");
  const imageEditorHelp = document.getElementById("memory-image-editor-help");

  if (
    !client ||
    !form ||
    !status ||
    !memoryList ||
    !saveButton ||
    !clearButton ||
    !refreshButton ||
    !currentImage ||
    !postStart ||
    !makePostButton ||
    !typePicker ||
    !previewImage ||
    !imageEditorDialog ||
    !imageEditorSource
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
  let selectedImageFile = null;
  let imageEditorCropper = null;
  let imageEditorObjectUrl = null;
  let previewObjectUrl = null;
  let currentSavedImageUrl = null;
  let imageFileBeingEdited = null;
  let pickerReturnToComposer = false;
  let flipX = 1;
  let activeBrightness = 100;
  let activeContrast = 100;

  const TYPE_DETAILS = {
    photo: {
      name: "Photo Memory", chip: "PHOTO", heading: "Create a photo memory",
      intro: "A moment, kept well.", description: "Add the photograph and the little details around it.",
      titleLabel: "Post title", titlePlaceholder: "A day worth remembering",
      captionLabel: "Caption", captionPlaceholder: "A little detail about this memory…",
      bodyLabel: "Longer story (optional)", bodyPlaceholder: "Add a little context around this photograph…",
      previewTitle: "A moment worth keeping", previewCaption: "Your caption will appear here.",
      previewBody: "Your longer story can live here, too."
    },
    letter: {
      name: "Letter", chip: "LETTER", heading: "Write a letter",
      intro: "Words to keep close.", description: "Give the letter a title, then take your time with the words.",
      titleLabel: "Letter title", titlePlaceholder: "To the person who makes ordinary days matter",
      captionLabel: "Opening line (optional)", captionPlaceholder: "A small line to introduce the letter…",
      bodyLabel: "Letter", bodyPlaceholder: "Write your letter here…",
      previewTitle: "A letter, kept close", previewCaption: "An opening line can appear here.",
      previewBody: "Your letter will appear here, line by line."
    },
    milestone: {
      name: "Milestone", chip: "MILESTONE", heading: "Keep a milestone",
      intro: "Some dates hold a whole story.", description: "Mark the moment and add a photograph if one belongs with it.",
      titleLabel: "Milestone title", titlePlaceholder: "The day something changed",
      captionLabel: "The important detail", captionPlaceholder: "What made this moment special?",
      bodyLabel: "The story behind it (optional)", bodyPlaceholder: "Write a little more about this milestone…",
      previewTitle: "A moment that mattered", previewCaption: "The important detail will appear here.",
      previewBody: "The story behind the milestone can live here."
    },
    note: {
      name: "Short Note", chip: "NOTE", heading: "Write a short note",
      intro: "Little things deserve a place, too.", description: "Keep it brief, personal, and exactly as you want to remember it.",
      titleLabel: "Note title", titlePlaceholder: "Something I don't want to forget",
      captionLabel: "One-line summary (optional)", captionPlaceholder: "The thought in a few words…",
      bodyLabel: "Your note", bodyPlaceholder: "Write a small thought, a detail, or an inside joke…",
      previewTitle: "A little note", previewCaption: "Your short summary will appear here.",
      previewBody: "Your note will appear here."
    }
  };

  const IMAGE_POST_TYPES = new Set(["photo", "milestone"]);

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

  function revokePreviewObjectUrl() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function setPreviewImage(source, altText = "") {
    if (!source || !IMAGE_POST_TYPES.has(fields.postType.value)) {
      previewImage.removeAttribute("src");
      previewImage.alt = "";
      previewImage.hidden = true;
      previewPlaceholder.hidden = false;
      return;
    }

    previewImage.src = source;
    previewImage.alt = altText || "Post image preview";
    previewImage.hidden = false;
    previewPlaceholder.hidden = true;
  }

  function supportsImage(type = fields.postType.value) {
    return IMAGE_POST_TYPES.has(type);
  }

  async function showCurrentImage(path, altText) {
    currentImage.replaceChildren();
    currentSavedImageUrl = null;

    if (!path) {
      if (supportsImage()) setPreviewImage(previewObjectUrl || "", altText);
      return;
    }

    const label = createTextElement(
      "p",
      "admin-memory-help",
      "Saved photograph. Leave the picker empty to keep this image."
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
      if (supportsImage()) setPreviewImage(previewObjectUrl || "", altText);
      return;
    }

    currentSavedImageUrl = data.signedUrl;

    const image = document.createElement("img");
    image.src = data.signedUrl;
    image.alt = altText || "Current memory image preview";
    image.loading = "lazy";
    image.decoding = "async";
    currentImage.appendChild(image);

    if (supportsImage() && !selectedImageFile) {
      setPreviewImage(currentSavedImageUrl, altText);
      editImageButton.hidden = true;
    }
  }

  function updateLivePreview() {
    const type = fields.postType.value || "photo";
    const config = TYPE_DETAILS[type] || TYPE_DETAILS.photo;
    const title = fields.title.value.trim();
    const caption = fields.caption.value.trim();
    const body = fields.body.value.trim();
    const date = fields.date.value;

    previewCard.className = `admin-post-preview__card admin-post-preview__card--${type}`;
    previewType.textContent = config.name.toUpperCase();
    previewTitle.textContent = title || config.previewTitle;
    previewCaption.textContent = caption || config.previewCaption;
    previewBody.textContent = body || config.previewBody;
    previewDate.textContent = date ? formatDate(date) : "";
    previewCaption.hidden = type === "photo" && !caption;
    previewBody.hidden = !body;

    const imageAllowed = supportsImage(type);
    document.getElementById("memory-preview-media").hidden = !imageAllowed;
    if (!imageAllowed) return;

    if (selectedImageFile && previewObjectUrl) {
      setPreviewImage(previewObjectUrl, fields.altText.value.trim());
    } else if (currentSavedImageUrl) {
      setPreviewImage(currentSavedImageUrl, fields.altText.value.trim());
    } else {
      setPreviewImage("", fields.altText.value.trim());
    }
  }

  function applyComposerType(type) {
    const config = TYPE_DETAILS[type] || TYPE_DETAILS.photo;
    fields.postType.value = type;

    composerHeading.textContent = config.heading;
    composerFormatChip.textContent = config.chip;
    composerIntroTitle.textContent = config.intro;
    composerIntroDescription.textContent = config.description;

    document.getElementById("memory-title-label").innerHTML = `${config.titleLabel} <span>*</span>`;
    fields.title.placeholder = config.titlePlaceholder;
    document.getElementById("memory-caption-label").textContent = config.captionLabel;
    fields.caption.placeholder = config.captionPlaceholder;
    document.getElementById("memory-body-label").textContent = config.bodyLabel;
    fields.body.placeholder = config.bodyPlaceholder;
    fields.body.required = type === "letter" || type === "note";
    fields.body.rows = type === "letter" ? 10 : (type === "note" ? 5 : 7);

    // Photo posts stay focused on their image and caption; text-first posts get no image picker.
    bodyField.hidden = type === "photo" && !fields.body.value.trim();
    imageField.hidden = !supportsImage(type);
    altField.hidden = !supportsImage(type);
    titleField.classList.toggle("admin-memory-field--letter-title", type === "letter");

    if (!supportsImage(type)) {
      document.getElementById("memory-preview-media").hidden = true;
      previewImage.hidden = true;
      previewPlaceholder.hidden = true;
      editImageButton.hidden = true;
      document.getElementById("memory-image-help").textContent =
        "This is a text-first post. Photo upload and image-editing tools are intentionally hidden for this format.";
    } else {
      document.getElementById("memory-preview-media").hidden = false;
      document.getElementById("memory-image-help").textContent =
        "Crop and make small light/contrast adjustments before saving. Animated GIFs are kept as-is.";
      document.getElementById("memory-preview-media").hidden = false;
      if (selectedImageFile && !/\.gif$/i.test(selectedImageFile.name)) {
        editImageButton.hidden = false;
      }
    }

    updateLivePreview();
  }

  function openComposer(type = "photo") {
    postStart.hidden = true;
    typePicker.hidden = true;
    form.hidden = false;
    // A new post defaults to Publish; the draft action explicitly turns this off.
    if (!fields.id.value) fields.published.checked = true;
    applyComposerType(type);
  }

  function openTypePicker(returnToComposer = false) {
    pickerReturnToComposer = returnToComposer;
    postStart.hidden = true;
    form.hidden = true;
    typePicker.hidden = false;
    typePicker.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeComposerToStart() {
    form.hidden = true;
    typePicker.hidden = true;
    postStart.hidden = false;
    postStart.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeImageEditor() {
    if (imageEditorCropper) {
      imageEditorCropper.destroy();
      imageEditorCropper = null;
    }
    if (imageEditorObjectUrl) {
      URL.revokeObjectURL(imageEditorObjectUrl);
      imageEditorObjectUrl = null;
    }
    if (imageEditorDialog.open) imageEditorDialog.close();
  }

  function updateEditorImageFilter() {
    if (!imageEditorDialog) return;
    const filtered = imageEditorDialog.querySelectorAll(".cropper-container img");
    filtered.forEach((image) => {
      image.style.filter = `brightness(${activeBrightness}%) contrast(${activeContrast}%)`;
    });
    imageEditorBrightnessValue.textContent = `${activeBrightness}%`;
    imageEditorContrastValue.textContent = `${activeContrast}%`;
  }

  function isGifFile(file) {
    return Boolean(file && (file.type === "image/gif" || /\.gif$/i.test(file.name)));
  }

  function openImageEditor(file) {
    if (!file || isGifFile(file) || !window.Cropper) {
      if (!window.Cropper) {
        setStatus("Image selected. The crop tools did not load, so the original will be kept.", "info");
      }
      return;
    }

    closeImageEditor();
    imageFileBeingEdited = file;
    activeBrightness = 100;
    activeContrast = 100;
    flipX = 1;
    imageEditorAspect.value = "free";
    imageEditorBrightness.value = "100";
    imageEditorContrast.value = "100";
    imageEditorBrightnessValue.textContent = "100%";
    imageEditorContrastValue.textContent = "100%";
    imageEditorApply.disabled = false;
    imageEditorHelp.textContent = "A light touch is usually enough. Your original file isn't changed on your device.";

    imageEditorObjectUrl = URL.createObjectURL(file);
    imageEditorSource.onload = () => {
      if (imageEditorCropper) imageEditorCropper.destroy();
      imageEditorCropper = new window.Cropper(imageEditorSource, {
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.88,
        responsive: true,
        background: false,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        aspectRatio: NaN,
        guides: true,
        center: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready: updateEditorImageFilter
      });
    };
    imageEditorSource.onerror = () => {
      imageEditorHelp.textContent = "This image preview could not be opened. Keep the original image and continue.";
      imageEditorApply.disabled = true;
    };
    imageEditorSource.src = imageEditorObjectUrl;
    if (typeof imageEditorDialog.showModal === "function") imageEditorDialog.showModal();
    else setStatus("Your browser does not support the image editor dialog. The selected original is still available.", "info");
  }

  function handleImageFile(file, openEditor = true) {
    if (!file) return;
    const validation = validateImage(file);
    if (validation.error) {
      fields.image.value = "";
      selectedImageFile = null;
      revokePreviewObjectUrl();
      setPreviewImage(currentSavedImageUrl || "", fields.altText.value.trim());
      editImageButton.hidden = true;
      setStatus(validation.error, "error");
      return;
    }

    selectedImageFile = file;
    currentSavedImageUrl = null;
    revokePreviewObjectUrl();
    previewObjectUrl = URL.createObjectURL(file);
    setPreviewImage(previewObjectUrl, fields.altText.value.trim());
    editImageButton.hidden = file.type === "image/gif";
    updateLivePreview();
    setStatus("Image ready. Crop or adjust it, then review the post preview.", "info");
    if (openEditor && !isGifFile(file)) openImageEditor(file);
  }

  async function applyEditedImage() {
    if (!imageEditorCropper || !imageFileBeingEdited) {
      closeImageEditor();
      return;
    }

    imageEditorApply.disabled = true;
    imageEditorApply.textContent = "Preparing image…";

    try {
      const sourceType = imageFileBeingEdited.type;
      const outputType = sourceType === "image/png" ? "image/png" : (sourceType === "image/webp" ? "image/webp" : "image/jpeg");
      const cropped = imageEditorCropper.getCroppedCanvas({
        maxWidth: 2400,
        maxHeight: 2400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
        fillColor: sourceType === "image/png" ? "rgba(0,0,0,0)" : "#ffffff"
      });

      if (!cropped) throw new Error("The crop could not be prepared.");

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = cropped.width;
      finalCanvas.height = cropped.height;
      const context = finalCanvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the edited image.");
      if ("filter" in context) {
        context.filter = `brightness(${activeBrightness}%) contrast(${activeContrast}%)`;
      }
      context.drawImage(cropped, 0, 0);

      const blob = await new Promise((resolve, reject) => {
        finalCanvas.toBlob((result) => result ? resolve(result) : reject(new Error("The edited image could not be exported.")), outputType, 0.92);
      });
      if (blob.size > MAX_FILE_SIZE) {
        throw new Error("The edited image exceeds 5 MB. Try a tighter crop or keep the original image.");
      }
      const actualType = blob.type || outputType;
      const extension = actualType === "image/png" ? "png" : (actualType === "image/webp" ? "webp" : "jpg");
      selectedImageFile = new File([blob], `museum-edited-${Date.now()}.${extension}`, { type: actualType });

      revokePreviewObjectUrl();
      previewObjectUrl = URL.createObjectURL(selectedImageFile);
      setPreviewImage(previewObjectUrl, fields.altText.value.trim());
      editImageButton.hidden = false;
      updateLivePreview();
      closeImageEditor();
      setStatus("Image edits applied. Your original image on the device was not changed.", "success");
    } catch (error) {
      imageEditorHelp.textContent = `${error.message} Your selected original is still available.`;
      setStatus(`Couldn't apply image edits: ${error.message}`, "error");
    } finally {
      imageEditorApply.disabled = false;
      imageEditorApply.innerHTML = 'Apply edits <span aria-hidden="true">↗</span>';
    }
  }

  function resetEditor() {
    form.reset();
    fields.id.value = "";
    fields.sortOrder.value = "0";
    if (fields.featured) fields.featured.checked = false;
    currentImage.replaceChildren();
    selectedImageFile = null;
    currentSavedImageUrl = null;
    revokePreviewObjectUrl();
    closeImageEditor();
    fields.image.value = "";
    saveButton.textContent = "Publish memory ↗";
    if (draftButton) draftButton.textContent = "Save as draft";
    openComposer("photo");
    closeComposerToStart();
    updateLivePreview();
  }


  async function editMemory(memory) {
    form.reset();
    selectedImageFile = null;
    revokePreviewObjectUrl();
    currentSavedImageUrl = null;
    currentImage.replaceChildren();

    fields.id.value = memory.id;
    fields.title.value = memory.title || "";
    fields.caption.value = memory.caption || "";
    fields.body.value = memory.body || "";
    fields.collection.value = memory.collection || "gallery";
    fields.postType.value = memory.post_type || (memory.collection === "letters" ? "letter" : "photo");
    fields.date.value = memory.memory_date || "";
    fields.altText.value = memory.alt_text || "";
    fields.sortOrder.value = String(memory.sort_order ?? 0);
    fields.published.checked = Boolean(memory.is_published);
    if (fields.featured) fields.featured.checked = Boolean(memory.is_featured);
    fields.image.value = "";

    openComposer(fields.postType.value);
    if (supportsImage(fields.postType.value)) {
      await showCurrentImage(memory.image_path, memory.alt_text);
    }
    updateLivePreview();

    saveButton.textContent = memory.is_published ? "Save changes ↗" : "Publish memory ↗";
    if (draftButton) draftButton.textContent = "Save as draft";
    setStatus(`Editing “${memory.title}”. Your changes won't be saved until you choose an action below.`, "info");
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

    const isDraftSave = event.submitter
      ? event.submitter.id === "memory-draft-button"
      : !fields.published.checked;
    fields.published.checked = !isDraftSave;
    saveButton.disabled = true;
    if (draftButton) draftButton.disabled = true;
    saveButton.textContent = isDraftSave ? "Saving…" : "Publishing…";
    if (draftButton) draftButton.textContent = isDraftSave ? "Saving draft…" : "Save as draft";
    setStatus(isDraftSave ? "Saving draft…" : "Publishing memory…");

    let uploadedPath = null;
    let databaseSaveSucceeded = false;

    try {
      const memoryId = fields.id.value.trim();
      const existingMemory =
        memories.find((item) => item.id === memoryId) || null;

      const imageFile = supportsImage(fields.postType.value)
        ? (selectedImageFile || fields.image.files[0] || null)
        : null;
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
      if (draftButton) draftButton.disabled = false;
      if (fields.id.value) {
        saveButton.textContent = memories.find((item) => item.id === fields.id.value)?.is_published
          ? "Save changes ↗"
          : "Publish changes ↗";
      } else {
        saveButton.textContent = "Publish memory ↗";
      }
      if (draftButton) draftButton.textContent = "Save as draft";
    }
  });

  saveButton.addEventListener("click", () => {
    fields.published.checked = true;
  });
  if (draftButton) {
    draftButton.addEventListener("click", () => {
      fields.published.checked = false;
    });
  }

  clearButton.addEventListener("click", () => {
    resetEditor();
    setStatus("Composer cleared. Your saved memories are unchanged.", "info");
  });

  makePostButton.addEventListener("click", () => openTypePicker(false));

  typeCards.forEach((card) => {
    card.addEventListener("click", async () => {
      const type = card.dataset.postType;
      if (!TYPE_DETAILS[type]) return;
      const wasEditing = Boolean(fields.id.value);
      const firstFormatChoice = !pickerReturnToComposer && !wasEditing;
      if (firstFormatChoice && fields.collection.value === "gallery" && type === "letter") {
        fields.collection.value = "letters";
      }
      applyComposerType(type);
      openComposer(type);
      const existing = memories.find((item) => item.id === fields.id.value);
      if (supportsImage(type) && existing && existing.image_path && !selectedImageFile) {
        await showCurrentImage(existing.image_path, fields.altText.value);
      }
      if (!wasEditing) {
        // A fresh post starts with a clean body/caption when its format is selected.
        updateLivePreview();
      }
      setStatus(`${TYPE_DETAILS[type].name} composer ready. Add your details, preview it, then save or publish.`, "info");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  composerBackButton.addEventListener("click", () => openTypePicker(true));

  pickerBackButton.addEventListener("click", () => {
    if (pickerReturnToComposer) {
      typePicker.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      closeComposerToStart();
    }
  });

  [fields.title, fields.caption, fields.body, fields.date, fields.altText].forEach((field) => {
    field.addEventListener("input", updateLivePreview);
    field.addEventListener("change", updateLivePreview);
  });

  chooseImageButton.addEventListener("click", () => fields.image.click());
  fields.image.addEventListener("change", () => {
    const file = fields.image.files && fields.image.files[0];
    if (file) handleImageFile(file, true);
  });

  imageDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    imageDropzone.classList.add("is-dragging");
  });
  imageDropzone.addEventListener("dragleave", (event) => {
    if (!imageDropzone.contains(event.relatedTarget)) imageDropzone.classList.remove("is-dragging");
  });
  imageDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    imageDropzone.classList.remove("is-dragging");
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fields.image.files = transfer.files;
    } catch (_) {
      // The selected file is still processed even in browsers that block setting FileList.
    }
    handleImageFile(file, true);
  });

  editImageButton.addEventListener("click", () => {
    const file = selectedImageFile || (fields.image.files && fields.image.files[0]);
    if (file) openImageEditor(file);
  });

  document.getElementById("memory-image-rotate-left").addEventListener("click", () => imageEditorCropper && imageEditorCropper.rotate(-90));
  document.getElementById("memory-image-rotate-right").addEventListener("click", () => imageEditorCropper && imageEditorCropper.rotate(90));
  document.getElementById("memory-image-flip").addEventListener("click", () => {
    if (!imageEditorCropper) return;
    flipX *= -1;
    imageEditorCropper.scaleX(flipX);
  });
  document.getElementById("memory-image-reset").addEventListener("click", () => {
    if (imageEditorCropper) imageEditorCropper.reset();
    flipX = 1;
    activeBrightness = 100;
    activeContrast = 100;
    imageEditorBrightness.value = "100";
    imageEditorContrast.value = "100";
    updateEditorImageFilter();
  });
  imageEditorAspect.addEventListener("change", () => {
    if (!imageEditorCropper) return;
    imageEditorCropper.setAspectRatio(imageEditorAspect.value === "free" ? NaN : Number(imageEditorAspect.value));
  });
  imageEditorBrightness.addEventListener("input", () => {
    activeBrightness = Number(imageEditorBrightness.value);
    updateEditorImageFilter();
  });
  imageEditorContrast.addEventListener("input", () => {
    activeContrast = Number(imageEditorContrast.value);
    updateEditorImageFilter();
  });
  imageEditorApply.addEventListener("click", applyEditedImage);
  imageEditorCancel.addEventListener("click", closeImageEditor);
  imageEditorClose.addEventListener("click", closeImageEditor);
  imageEditorDialog.addEventListener("click", (event) => {
    if (event.target === imageEditorDialog) closeImageEditor();
  });
  imageEditorDialog.addEventListener("close", () => {
    // Native dialog Escape-key close also releases the cropper and temporary object URL.
    if (imageEditorCropper) {
      imageEditorCropper.destroy();
      imageEditorCropper = null;
    }
    if (imageEditorObjectUrl) {
      URL.revokeObjectURL(imageEditorObjectUrl);
      imageEditorObjectUrl = null;
    }
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

  closeComposerToStart();
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
