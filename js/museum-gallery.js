
/* ==========================================
   PHASE 3D — SECURE COLLECTION GALLERY
========================================== */

(async function loadMuseumGallery() {
  "use strict";

  const client = window.museumSupabase;

  const grid = document.getElementById("museum-memory-grid");
  const status = document.getElementById("museum-memory-status");
  const navigation = document.getElementById("museum-collection-nav");

  if (!client || !grid || !status || !navigation) {
    console.error(
      "Museum gallery: required element or Supabase client missing."
    );
    return;
  }

  const buttons = Array.from(
    navigation.querySelectorAll("button[data-collection]")
  );

  const collectionNames = {
    all: "All memories",
    gallery: "Memory Gallery",
    timeline: "Our Story",
    letters: "Letters Archive",
    hidden: "Hidden Exhibition"
  };

  let memories = [];
  let activeCollection = "all";
  let renderVersion = 0;

  function setStatus(message) {
    status.textContent = message;
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text || "";
    return element;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  const postTypeNames = {
    photo: "Photo Memory",
    letter: "Letter",
    milestone: "Milestone",
    note: "Short Note"
  };

  function getPostType(memory) {
    if (["photo", "letter", "milestone", "note"].includes(memory.post_type)) {
      return memory.post_type;
    }

    return memory.collection === "letters" ? "letter" : "photo";
  }

  // Phase 4B.1: create the accessible memory viewer only when needed.
  let memoryDialog = null;
  let lastOpenedCard = null;

  function ensureMemoryDialog() {
    if (memoryDialog) return memoryDialog;

    const dialog = document.createElement("dialog");
    dialog.className = "museum-memory-dialog";
    dialog.setAttribute("aria-labelledby", "museum-memory-dialog-title");

    const panel = document.createElement("div");
    panel.className = "museum-memory-dialog__panel";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "museum-memory-dialog__close";
    closeButton.setAttribute("aria-label", "Close memory");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => dialog.close());

    const content = document.createElement("div");
    content.className = "museum-memory-dialog__content";

    panel.append(closeButton, content);
    dialog.appendChild(panel);

    // Clicking the dimmed area closes the viewer; clicks inside do not.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove("museum-dialog-open");
      if (lastOpenedCard && lastOpenedCard.isConnected) {
        lastOpenedCard.focus();
      }
    });

    document.body.appendChild(dialog);
    memoryDialog = dialog;
    return dialog;
  }

  async function openMemory(memory, card) {
    const dialog = ensureMemoryDialog();
    const content = dialog.querySelector(".museum-memory-dialog__content");

    const postType = getPostType(memory);

    lastOpenedCard = card;
    dialog.dataset.memoryId = String(memory.id);
    dialog.className = `museum-memory-dialog museum-memory-dialog--${postType}`;
    content.replaceChildren();

    const eyebrow = createTextElement(
      "p",
      "museum-memory-dialog__collection",
      collectionNames[memory.collection] || "Memory"
    );
    const title = createTextElement(
      "h2",
      "museum-memory-dialog__title",
      memory.title || "A moment worth keeping"
    );
    title.id = "museum-memory-dialog-title";

    const typeLabel = createTextElement(
      "p",
      "museum-memory-dialog__type",
      postTypeNames[postType]
    );

    content.append(eyebrow, typeLabel, title);

    if (!dialog.open) {
      dialog.showModal();
      document.body.classList.add("museum-dialog-open");
    }

    const date = formatDate(memory.memory_date);
    if (date) {
      content.appendChild(
        createTextElement("p", "museum-memory-dialog__date", date)
      );
    }

    if (memory.image_path && !["letter", "note"].includes(postType)) {
      const imageWrap = document.createElement("figure");
      imageWrap.className = "museum-memory-dialog__media";
      const image = document.createElement("img");
      image.alt = memory.alt_text || memory.title || "Memory photograph";
      image.loading = "eager";
      image.decoding = "async";
      imageWrap.appendChild(image);
      content.appendChild(imageWrap);

      const { data, error } = await client
        .storage
        .from("museum-photos")
        .createSignedUrl(memory.image_path, 300);

      // If the viewer was closed or another memory opened while signing,
      // do not update the wrong dialog.
      if (!dialog.open || dialog.dataset.memoryId !== String(memory.id)) return;

      if (!error && data && data.signedUrl) {
        image.src = data.signedUrl;
      } else {
        imageWrap.replaceChildren(
          createTextElement(
            "span",
            "museum-memory-dialog__image-error",
            "This photograph is temporarily unavailable."
          )
        );
        console.error("Memory viewer image could not be loaded:", error);
      }
    }

    if (memory.caption) {
      content.appendChild(
        createTextElement("p", "museum-memory-dialog__caption", memory.caption)
      );
    }

    if (memory.body) {
      content.appendChild(
        createTextElement("div", "museum-memory-dialog__body", memory.body)
      );
    }

  }

  function createPlaceholder(message = "A moment worth keeping") {
    const figure = document.createElement("figure");
    figure.className = "museum-memory-card__media";

    figure.appendChild(
      createTextElement(
        "span",
        "museum-memory-card__placeholder",
        message
      )
    );

    return figure;
  }

  async function createMemoryCard(memory) {
    const card = document.createElement("article");
    card.className = "museum-memory-card";
    const postType = getPostType(memory);

    card.classList.add(`museum-memory-card--${postType}`);
    card.dataset.postType = postType;
    card.dataset.collection = memory.collection;
    card.dataset.featured = memory.is_featured ? "true" : "false";
    card.dataset.memoryId = String(memory.id);
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.setAttribute(
      "aria-label",
      `Open memory: ${memory.title || "A moment worth keeping"}`
    );

    if (memory.image_path && !["letter", "note"].includes(postType)) {
      const figure = document.createElement("figure");
      figure.className = "museum-memory-card__media";

      const { data, error } = await client
        .storage
        .from("museum-photos")
        .createSignedUrl(memory.image_path, 300);

      if (!error && data && data.signedUrl) {
        const image = document.createElement("img");

        image.className = "museum-memory-card__image";
        image.src = data.signedUrl;
        image.alt = memory.alt_text || memory.title;
        image.loading = "lazy";
        image.decoding = "async";

        figure.appendChild(image);
      } else {
        console.error(
          "Private image could not be loaded:",
          memory.title,
          error
        );

        figure.appendChild(
          createTextElement(
            "span",
            "museum-memory-card__placeholder",
            "Image temporarily unavailable"
          )
        );
      }

      card.appendChild(figure);
    } else if (!["letter", "note"].includes(postType)) {
      card.appendChild(createPlaceholder());
    }

    const content = document.createElement("div");
    content.className = "museum-memory-card__content";

    content.appendChild(
      createTextElement(
        "p",
        "museum-memory-card__collection",
        collectionNames[memory.collection] || "Memory"
      )
    );

    if (postType !== "photo") {
      content.appendChild(
        createTextElement(
          "p",
          "museum-memory-card__type",
          postTypeNames[postType]
        )
      );
    }

    content.appendChild(
      createTextElement(
        "h3",
        "museum-memory-card__title",
        memory.title
      )
    );

    const date = formatDate(memory.memory_date);

    if (date) {
      content.appendChild(
        createTextElement(
          "p",
          "museum-memory-card__date",
          date
        )
      );
    }

    if (memory.caption) {
      content.appendChild(
        createTextElement(
          "p",
          "museum-memory-card__caption",
          memory.caption
        )
      );
    }

    if (memory.body) {
      content.appendChild(
        createTextElement(
          "p",
          "museum-memory-card__body",
          memory.body
        )
      );
    }

    card.appendChild(content);

    return card;
  }

  async function renderCollection() {
    const currentVersion = ++renderVersion;

    buttons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.collection === activeCollection)
      );
    });


    grid.replaceChildren();

    // Phase 4B.2: identify the active collection for its own styling.
    grid.dataset.collection = activeCollection;



    const selectedMemories = (
      activeCollection === "all"
        ? memories
        : memories.filter(
          (memory) => memory.collection === activeCollection
        )
    ).slice();

    // Sort Our Story from oldest to newest.
    if (activeCollection === "timeline") {
      selectedMemories.sort((a, b) => {
        if (!a.memory_date && !b.memory_date) return 0;
        if (!a.memory_date) return 1;
        if (!b.memory_date) return -1;

        return a.memory_date.localeCompare(b.memory_date);
      });
    }

    // Show featured memories first in All Memories.
    if (activeCollection === "all") {
      selectedMemories.sort((a, b) => {
        return Number(Boolean(b.is_featured)) -
          Number(Boolean(a.is_featured));
      });
    }



    if (selectedMemories.length === 0) {
      setStatus(
        activeCollection === "all"
          ? "The gallery is waiting for its first published memory."
          : `No published memories in ${collectionNames[activeCollection]} yet.`
      );
      return;
    }

    setStatus("Opening the collection…");

    const cards = await Promise.all(
      selectedMemories.map(createMemoryCard)
    );

    // Prevent an earlier render from replacing a newer selection.
    if (currentVersion !== renderVersion) return;

    grid.replaceChildren(...cards);

    const count = selectedMemories.length;
    const label = collectionNames[activeCollection];

    setStatus(
      activeCollection === "all"
        ? `${count} ${count === 1 ? "memory" : "memories"} in the archive.`
        : `${label} · ${count} ${count === 1 ? "memory" : "memories"}.`
    );
  }

  // Open memory details from mouse, Enter, or Space.
  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".museum-memory-card[data-memory-id]");
    if (!card || !grid.contains(card)) return;

    const memory = memories.find(
      (item) => String(item.id) === card.dataset.memoryId
    );
    if (memory) openMemory(memory, card);
  });

  grid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest(".museum-memory-card[data-memory-id]");
    if (!card || !grid.contains(card)) return;

    event.preventDefault();
    const memory = memories.find(
      (item) => String(item.id) === card.dataset.memoryId
    );
    if (memory) openMemory(memory, card);
  });

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const collection = button.dataset.collection;

      // A locked collection cannot be selected.
      if (button.disabled) return;

      if (
        collection !== "all" &&
        !Object.prototype.hasOwnProperty.call(
          collectionNames,
          collection
        )
      ) {
        return;
      }

      activeCollection = collection;
      await renderCollection();
    });
  });

  try {
    setStatus("Verifying museum access…");

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData.user) {
      navigation.hidden = true;
      setStatus("Please sign in to access the museum.");
      return;
    }

    const { data: profile, error: profileError } = await client
      .from("museum_profiles")
      .select("role, can_view_hidden")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "visitor"].includes(profile.role)
    ) {
      navigation.hidden = true;
      setStatus("Your museum permissions could not be verified.");
      console.error("Museum profile check failed:", profileError);
      return;
    }

    const canViewHidden =
      profile.role === "admin" ||
      (
        profile.role === "visitor" &&
        profile.can_view_hidden === true
      );

    const hiddenButton = buttons.find(
      (button) => button.dataset.collection === "hidden"
    );

    if (hiddenButton) {
      hiddenButton.disabled = !canViewHidden;

      hiddenButton.textContent = canViewHidden
        ? "Hidden Exhibition"
        : "Hidden Exhibition · Locked";

      hiddenButton.title = canViewHidden
        ? "Open the Hidden Exhibition"
        : "This collection has not been unlocked for your account.";
    }

    setStatus("Loading published memories…");

    const { data, error } = await client
      .from("museum_memories")
      .select(
        "id, title, caption, body, collection, memory_date, image_path, alt_text, sort_order, created_at, is_featured, post_type"
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("memory_date", {
        ascending: false,
        nullsFirst: false
      })
      .order("created_at", { ascending: false });

    if (error) {
      navigation.hidden = true;
      setStatus("The archive could not be loaded. Please refresh.");
      console.error("Museum memories query failed:", error);
      return;
    }

    memories = data || [];

    // Defence in depth: never show hidden memories to an unauthorized visitor.
    if (!canViewHidden) {
      memories = memories.filter(
        (memory) => memory.collection !== "hidden"
      );
    }

    await renderCollection();

  } catch (error) {
    navigation.hidden = true;
    setStatus("Something went wrong while opening the museum.");
    console.error("Museum gallery error:", error);
  }
})();
