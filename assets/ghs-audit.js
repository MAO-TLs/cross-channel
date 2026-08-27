(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function el(tag, className = "", text = undefined) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function json(path) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Could not load audit dossiers (${response.status}).`);
    return response.json();
  }

  function exampleHref(example) {
    return `../script/?script=${encodeURIComponent(example.scriptId)}&compare=ghs&errors=ghs#${encodeURIComponent(example.ref)}`;
  }

  function buildExample(example) {
    const link = el("a", "audit-example audit-example-finding");
    link.href = exampleHref(example);
    const heading = el("div", "audit-example-heading");
    const labels = el("div");
    labels.append(el("span", "", "Confirmed error"), el("small", "", example.section));
    heading.append(labels, el("code", "", example.findingId));
    const japanese = el("p", "", example.japanese);
    japanese.lang = "ja";
    link.append(
      heading,
      japanese,
      el("p", "", example.ghs),
      el("small", "", example.note),
      el("b", "", "Open in script context →"),
    );
    return link;
  }

  function buildDossier(dossier) {
    const details = el("details", "audit-dossier");
    details.id = `dossier-${dossier.id}`;
    const summary = el("summary");
    const title = el("div");
    title.append(
      el("p", "audit-dossier-count", `${dossier.confirmedCount.toLocaleString()} confirmed findings · ${dossier.exampleCount} cited passages`),
      el("h3", "", dossier.title),
    );
    const toggle = el("span", "audit-dossier-toggle");
    toggle.append(el("span", "", "Open dossier"), el("span", "", "Close dossier"));
    summary.append(title, toggle);

    const body = el("div", "audit-dossier-body");
    const permalink = el("a", "audit-permalink", "Permanent link to this dossier #");
    permalink.href = `#${details.id}`;
    permalink.setAttribute("aria-label", `Link to ${dossier.title}`);
    const definition = el("dl", "audit-dossier-definition");
    [
      ["Japanese pattern", dossier.sourcePattern],
      ["George Henry Shaft effect", dossier.georgeHenryShaftEffect],
      ["Limits", dossier.limits],
    ].forEach(([label, value]) => {
      const item = el("div");
      item.append(el("dt", "", label), el("dd", "", value));
      definition.append(item);
    });
    const diagnostic = el("p", "audit-dossier-diagnostic");
    diagnostic.append(el("b", "", "Corpus diagnostic"), document.createTextNode(dossier.diagnostic));
    const examples = el("div", "audit-example-list");
    dossier.examples.forEach((example) => examples.append(buildExample(example)));
    body.append(permalink, el("p", "audit-dossier-claim", dossier.claim), definition, diagnostic, examples);
    details.append(summary, body);
    return details;
  }

  function buildGroup(group) {
    const details = el("details", "audit-group");
    details.open = true;
    const summary = el("summary");
    summary.append(
      el("span", "", group.label),
      el("small", "", `${group.dossiers.length} dossier${group.dossiers.length === 1 ? "" : "s"}`),
    );
    const list = el("div", "audit-dossier-list");
    group.dossiers.forEach((dossier) => list.append(buildDossier(dossier)));
    details.append(summary, list);
    return details;
  }

  function openHashDossier() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("dossier-")) return;
    const target = document.getElementById(id);
    if (!target) return;
    target.open = true;
    target.parentElement?.closest("details")?.setAttribute("open", "");
    target.scrollIntoView({ block: "start" });
  }

  async function initialize() {
    try {
      const data = await json("../data/ghs/dossiers.json");
      const fragment = document.createDocumentFragment();
      data.groups.forEach((group) => fragment.append(buildGroup(group)));
      $("ghsDossiers").replaceChildren(fragment);
      $("ghsDossierCount").textContent = `${data.dossierCount} dossiers · ${data.evidenceEntryCount} cited passages · ${data.uniqueEvidenceRefCount} unique source lines`;
      openHashDossier();
    } catch (error) {
      $("ghsDossierCount").textContent = error.message;
      $("ghsDossiers").replaceChildren(el("p", "audit-empty", "The dossiers could not be loaded."));
    }
  }

  window.addEventListener("hashchange", openHashDossier);
  initialize();
})();
