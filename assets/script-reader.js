(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cache = new Map();
  let index = null;
  let corpus = null;
  let searchTimer = 0;
  let corpusLimit = 100;
  const state = { script: 0, scope: "script", showShaft: false, showErrors: false };

  function el(tag, className = "", text = undefined) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ");
  }

  function compact(value) { return value.replace(/\s+/g, ""); }
  function isJapanese(value) { return /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/u.test(value); }
  function displayText(value) { return String(value || "").replaceAll("%N", "\n"); }
  function safeRef(ref) { return `ref-${ref.replace(/[^A-Za-z0-9_-]/g, "_")}`; }
  function matches(row, query) {
    if (!query) return true;
    const needle = normalize(query);
    const haystack = normalize([
      row.jp, row.en, row.speakerJa, row.speakerEn, row.ref,
      ...(row.ghs || []).map((item) => item.en),
    ].join("\u0000"));
    return haystack.includes(needle) || (isJapanese(needle) && compact(haystack).includes(compact(needle)));
  }

  function corpusHitMatches(item, query) {
    return matches(item.row, query);
  }

  function comparisonVisible() {
    return state.showShaft && (state.scope === "corpus" || Number(index?.scripts?.[state.script]?.comparisons || 0) > 0);
  }

  function updateComparisonControls() {
    const unavailable = state.scope === "script" && Number(index?.scripts?.[state.script]?.comparisons || 0) === 0;
    $("showGeorgeHenryShaft").disabled = unavailable;
    $("showGeorgeHenryShaft").checked = state.showShaft && !unavailable;
    const label = $("showGeorgeHenryShaftLabel") || $("showGeorgeHenryShaft")?.nextElementSibling;
    if (label) {
      label.textContent = unavailable
        ? "George Henry Shaft did not translate this script"
        : "Display George Henry Shaft for comparison";
    }
    $("georgeHenryShaftErrorsRow").hidden = !state.showShaft || unavailable;
  }

  async function json(path) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Could not load the script (${response.status}).`);
    return response.json();
  }

  async function loadScript(position) {
    const meta = index.scripts[position];
    if (!cache.has(meta.id)) cache.set(meta.id, json(`../${meta.path}`));
    return cache.get(meta.id);
  }

  function heading(label, speaker = "", language = "en") {
    const node = el("div", "line-cell-heading");
    const speakerNode = el("span", `speaker${language === "ja" ? " speaker-ja" : ""}`, speaker);
    speakerNode.lang = language;
    node.append(speakerNode);
    node.append(el("span", "edition-label", label));
    return node;
  }

  function displayShaftItem(item, row) {
    const raw = String(item.en || "");
    if (!row.speakerEn) return item;
    const prefix = raw.match(/^[^:\n]{1,40}:\s*/u);
    if (!prefix) return item;
    const removed = prefix[0].length;
    return {
      ...item,
      en: raw.slice(removed),
      highlights: (item.highlights || []).flatMap((span) => {
        if (!Number.isInteger(span.start) || !Number.isInteger(span.end) || span.end <= removed) return [];
        return [{ ...span, start: Math.max(0, span.start - removed), end: span.end - removed }];
      }),
    };
  }

  function paragraph(value, language) {
    const node = el("p", "", displayText(value));
    node.lang = language;
    return node;
  }

  function categoryLabel(value) {
    return String(value || "Editorial error").split("_").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  }

  function annotatedParagraph(item) {
    const text = displayText(item.en);
    const node = el("p", "todokanai-annotated-text");
    node.lang = "en";
    const spans = (item.highlights || [])
      .filter((span) => Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end > span.start && span.end <= text.length)
      .map((span) => {
        if (!span.text || text.slice(span.start, span.end) === span.text) return span;
        const candidates = [];
        let cursor = text.indexOf(span.text);
        while (cursor >= 0) {
          candidates.push(cursor);
          cursor = text.indexOf(span.text, cursor + 1);
        }
        if (!candidates.length) return null;
        const start = candidates.reduce((best, candidate) =>
          Math.abs(candidate - span.start) < Math.abs(best - span.start) ? candidate : best
        );
        return { ...span, start, end: start + span.text.length };
      })
      .filter(Boolean)
      .sort((left, right) => left.start - right.start || right.end - left.end);
    let cursor = 0;
    spans.forEach((span, spanIndex) => {
      if (span.start < cursor) return;
      if (span.start > cursor) node.append(document.createTextNode(text.slice(cursor, span.start)));
      const trigger = el("button", "todokanai-error-trigger", text.slice(span.start, span.end));
      trigger.type = "button";
      const tooltip = el("span", "todokanai-error-preview");
      tooltip.id = `ghs-error-${item.id}-${spanIndex}`;
      tooltip.setAttribute("role", "tooltip");
      tooltip.append(el("strong", "", categoryLabel(item.categories?.[0])), el("span", "", item.assessment || item.remedy || "Open the George Henry Shaft audit for details."));
      trigger.setAttribute("aria-describedby", tooltip.id);
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", () => trigger.setAttribute("aria-expanded", trigger.getAttribute("aria-expanded") === "true" ? "false" : "true"));
      trigger.append(tooltip);
      node.append(trigger);
      cursor = span.end;
    });
    if (cursor < text.length) node.append(document.createTextNode(text.slice(cursor)));
    if (!spans.length) {
      const trigger = el("button", "todokanai-error-trigger", text);
      trigger.type = "button";
      const tooltip = el("span", "todokanai-error-preview");
      tooltip.id = `ghs-error-${item.id}-0`;
      tooltip.setAttribute("role", "tooltip");
      tooltip.append(el("strong", "", categoryLabel(item.categories?.[0])), el("span", "", item.assessment || item.remedy || "Open the George Henry Shaft audit for details."));
      trigger.setAttribute("aria-describedby", tooltip.id);
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", () => trigger.setAttribute("aria-expanded", trigger.getAttribute("aria-expanded") === "true" ? "false" : "true"));
      trigger.append(tooltip);
      node.append(trigger);
    }
    return node;
  }

  function sourceVariantNotice(item, row) {
    if (item.variantDisplay?.tier !== "yellow") return null;
    const trigger = el("button", "ghs-source-variant", "Source variant");
    trigger.type = "button";
    const tooltip = el("span", "ghs-source-variant-preview");
    tooltip.id = `ghs-source-variant-${item.unitId}-${row.ref}`.replace(/[^A-Za-z0-9_-]/g, "_");
    tooltip.setAttribute("role", "tooltip");
    const japanese = el("span", "", displayText(item.variantDisplay.ghsJapanese));
    japanese.lang = "ja";
    tooltip.append(el("strong", "", "GHS Japanese"), japanese);
    trigger.setAttribute("aria-describedby", tooltip.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => trigger.setAttribute("aria-expanded", trigger.getAttribute("aria-expanded") === "true" ? "false" : "true"));
    trigger.append(tooltip);
    return trigger;
  }

  function appendShaftContent(shaft, items, row) {
    shaft.append(heading("GHS English", row.speakerEn));
    if (items?.length) {
      items.forEach((item, itemIndex) => {
        if (itemIndex) shaft.append(el("hr", "comparison-divider"));
        const displayed = displayShaftItem(item, row);
        const body = state.showErrors && displayed.verdict === "confirmed_error" ? annotatedParagraph(displayed) : paragraph(displayed.en, "en");
        if (displayed.variantDisplay?.tier === "yellow") body.classList.add("ghs-source-variant-text");
        shaft.append(body);
        const notice = sourceVariantNotice(displayed, row);
        if (notice) shaft.append(notice);
      });
    } else {
      shaft.append(el("p", "comparison-empty", "—"));
    }
  }

  function buildLine(row, target = false) {
    const showShaft = comparisonVisible();
    const classes = ["script-line"];
    if (showShaft) classes.push("script-line-comparison");
    if (state.showErrors && (row.ghs || []).some((item) => item.verdict === "confirmed_error")) classes.push("script-line-error");
    if (target) classes.push("script-line-target");
    const article = el("article", classes.join(" "));
    article.id = safeRef(row.ref);
    article.tabIndex = -1;
    article.dataset.ref = row.ref;

    const ref = el("a", "line-ref", String(row.row));
    ref.href = `#${row.ref}`;
    ref.setAttribute("aria-label", `Link to ${row.ref}`);
    ref.title = row.ref;
    const ja = el("div", "line-cell line-ja");
    if (showShaft) ja.append(heading("Japanese", row.speakerJa, "ja"));
    else ja.append(heading("", row.speakerJa, "ja"));
    ja.append(paragraph(row.jp, "ja"));
    const mao = el("div", "line-cell line-en");
    if (showShaft) mao.append(heading("MAO English", row.speakerEn));
    else mao.append(heading("", row.speakerEn));
    mao.append(paragraph(row.en, "en"));
    article.append(ref, ja, mao);

    if (showShaft) {
      const shaft = el("div", "line-cell line-en line-todokanai");
      appendShaftContent(shaft, row.ghs, row);
      article.append(shaft);
    }
    return article;
  }

  function buildSpanningGroup(rows, targetRef = "") {
    const anchor = rows[0];
    const hasError = state.showErrors && (anchor.ghs || []).some((item) => item.verdict === "confirmed_error");
    const group = el("section", `script-line-span script-line-comparison${hasError ? " script-line-error" : ""}`);
    group.dataset.ghsSpan = String(rows.length);
    group.style.setProperty("--ghs-span", String(rows.length));
    group.setAttribute("aria-label", `Grouped GHS comparison spanning ${rows.length} source rows`);

    rows.forEach((row, rowIndex) => {
      const member = el("article", `script-line-span-member${row.ref === targetRef ? " script-line-target" : ""}`);
      member.id = safeRef(row.ref);
      member.tabIndex = -1;
      member.dataset.ref = row.ref;
      member.style.setProperty("--span-row", String(rowIndex + 1));
      member.style.setProperty("--span-mobile-start", String(rowIndex * 2 + 1));

      const ref = el("a", `line-ref${rowIndex ? " span-row-after" : ""}`, String(row.row));
      ref.href = `#${row.ref}`;
      ref.setAttribute("aria-label", `Link to ${row.ref}`);
      ref.title = row.ref;
      const ja = el("div", `line-cell line-ja${rowIndex ? " span-row-after" : ""}`);
      ja.append(heading("Japanese", row.speakerJa, "ja"), paragraph(row.jp, "ja"));
      const mao = el("div", `line-cell line-en${rowIndex ? " span-row-after" : ""}`);
      mao.append(heading("MAO English", row.speakerEn), paragraph(row.en, "en"));
      member.append(ref, ja, mao);
      group.append(member);
    });

    const shaft = el("div", "line-cell line-en line-todokanai ghs-span-cell");
    appendShaftContent(shaft, anchor.ghs, anchor);
    group.append(shaft);
    return group;
  }

  function visibleScriptUnits(allRows, query) {
    const units = [];
    const byRef = new Map(allRows.map((row) => [row.ref, row]));
    const consumed = new Set();
    allRows.forEach((row) => {
      if (consumed.has(row.ref)) return;
      const renderGroup = row.ghs?.[0]?.renderGroup;
      const continuationRefs = renderGroup?.continuationRefs || [];
      if (comparisonVisible() && continuationRefs.length) {
        const groupRows = [row, ...continuationRefs.map((ref) => byRef.get(ref))].filter(Boolean);
        groupRows.forEach((groupRow) => consumed.add(groupRow.ref));
        if (!query || groupRows.some((groupRow) => matches(groupRow, query))) units.push({ rows: groupRows });
        return;
      }
      consumed.add(row.ref);
      if (matches(row, query)) units.push({ rows: [row] });
    });
    return units;
  }

  function updateNavigation() {
    $("previousScript").disabled = state.script <= 0 || state.scope === "corpus";
    $("nextScript").disabled = state.script >= index.scripts.length - 1 || state.scope === "corpus";
    $("scriptSelect").disabled = state.scope === "corpus";
    $("scriptSelect").value = String(state.script);
  }

  async function renderScript(targetRef = "") {
    if (state.scope !== "script") return;
    updateComparisonControls();
    const data = await loadScript(state.script);
    const query = $("searchInput").value.trim();
    const units = visibleScriptUnits(data.rows, query);
    const rows = units.flatMap((unit) => unit.rows);
    $("scriptTitle").textContent = `Script ${data.script}`;
    $("scriptPosition").textContent = `${rows.length.toLocaleString()}${query ? " matching" : ""} lines · script ${state.script + 1} of ${index.scripts.length}`;
    $("searchSummary").textContent = `${rows.length.toLocaleString()}${query ? " matching" : ""} line${rows.length === 1 ? "" : "s"}`;
    const fragment = document.createDocumentFragment();
    units.forEach((unit) => {
      if (comparisonVisible() && unit.rows.length > 1) fragment.append(buildSpanningGroup(unit.rows, targetRef));
      else fragment.append(buildLine(unit.rows[0], unit.rows[0].ref === targetRef));
    });
    $("scriptRows").replaceChildren(fragment);
    $("scriptRows").classList.add("compact");
    updateNavigation();
    if (targetRef) {
      const target = document.getElementById(safeRef(targetRef));
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    }
  }

  async function loadCorpus() {
    if (corpus) return corpus;
    $("searchSummary").textContent = "Searching every script…";
    const chunks = await Promise.all(index.scripts.map((_, position) => loadScript(position)));
    corpus = chunks.flatMap((chunk, scriptPosition) => {
      const byRef = new Map(chunk.rows.map((row) => [row.ref, row]));
      return chunk.rows.map((row) => {
        const anchor = row.ghsContinuation ? byRef.get(row.ghsContinuation.anchorRef) : null;
        return {
          row,
          scriptPosition,
          script: chunk.script,
          comparator: row.ghs?.length ? row.ghs : (anchor?.ghs || []),
        };
      });
    });
    return corpus;
  }

  async function renderCorpus() {
    if (state.scope !== "corpus") return;
    const query = $("searchInput").value.trim();
    $("corpusResults").replaceChildren();
    if (query.length < 2) {
      $("corpusPrompt").hidden = false;
      $("showMore").hidden = true;
      $("searchSummary").textContent = "Enter at least two characters";
      return;
    }
    const all = await loadCorpus();
    const hits = all.filter((item) => corpusHitMatches(item, query));
    const visible = hits.slice(0, corpusLimit);
    $("corpusPrompt").hidden = true;
    $("searchSummary").textContent = `${hits.length.toLocaleString()} matching lines across ${new Set(hits.map((hit) => hit.script)).size.toLocaleString()} scripts`;
    const fragment = document.createDocumentFragment();
    visible.forEach((hit) => {
      const card = el("article", "concordance-hit");
      const button = el("button", "concordance-hit-link concordance-hit-button");
      button.type = "button";
      button.append(
        el("span", "", `Final Complete · Script ${hit.script} · Line ${hit.row.row.toLocaleString()}`),
        el("code", "", hit.row.ref),
        el("strong", "", "Open in script →"),
      );
      button.addEventListener("click", () => {
        state.script = hit.scriptPosition;
        state.scope = "script";
        $("scopeCurrent").checked = true;
        $("scopeAll").checked = false;
        $("searchInput").value = "";
        $("currentScriptView").hidden = false;
        $("corpusView").hidden = true;
        renderScript(hit.row.ref);
      });
      const grid = el("div", state.showShaft ? "concordance-hit-grid comparison-grid" : "concordance-hit-grid");
      const ja = el("div", "line-cell line-ja");
      if (state.showShaft) ja.append(heading("Japanese", hit.row.speakerJa, "ja"));
      else ja.append(heading("", hit.row.speakerJa, "ja"));
      ja.append(paragraph(hit.row.jp, "ja"));
      const mao = el("div", "line-cell line-en");
      if (state.showShaft) mao.append(heading("MAO English", hit.row.speakerEn));
      else mao.append(heading("", hit.row.speakerEn));
      mao.append(paragraph(hit.row.en, "en"));
      grid.append(ja, mao);
      if (state.showShaft) {
        const items = hit.comparator || [];
        const shaft = el("div", "line-cell line-en line-todokanai");
        appendShaftContent(shaft, items, hit.row);
        if (state.showErrors && items.some((item) => item.verdict === "confirmed_error")) card.classList.add("concordance-hit-error");
        grid.append(shaft);
      }
      card.append(button, grid);
      fragment.append(card);
    });
    $("corpusResults").append(fragment);
    $("showMore").hidden = visible.length >= hits.length;
    $("showMoreCount").textContent = `${visible.length.toLocaleString()} of ${hits.length.toLocaleString()}`;
  }

  async function render() {
    try {
      if (state.scope === "script") await renderScript();
      else await renderCorpus();
    } catch (error) {
      $("searchSummary").textContent = error.message;
    }
  }

  function setScope(scope) {
    state.scope = scope;
    corpusLimit = 100;
    $("searchLabel").textContent = "Search";
    $("currentScriptView").hidden = scope !== "script";
    $("corpusView").hidden = scope !== "corpus";
    updateComparisonControls();
    updateNavigation();
    render();
  }

  async function initialize() {
    try {
      index = await json("../data/script/index.json");
      index.scripts.forEach((script, position) => {
        const option = el("option", "", `${String(position + 1).padStart(3, "0")} · ${script.id} · ${script.rows.toLocaleString()} lines`);
        option.value = String(position);
        $("scriptSelect").append(option);
      });
      const url = new URL(window.location.href);
      const requestedScript = url.searchParams.get("script");
      const requestedPosition = index.scripts.findIndex((item) => item.id === requestedScript);
      if (requestedPosition >= 0) state.script = requestedPosition;
      state.showShaft = url.searchParams.get("compare") === "ghs";
      state.showErrors = state.showShaft && url.searchParams.get("errors") === "ghs";
      updateComparisonControls();
      $("showGeorgeHenryShaftErrors").checked = state.showErrors;
      const targetRef = decodeURIComponent(window.location.hash.slice(1));
      await renderScript(targetRef);
    } catch (error) {
      $("browserHeading").classList.remove("sr-only");
      $("browserHeading").textContent = error.message;
      $("searchSummary").textContent = "Reader unavailable";
    }
  }

  $("scriptSelect").addEventListener("change", () => { state.script = Number($("scriptSelect").value); renderScript(); });
  $("previousScript").addEventListener("click", () => { state.script = Math.max(0, state.script - 1); renderScript(); });
  $("nextScript").addEventListener("click", () => { state.script = Math.min(index.scripts.length - 1, state.script + 1); renderScript(); });
  $("scopeCurrent").addEventListener("change", () => setScope("script"));
  $("scopeAll").addEventListener("change", () => setScope("corpus"));
  $("searchInput").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 140); });
  $("showGeorgeHenryShaft").addEventListener("change", async () => {
    state.showShaft = $("showGeorgeHenryShaft").checked;
    $("georgeHenryShaftErrorsRow").hidden = !state.showShaft;
    if (!state.showShaft) {
      state.showErrors = false;
      $("showGeorgeHenryShaftErrors").checked = false;
    }
    if (state.showShaft && !index.scripts[state.script].comparisons) {
      const firstComparison = index.scripts.findIndex((item) => item.comparisons > 0);
      if (firstComparison >= 0) state.script = firstComparison;
    }
    if (state.showShaft && state.scope === "script") {
      const data = await loadScript(state.script);
      const firstComparedRow = data.rows.find((row) => row.ghs?.length);
      await renderScript(firstComparedRow?.ref || "");
    } else {
      render();
    }
  });
  $("showGeorgeHenryShaftErrors").addEventListener("change", () => {
    state.showErrors = $("showGeorgeHenryShaftErrors").checked;
    render();
  });
  $("showMore").addEventListener("click", () => { corpusLimit += 100; renderCorpus(); });
  initialize();
})();
