const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// Variables for the file name input and save button
const fileNameInput = document.getElementById("file-name-input");
const saveFileNameButton = document.getElementById("save-file-name");

let fileName = "drawing";

// Event listener for the save button
saveFileNameButton.addEventListener("click", () => {
  fileName = fileNameInput.value || "drawing";
  alert(`Your nickname is "${fileName}".`);
});  

function setWhiteBackground() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

setWhiteBackground();

const loadingContainer = document.getElementById("loading-container");
const undoButton = document.getElementById("undo-button");
const clearButton = document.getElementById("clear-button");
const exportButton = document.getElementById("export-button");
const importButton = document.getElementById("import-button");
const createImageButton = document.getElementById("create-image");
const importFileInput = document.getElementById("import-file");

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let undoStack = [];
let strokes = [];
let currentStroke = { strokeOrder: 0, pixels: [] };

function startDrawing(e) {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
  if (isDrawing) {
    strokes.push(currentStroke);
    undoStack.push(canvas.toDataURL());
  }
  isDrawing = false;
  currentStroke = { strokeOrder: currentStroke.strokeOrder + 1, pixels: [] };
}

function draw(e) {
  if (!isDrawing) return;
  let offsetX, offsetY;
  if (e.touches) {
    const rect = canvas.getBoundingClientRect();
    offsetX = e.touches[0].clientX - rect.left;
    offsetY = e.touches[0].clientY - rect.top;
  } else {
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  }
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(offsetX, offsetY);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.stroke();

  currentStroke.pixels.push({
    startX: lastX,
    startY: lastY,
    endX: offsetX,
    endY: offsetY
  });

  [lastX, lastY] = [offsetX, offsetY];
}

function undo() {
  if (undoStack.length > 0) {
    strokes.pop();
    undoStack.pop();
    currentStroke.strokeOrder--;

    setWhiteBackground(); // Reset the white background
    for (const stroke of strokes) {
      for (const pixel of stroke.pixels) {
        ctx.beginPath();
        ctx.moveTo(pixel.startX, pixel.startY);
        ctx.lineTo(pixel.endX, pixel.endY);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}

function exportJSON() {
  const exportStrokes = JSON.parse(JSON.stringify(strokes));
  let json = JSON.stringify(exportStrokes);
  let blob = new Blob([json], { type: "application/json" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;

  // Adds the chosen nick and a random 6-digit number to the file name

  const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  a.download = `${fileName}_${randomNumber}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importJSON() {
loadingContainer.style.display = "block";
const fileReader = new FileReader();
fileReader.readAsText(importFileInput.files[0], "UTF-8");
fileReader.onload = async e => {
  try {
    const importedStrokes = JSON.parse(e.target.result);
    strokes = importedStrokes;
    undoStack = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setWhiteBackground(); // Reset the white background
    currentStroke.strokeOrder = 0;
    for (const stroke of strokes) {
      for (const pixel of stroke.pixels) {
        ctx.beginPath();
        ctx.moveTo(pixel.startX, pixel.startY);
        ctx.lineTo(pixel.endX, pixel.endY);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      undoStack.push(canvas.toDataURL());
      currentStroke.strokeOrder++;
    }
  } catch (error) {
    console.error("Error parsing JSON:", error);
    alert("Invalid JSON file. Please check the input file.");
  } finally {
    loadingContainer.style.display = "none";
    importFileInput.value = ""; // Clear the file input value
  }
};
}

function createImage() {
// Creates a new canvas with white background
const newCanvas = document.createElement("canvas");
newCanvas.width = 512;
newCanvas.height = 512;
const newCtx = newCanvas.getContext("2d");
newCtx.fillStyle = "white";
newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

// Copies the existing drawing from the original canvas to the new canvas
newCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, newCanvas.width, newCanvas.height);

// Exports the new canvas as an image
const currentState = newCanvas.toDataURL("image/png");
const img = new Image();
img.src = currentState;

img.onload = () => {
  let a = document.createElement("a");
  a.href = currentState;
  a.download = "scribble.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
}

function clearCanvas() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
setWhiteBackground(); // Reset the white background
strokes = [];
undoStack = [];
currentStroke.strokeOrder = 0;
}

// Event listeners for touch support
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startDrawing(e);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  draw(e);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  stopDrawing(e);
}, { passive: false });

canvas.addEventListener("touchcancel", (e) => {
  e.preventDefault();
  stopDrawing(e);
}, { passive: false });


canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", stopDrawing);
canvas.addEventListener("touchcancel", stopDrawing);

undoButton.addEventListener("click", undo);
exportButton.addEventListener("click", exportJSON);
importButton.addEventListener("click", () => {
  importFileInput.click();
});
importFileInput.addEventListener("change", importJSON);
createImageButton.addEventListener("click", createImage);
clearButton.addEventListener("dblclick", clearCanvas);

// Ctrl+Z shortcut functionality
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") {
    undo();
  }
});
