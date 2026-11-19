const dialog = document.querySelector("#media-dialog");
const heading = dialog.querySelector("#media-title");
const stage = dialog.querySelector(".dialog-stage");
const detail = dialog.querySelector(".media-detail");
const download = dialog.querySelector(".dialog-download");
const pager = dialog.querySelector(".media-pager");
const count = dialog.querySelector(".media-count");

let opener;
let items = [];
let activeIndex = 0;

function clearPreview() {
  const video = stage.querySelector("video");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  stage.replaceChildren();
}

function showPreview() {
  clearPreview();
  const item = items[activeIndex];
  const isVideo = item.dataset.media === "video";
  const element = document.createElement(isVideo ? "video" : "img");

  heading.textContent = item.dataset.title;
  detail.textContent = item.dataset.detail;
  download.href = item.href;
  download.setAttribute("aria-label", `Download ${item.dataset.title}`);
  dialog.classList.toggle("is-portrait", item.dataset.format === "portrait");
  pager.hidden = items.length < 2;
  count.textContent = `${activeIndex + 1} / ${items.length}`;

  if (isVideo) {
    element.controls = true;
    element.playsInline = true;
    element.setAttribute("aria-label", item.dataset.title);
  } else {
    element.alt = item.querySelector("img").alt;
  }

  element.addEventListener("error", () => {
    if (!stage.contains(element)) return;
    const message = document.createElement("p");
    message.className = "media-error";
    message.textContent = "The preview could not load. Use Download to open the file.";
    stage.replaceChildren(message);
  }, { once: true });

  stage.append(element);
  element.src = item.href;

  if (isVideo) element.play().catch(() => {});
}

function movePreview(step) {
  activeIndex = (activeIndex + step + items.length) % items.length;
  showPreview();
}

for (const link of document.querySelectorAll("[data-media]")) {
  link.addEventListener("click", event => {
    if (typeof dialog.showModal !== "function") return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    const group = link.closest("[data-media-group]");
    items = group ? [...group.querySelectorAll("[data-media]")] : [link];
    activeIndex = items.indexOf(link);
    dialog.showModal();
    showPreview();
  });
}

for (const button of pager.querySelectorAll("[data-step]")) {
  button.addEventListener("click", () => movePreview(Number(button.dataset.step)));
}

dialog.addEventListener("keydown", event => {
  if (pager.hidden || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  movePreview(event.key === "ArrowLeft" ? -1 : 1);
});

dialog.addEventListener("click", event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) {
    dialog.close();
  }
});

dialog.addEventListener("close", () => {
  clearPreview();
  opener?.focus({ preventScroll: true });
});
