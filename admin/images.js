let imagePresets = {};
let cropper = null;
let cropCallback = null;
let cropPreset = null;

async function loadImagePresets() {
  if (Object.keys(imagePresets).length) return imagePresets;
  const data = await fetch("/api/admin/image-presets").then((r) => r.json());
  imagePresets = data.presets || {};
  return imagePresets;
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

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl, preset: cropPreset })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");

  document.getElementById("crop-modal").classList.add("hidden");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  if (cropCallback) cropCallback(data.url, data);
  if (window.showToast) window.showToast(`Image uploaded (${data.sizeKB} KB, compressed)`);
  cropCallback = null;
}

function createImageField(label, value, presetId, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "image-upload-field";

  const preview = document.createElement("div");
  preview.className = "image-preview-box";
  if (value) {
    preview.innerHTML = `<img src="${value}" alt="Preview">`;
  } else {
    preview.innerHTML = `<span class="image-placeholder">No image</span>`;
  }

  const actions = document.createElement("div");
  actions.className = "image-upload-actions";

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn btn-secondary btn-sm";
  uploadBtn.textContent = "Upload & Crop";
  uploadBtn.onclick = () => {
    openCropModal(presetId, value, (url) => {
      onChange(url);
      preview.innerHTML = `<img src="${url}" alt="Preview">`;
    });
  };

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "image-url-input";
  urlInput.placeholder = "Or paste image URL";
  urlInput.value = value || "";
  urlInput.addEventListener("input", () => {
    onChange(urlInput.value);
    if (urlInput.value) {
      preview.innerHTML = `<img src="${urlInput.value}" alt="Preview">`;
    } else {
      preview.innerHTML = `<span class="image-placeholder">No image</span>`;
    }
  });

  actions.append(uploadBtn, urlInput);
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
});
