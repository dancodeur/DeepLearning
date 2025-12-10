const canvas = document.getElementById('digitCanvas');
const ctx = canvas.getContext('2d');
const predictionSpan = document.getElementById('prediction');
let session;

// Configuration du dessin
ctx.lineWidth = 15; // Trait épais pour une meilleure détection
ctx.lineCap = 'round';
ctx.strokeStyle = 'white'; // Dessin en blanc sur fond noir

let isDrawing = false;

// --- 1. Gestion du dessin sur le Canvas ---

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
}

function draw(e) {
    if (!isDrawing) return;
    
    // Récupérer la position correcte de la souris/doigt
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Événements souris et tactile
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchmove', draw);

document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    predictionSpan.innerText = '-';
});

// --- 2. Chargement du modèle ONNX ---

async function loadModel() {
    try {
        // Création de la session d'inférence avec le fichier local
        session = await ort.InferenceSession.create('/model.bin');
        console.log("Modèle chargé avec succès !");
    } catch (e) {
        console.error("Impossible de charger le modèle :", e);
        alert("Erreur: Assurez-vous d'utiliser un serveur local (http-server, Live Server) et non l'ouverture directe du fichier.");
    }
}

loadModel();

// --- 3. Prétraitement et Prédiction ---

document.getElementById('predictBtn').addEventListener('click', async () => {
    if (!session) {
        alert("Le modèle n'est pas encore chargé.");
        return;
    }

    // 1. Redimensionner l'image du canvas (280x280) vers (28x28)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, 28, 28);

    // 2. Récupérer les données des pixels
    const imageData = tempCtx.getImageData(0, 0, 28, 28);
    const { data } = imageData; // Tableau RGBA [r, g, b, a, r, g, b, a...]

    // 3. Convertir en Float32Array et normaliser (0.0 à 1.0)
    // On garde seulement le canal Rouge (car c'est du noir et blanc)
    const input = new Float32Array(28 * 28);
    for (let i = 0; i < input.length; i++) {
        // data[i * 4] est le canal Rouge. On divise par 255 pour avoir entre 0 et 1
        input[i] = data[i * 4] / 255.0;
    }

    // 4. Créer le Tenseur ONNX
    // Forme standard MNIST : [Batch, Canaux, Hauteur, Largeur] -> [1, 1, 28, 28]
    const tensor = new ort.Tensor('float32', input, [1, 1, 28, 28]);

    // 5. Exécuter l'inférence
    try {
        // Note: Remplacez 'Input3' par le vrai nom de l'entrée de votre modèle si ça échoue.
        // Vous pouvez trouver ce nom en inspectant `session.inputNames`
        const feeds = {};
        feeds[session.inputNames[0]] = tensor; 
        
        const results = await session.run(feeds);
        
        // 6. Lire la sortie
        // La sortie est généralement une map de probabilités. On prend le nom de la première sortie.
        const outputData = results[session.outputNames[0]].data;
        
        // Trouver l'index de la valeur maximale (Argmax)
        const maxProb = Math.max(...outputData);
        const predictedDigit = outputData.indexOf(maxProb);

        predictionSpan.innerText = predictedDigit;

    } catch (e) {
        console.error("Erreur lors de la prédiction :", e);
    }
});