(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cache = new Map();
  let index = null;
  let blocks = [];
  let searchTimer = 0;

  function el(tag, className = "", text = undefined) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ");
  }

  async function json(path) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Could not load the monograph (${response.status}).`);
    return response.json();
  }

  async function loadSection(meta) {
    if (!cache.has(meta.id)) cache.set(meta.id, json(`../${meta.path}`));
    return cache.get(meta.id);
  }

  function findingNote(block) {
    const note = el("aside", "monograph-note");
    note.id = `note-${block.id}`;
    note.setAttribute("aria-label", "MAO annotation");
    block.findings.forEach((finding) => {
      const item = el("div", "monograph-note-item");
      item.append(el("strong", "", finding.categories.join(", ").replaceAll("_", " ")));
      item.append(el("p", "", finding.assessment));
      if (finding.minimum) item.append(el("small", "", `Minimum defensible claim: ${finding.minimum}`));
      note.append(item);
    });
    return note;
  }

  function annotateText(root, block) {
    if (!block.highlights.length) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let position = 0;
    let node;
    while ((node = walker.nextNode())) {
      const start = position;
      const end = start + node.data.length;
      nodes.push({ node, start, end });
      position = end;
    }
    if (position !== block.text.length) throw new Error(`Monograph text drift at ${block.id}.`);
    const noteId = `note-${block.id}`;
    nodes.forEach(({ node: textNode, start, end }) => {
      const overlaps = block.highlights
        .filter((span) => span.start < end && span.end > start)
        .sort((a, b) => a.start - b.start);
      if (!overlaps.length) return;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      overlaps.forEach((span) => {
        const localStart = Math.max(span.start, start) - start;
        const localEnd = Math.min(span.end, end) - start;
        if (localStart > cursor) fragment.append(document.createTextNode(textNode.data.slice(cursor, localStart)));
        const mark = el("button", "monograph-annotation", textNode.data.slice(localStart, localEnd));
        mark.type = "button";
        mark.tabIndex = 0;
        mark.setAttribute("aria-describedby", noteId);
        fragment.append(mark);
        cursor = localEnd;
      });
      if (cursor < textNode.data.length) fragment.append(document.createTextNode(textNode.data.slice(cursor)));
      textNode.replaceWith(fragment);
    });
  }

  function buildBlock(block) {
    const allowed = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "li"]);
    const node = el(allowed.has(block.tag) ? block.tag : "p", [
      "monograph-entry",
      ...block.classes,
      block.status === "red" ? "is-red" : "",
    ].filter(Boolean).join(" "));
    node.id = block.id;
    node.innerHTML = block.html;
    annotateText(node, block);
    if (block.findings.length) node.append(findingNote(block));
    return node;
  }

  function matches(block, query) {
    if (!query) return true;
    return normalize([
      block.text,
      ...block.sectionPath.map((item) => item.title),
      ...block.findings.flatMap((finding) => [finding.claim, finding.assessment, finding.minimum, ...finding.categories]),
    ].join("\u0000")).includes(query);
  }

  function filteredBlocks() {
    const status = $("monographStatus").value;
    const query = normalize($("monographSearch").value.trim());
    return blocks.filter((block) => block.render !== false && (status === "all" || block.status === "red") && matches(block, query));
  }

  function render() {
    try {
      const shown = filteredBlocks();
      const fragment = document.createDocumentFragment();
      let activeList = null;
      let activeListId = null;
      shown.forEach((block) => {
        if (block.tag === "li" && block.listId) {
          if (activeListId !== block.listId) {
            activeList = el(block.listType === "ol" ? "ol" : "ul", "monograph-list");
            fragment.append(activeList);
            activeListId = block.listId;
          }
          activeList.append(buildBlock(block));
        } else {
          activeList = null;
          activeListId = null;
          fragment.append(buildBlock(block));
        }
      });
      if (!shown.length) fragment.append(el("p", "audit-empty", "No passages match this view."));
      $("monographResults").replaceChildren(fragment);
      const chapter = $("monographChapter").value === "all"
        ? "Complete monograph"
        : index.sections.find((item) => item.id === $("monographChapter").value)?.title;
      $("monographSummary").textContent = `${chapter} · ${shown.length.toLocaleString()} passage${shown.length === 1 ? "" : "s"}`;
    } catch (error) {
      $("monographSummary").textContent = error.message;
      $("monographResults").replaceChildren(el("p", "audit-empty", "The monograph could not be displayed."));
    }
  }

  function updateChapterButtons() {
    const selected = $("monographChapter").value;
    const position = index.sections.findIndex((item) => item.id === selected);
    $("previousChapter").disabled = selected === "all" || position <= 0;
    $("nextChapter").disabled = position === index.sections.length - 1;
  }

  async function selectChapter({ scroll = true } = {}) {
    const selected = $("monographChapter").value;
    $("monographSummary").textContent = "Loading document…";
    const metas = selected === "all" ? index.sections : index.sections.filter((item) => item.id === selected);
    const data = await Promise.all(metas.map(loadSection));
    blocks = data.flatMap((section) => section.blocks);
    updateChapterButtons();
    render();
    if (scroll) $("monographResults").scrollIntoView({ block: "start" });
  }

  async function initialize() {
    try {
      index = await json("../data/monograph/index.json");
      index.sections.forEach((section) => {
        const option = el("option", "", `${section.title} · ${section.blocks.toLocaleString()} passages`);
        option.value = section.id;
        $("monographChapter").append(option);
      });
      await selectChapter({ scroll: false });
    } catch (error) {
      $("monographSummary").textContent = error.message;
      $("monographResults").replaceChildren(el("p", "audit-empty", "The monograph could not be loaded."));
    }
  }

  $("monographStatus").addEventListener("change", render);
  $("monographChapter").addEventListener("change", selectChapter);
  $("monographSearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 140);
  });
  $("previousChapter").addEventListener("click", () => {
    const position = index.sections.findIndex((item) => item.id === $("monographChapter").value);
    if (position > 0) {
      $("monographChapter").value = index.sections[position - 1].id;
      selectChapter();
    }
  });
  $("nextChapter").addEventListener("click", () => {
    const selected = $("monographChapter").value;
    const position = index.sections.findIndex((item) => item.id === selected);
    const next = selected === "all" ? index.sections[0] : index.sections[position + 1];
    if (next) {
      $("monographChapter").value = next.id;
      selectChapter();
    }
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".monograph-annotation")) return;
    document.querySelectorAll(".monograph-entry.annotation-pinned").forEach((node) => node.classList.remove("annotation-pinned"));
  });
  $("monographResults").addEventListener("click", (event) => {
    const annotation = event.target.closest?.(".monograph-annotation");
    if (!annotation) return;
    event.stopPropagation();
    annotation.closest(".monograph-entry")?.classList.toggle("annotation-pinned");
  });
  initialize();
})();
