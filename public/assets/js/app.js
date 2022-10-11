"use strict";

const form = document.querySelector(".downloader__form");

const url = document.querySelector("#url");
const downloadBtn = document.querySelector(".url__download-btn");

const formatVideoRadio = document.querySelector("#video");
const formatVideoAudioRadio = document.querySelector("#videoaudio");
const formatAudioRadio = document.querySelector("#audio");

const qualityLowRadio = document.querySelector("#lowest");
const qualityHighRadio = document.querySelector("#highest");

const postprocessingCheckbox = document.querySelector("#postprocessing");

const customVideoSelect = document.querySelector("#customvideo");
const customAudioSelect = document.querySelector("#customaudio");
const customVideoViewSrcBtn = document.querySelector(".customvideo-btn");
const customAudioViewSrcBtn = document.querySelector(".customaudio-btn");

const customQualityCheckbox = document.querySelector("#custom");

const containerSelect = document.querySelector("#container");

const advancedOptionsFieldset = document.querySelector(".downloader__fieldset.advanced");
const advancedOptionsTrimStart = document.querySelector("#trim1");
const advancedOptionsTrimEnd = document.querySelector("#trim2");

const downloadsList = document.querySelector(".downloads__list");
const downloadsCollapseBtn = document.querySelector(".downloads__header");
const downloads = document.querySelector(".downloads");

const downloadsItems = document.getElementsByClassName("downloads__item");

const downloadsTemplate = document.querySelector("#downloads-item-template");

const downloadManager = new DownloadManager(
  form,
  {
    url,
    downloadBtn,
    downloadsTemplate,
    downloadsList,
    downloadsItems,
  },
  {
    isCustomQuality: () => customQualityCheckbox.checked,
    getDownloadInfo: () => {
      const customQuality = customQualityCheckbox.checked ? true : false;

      const format = formatAudioRadio.checked
        ? FORMATS.AUDIO
        : false || formatVideoRadio.checked
        ? FORMATS.VIDEO
        : false || formatVideoAudioRadio.checked
        ? FORMATS.VIDEOAUDIO
        : false;

      function calculateCustomQuality() {
        return {
          video: customVideoSelect.value || false,
          audio: customAudioSelect.value || false,
        };
      }

      const quality = {
        custom: customQuality,
        value: customQuality
          ? calculateCustomQuality()
          : qualityHighRadio.checked
          ? QUALITIES.HIGHEST
          : false || qualityLowRadio.checked
          ? QUALITIES.LOWEST
          : false,
      };

      const container = containerSelect.value;

      return {
        format,
        quality,
        postProcessing: postprocessingCheckbox.checked,
        container,
      };
    },
  }
);

function formatRoundMb(bytes) {
  return Math.round(((Number.EPSILON + bytes) / 1000000) * 100) / 100;
}

function formatRoundKb(bytes) {
  return Math.round(((Number.EPSILON + bytes) / 1000) * 100) / 100;
}

function handleFormatChange(e) {
  containerSelect.innerHTML = "";

  if (e.target.id === "video" || e.target.id === "videoaudio") {
    for (let i = 0; i < VIDEO_CONTAINERS.length; i++) {
      const container = VIDEO_CONTAINERS[i];

      const elem = document.createElement("option");
      elem.value = container;
      elem.classList.add("container__option");
      elem.innerText = container;

      containerSelect.appendChild(elem);
    }
  } else if (e.target.id === "audio") {
    for (let i = 0; i < AUDIO_CONTAINERS.length; i++) {
      const container = AUDIO_CONTAINERS[i];

      const elem = document.createElement("option");
      elem.value = container;
      elem.classList.add("container__option");
      elem.innerText = container;

      containerSelect.appendChild(elem);
    }
  }
}

formatVideoRadio.addEventListener("input", handleFormatChange);
formatAudioRadio.addEventListener("input", handleFormatChange);
formatVideoAudioRadio.addEventListener("input", handleFormatChange);

const qualityOptions = document.querySelector(".quality");
const customQualityOptions = document.querySelector(".custom-quality");

customQualityCheckbox.addEventListener("input", () => {
  if (customQualityCheckbox.checked) {
    qualityOptions.classList.add("disabled");
    customQualityOptions.classList.remove("disabled");
    customQualityOptions.disabled = false;
    qualityLowRadio.disabled = true;
    qualityHighRadio.disabled = true;

    downloadManager.render();
  } else {
    qualityOptions.classList.remove("disabled");
    customQualityOptions.classList.add("disabled");
    customQualityOptions.disabled = true;
    qualityLowRadio.disabled = false;
    qualityHighRadio.disabled = false;

    downloadManager.render();
  }
});

function inputSelectAllText(e) {
  e.target.select();
}

url.addEventListener("focus", inputSelectAllText);
advancedOptionsTrimStart.addEventListener("focus", inputSelectAllText);
advancedOptionsTrimEnd.addEventListener("focus", inputSelectAllText);

customVideoViewSrcBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (customVideoSelect.selectedIndex === -1) return;

  const url = customVideoSelect.options[customVideoSelect.selectedIndex].dataset.source;
  if (url) window.open(url, "_blank");
});
customAudioViewSrcBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (customAudioSelect.selectedIndex === -1) return;

  const url = customAudioSelect.options[customAudioSelect.selectedIndex].dataset.source;
  if (url) window.open(url, "_blank");
});

postprocessingCheckbox.addEventListener("input", (e) =>
  e.target.checked ? (advancedOptionsFieldset.disabled = false) : (advancedOptionsFieldset.disabled = true)
);

downloadsCollapseBtn.addEventListener("click", () => {
  downloads.classList.toggle("collapsed");
});
