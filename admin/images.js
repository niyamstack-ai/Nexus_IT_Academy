let imagePresets = {};
let cropper = null;
let cropCallback = null;
let cropPreset = null;
let mediaPickCallback = null;

async function loadImagePresets() {
  if (Object.keys(imagePresets).length) return imagePresets;
  const data = await fetch("/api/admin/image-presets").then((r) => r.json());
  imagePresets = data.presets || {};
  return imagePresets;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function uploadImageDataUrl(dataUrl, preset) {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl, preset: preset || "partnerLogo" })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

function openCropModal(presetId, currentUrl, onDone) {
  cropCallback = onDone;
  cropPreset = presetId;
  const modal = document.getElementById("crop-modal");
  const hint = document.getElementById("crop-hint");
  const preview = document.getElementById("crop-preview-img");
  const fileInput = document.getElementById("crop-file-input");

  loadImagePresets().then((presets) => {
    const p = presets[presetId] || {};
    hint.textContent = p.hint || "Adjust crop then click Upload";
    modal.classList.remove("hidden");
    preview.src = "";
    fileInput.value = "";
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });
}

function initCropper(file) {
  const preview = document.getElementById("crop-preview-img");
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.onload = () => {
      if (cropper) cropper.destroy();
      loadImagePresets().then((presets) => {
        const p = presets[cropPreset] || { aspectRatio: 1 };
        cropper = new Cropper(preview, {
          aspectRatio: Number.isFinite(p.aspectRatio) ? p.aspectRatio : NaN,
          viewMode: 1,
          dragMode: "move",
          autoCropArea: 1,
          responsive: true,
          background: false
        });
      });
    };
  };
  reader.readAsDataURL(file);
}

async function uploadCroppedImage() {
  if (!cropper || !cropPreset) return;
  const presets = await loadImagePresets();
  const p = presets[cropPreset];
  const canvasOpts = Number.isFinite(p.aspectRatio)
    ? { width: p.width, height: p.height, imageSmoothingQuality: "high" }
    : { maxWidth: p.width, maxHeight: p.height, imageSmoothingQuality: "high" };
  const canvas = cropper.getCroppedCanvas(canvasOpts);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const data = await uploadImageDataUrl(dataUrl, cropPreset);

  document.getElementById("crop-modal").classList.add("hidden");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  if (cropCallback) cropCallback(data.url, data);
  if (window.showToast) window.showToast(`Image uploaded (${data.sizeKB} KB, compressed)`);
  cropCallback = null;
}

function closeMediaLibrary() {
  document.getElementById("media-library-modal")?.classList.add("hidden");
  mediaPickCallback = null;
}

async function openMediaLibrary(onPick) {
  mediaPickCallback = onPick || null;
  const modal = document.getElementById("media-library-modal");
  const grid = document.getElementById("media-library-grid");
  if (!modal || !grid) return;
  grid.innerHTML = `<p class="card-desc">Loading…</p>`;
  modal.classList.remove("hidden");
  try {
    const res = await fetch("/api/admin/media");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load media");
    const files = data.files || [];
    if (!files.length) {
      grid.innerHTML = `<p class="card-desc">No uploaded images yet. Upload one from an image field first.</p>`;
      return;
    }
    grid.innerHTML = files
      .map(
        (f) => `<button type="button" class="media-thumb" data-media-url="${f.url.replace(/"/g, "")}" title="${f.name}">
        <img src="${f.url}" alt="${f.name}" loading="lazy">
        <span>${f.sizeKB} KB</span>
      </button>`
      )
      .join("");
    grid.querySelectorAll("[data-media-url]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.dataset.mediaUrl;
        if (mediaPickCallback) mediaPickCallback(url);
        closeMediaLibrary();
      });
    });
  } catch (err) {
    grid.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
}

function setImagePreview(box, url) {
  if (url) {
    box.innerHTML = `<img src="${url}" alt="Preview">`;
  } else {
    box.innerHTML = `<span class="image-placeholder">No image</span>`;
  }
}

function createImageField(label, value, presetId, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "image-upload-field";

  const preview = document.createElement("div");
  preview.className = "image-preview-box";
  setImagePreview(preview, value);

  const actions = document.createElement("div");
  actions.className = "image-upload-actions";

  const btnRow = document.createElement("div");
  btnRow.className = "image-btn-row";

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn btn-secondary btn-sm";

  const libraryBtn = document.createElement("button");
  libraryBtn.type = "button";
  libraryBtn.className = "btn btn-ghost btn-sm";
  libraryBtn.textContent = "Library";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn btn-ghost btn-sm";
  clearBtn.textContent = "Clear";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "image-url-input";
  urlInput.placeholder = "Or paste image URL";
  urlInput.value = value || "";

  function syncUi(url) {
    urlInput.value = url || "";
    setImagePreview(preview, url);
    uploadBtn.textContent = url ? "Replace photo" : "Upload & Crop";
    clearBtn.disabled = !url;
    clearBtn.classList.toggle("hidden", !url);
  }

  syncUi(value);

  uploadBtn.onclick = () => {
    openCropModal(presetId, urlInput.value, (url) => {
      onChange(url);
      syncUi(url);
      if (window.markDirty) window.markDirty();
    });
  };

  libraryBtn.onclick = () => {
    openMediaLibrary((url) => {
      onChange(url);
      syncUi(url);
      if (window.markDirty) window.markDirty();
      if (window.showToast) window.showToast("Image selected from library");
    });
  };

  clearBtn.onclick = () => {
    if (!confirm("Remove this image?")) return;
    onChange("");
    syncUi("");
    if (window.markDirty) window.markDirty();
  };

  urlInput.addEventListener("input", () => {
    onChange(urlInput.value);
    setImagePreview(preview, urlInput.value);
    uploadBtn.textContent = urlInput.value ? "Replace photo" : "Upload & Crop";
    clearBtn.disabled = !urlInput.value;
    clearBtn.classList.toggle("hidden", !urlInput.value);
    if (window.markDirty) window.markDirty();
  });

  btnRow.append(uploadBtn, libraryBtn, clearBtn);
  actions.append(btnRow, urlInput);
  wrap.innerHTML = `<span class="field-label">${label}</span>`;
  wrap.append(preview, actions);
  return wrap;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("crop-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) initCropper(file);
  });

  document.getElementById("crop-cancel-btn")?.addEventListener("click", () => {
    document.getElementById("crop-modal").classList.add("hidden");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropCallback = null;
  });

  document.getElementById("crop-upload-btn")?.addEventListener("click", () => {
    uploadCroppedImage().catch((err) => alert(err.message));
  });

  document.getElementById("crop-from-library-btn")?.addEventListener("click", () => {
    openMediaLibrary(async (url) => {
      try {
        const abs = url.startsWith("http") ? url : `${location.origin}${url}`;
        const res = await fetch(abs);
        const blob = await res.blob();
        const file = new File([blob], "library-image.webp", { type: blob.type || "image/webp" });
        initCropper(file);
      } catch (err) {
        alert(err.message || "Could not load library image");
      }
    });
  });

  document.getElementById("media-library-close")?.addEventListener("click", closeMediaLibrary);
  document.getElementById("media-library-modal")?.addEventListener("click", (e) => {
    if (e.target?.id === "media-library-modal") closeMediaLibrary();
  });
});

window.fileToDataUrl = fileToDataUrl;
window.uploadImageDataUrl = uploadImageDataUrl;
window.openMediaLibrary = openMediaLibrary;
window.closeMediaLibrary = closeMediaLibrary;
