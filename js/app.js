document.addEventListener('DOMContentLoaded', () => {
    // --- NAVEGACIÓN ENTRE PESTAÑAS ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.app-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Si salimos de la sección de cámara, apagamos el stream para liberar recursos
            if (targetId !== 'add-section') {
                stopCamera();
            }
        });
    });

    // --- GESTIÓN DE CÁMARA ---
    const videoElement = document.getElementById('camera-stream');
    const canvasElement = document.getElementById('snapshot-canvas');
    const capturedImage = document.getElementById('captured-image');
    const startCameraBtn = document.getElementById('start-camera-btn');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const retakeBtn = document.getElementById('retake-btn');
    
    let mediaStream = null;
    let capturedImageDataUrl = null;

    startCameraBtn.addEventListener('click', async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Intenta usar la cámara trasera en móviles
            });
            videoElement.srcObject = mediaStream;
            videoElement.style.display = 'block';
            capturedImage.style.display = 'none';
            
            startCameraBtn.disabled = true;
            takePhotoBtn.disabled = false;
            retakeBtn.style.display = 'none';
        } catch (error) {
            alert('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
            console.error(error);
        }
    });

    takePhotoBtn.addEventListener('click', () => {
        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;
        
        canvasElement.width = width;
        canvasElement.height = height;
        
        const context = canvasElement.getContext('2d');
        context.drawImage(videoElement, 0, 0, width, height);
        
        capturedImageDataUrl = canvasElement.toDataURL('image/png');
        
        capturedImage.src = capturedImageDataUrl;
        capturedImage.style.display = 'block';
        videoElement.style.display = 'none';

        stopCamera();

        takePhotoBtn.disabled = true;
        retakeBtn.style.display = 'inline-flex';
        startCameraBtn.disabled = false;
    });

    retakeBtn.addEventListener('click', () => {
        capturedImage.style.display = 'none';
        capturedImageDataUrl = null;
        retakeBtn.style.display = 'none';
        startCameraBtn.click(); // Vuelve a encender la cámara
    });

    function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop()); // Agregamos .forEach() y los paréntesis en (track)
        mediaStream = null;
    }
}

    // --- GUARDAR PRENDA EN LOCALSTORAGE ---
    const clothingForm = document.getElementById('clothing-form');
    const filterCategory = document.getElementById('filter-category');

    clothingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!capturedImageDataUrl) {
            alert('Por favor, toma una foto de la prenda primero.');
            return;
        }

        const category = document.getElementById('clothing-category').value;
        const color = document.getElementById('clothing-color').value.trim();
        const style = document.getElementById('clothing-style').value;

        const newClothingItem = {
            id: Date.now(),
            image: capturedImageDataUrl,
            category,
            color,
            style
        };

        // Obtener armario actual del almacenamiento local
        let wardrobe = JSON.parse(localStorage.getItem('my_wardrobe')) || [];
        wardrobe.push(newClothingItem);
        localStorage.setItem('my_wardrobe', JSON.stringify(wardrobe));

        // Limpiar formulario
        clothingForm.reset();
        capturedImage.style.display = 'none';
        capturedImageDataUrl = null;
        retakeBtn.style.display = 'none';
        
        alert('¡Prenda guardada en tu armario con éxito!');
        
        // Redirigir a la pestaña del armario para ver el resultado
        document.querySelector('[data-target="wardrobe-section"]').click();
        loadWardrobe();
    });

    // --- CARGAR Y MOSTRAR ARMARIO ---
    function loadWardrobe(filter = 'all') {
        const grid = document.getElementById('wardrobe-grid');
        const wardrobe = JSON.parse(localStorage.getItem('my_wardrobe')) || [];

        grid.innerHTML = '';

        const filteredItems = filter === 'all' 
            ? wardrobe 
            : wardrobe.filter(item => item.category === filter);

        if (filteredItems.length === 0) {
            grid.innerHTML = `<p class="empty-message">No hay prendas registradas en esta categoría.</p>`;
            return;
        }

        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'clothing-card';
            card.innerHTML = `
                <img src="${item.image}" alt="Prenda">
                <div class="clothing-info">
                    <h3>${item.category}</h3>
                    <p><strong>Color:</strong> ${item.color}</p>
                    <p><strong>Estilo:</strong> ${item.style}</p>
                </div>
                <button class="delete-btn" onclick="window.deleteClothing(${item.id})"><i class="fa-solid fa-trash"></i> Eliminar</button>
            `;
            grid.appendChild(card);
        });
    }

    filterCategory.addEventListener('change', (e) => {
        loadWardrobe(e.target.value);
    });

    // Función global para eliminar prendas
    window.deleteClothing = function(id) {
        if (confirm('¿Estás seguro de eliminar esta prenda?')) {
            let wardrobe = JSON.parse(localStorage.getItem('my_wardrobe')) || [];
            wardrobe = wardrobe.filter(item => item.id !== id);
            localStorage.setItem('my_wardrobe', JSON.stringify(wardrobe));
            loadWardrobe(filterCategory.value);
        }
    };

    // --- GENERADOR DE OUTFITS CON INTELIGENCIA ARTIFICIAL (GEMINI) ---
    const generateOutfitBtn = document.getElementById('generate-outfit-btn');
    const outfitResult = document.getElementById('outfit-result');

    // CONFIGURACIÓN DE TU API KEY DE GEMINI
    // (Reemplaza 'TU_API_KEY_AQUI' por tu clave real obtenida en Google AI Studio)
    const GEMINI_API_KEY = 'TU_API_KEY_AQUI'; 

    generateOutfitBtn.addEventListener('click', async () => {
        const wardrobe = JSON.parse(localStorage.getItem('my_wardrobe')) || [];
        const occasion = document.getElementById('outfit-occasion').value;

        if (wardrobe.length === 0) {
            outfitResult.innerHTML = `<p class="empty-message">Primero debes agregar algunas prendas a tu armario.</p>`;
            return;
        }

        // Separar prendas por categoría
        const superiors = wardrobe.filter(i => i.category === 'superior');
        const inferiors = wardrobe.filter(i => i.category === 'inferior');
        const shoes = wardrobe.filter(i => i.category === 'calzado');
        const coats = wardrobe.filter(i => i.category === 'abrigos');

        if (superiors.length === 0 || inferiors.length === 0 || shoes.length === 0) {
            outfitResult.innerHTML = `<p class="empty-message" style="color: #d97706;">Para generar un outfit inteligente necesitas al menos una prenda superior, una inferior y calzado.</p>`;
            return;
        }

        // Mostrar estado de carga mientras Gemini piensa el estilo
        generateOutfitBtn.disabled = true;
        generateOutfitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Asesorando estilo...`;
        outfitResult.innerHTML = `<p class="empty-message">Analizando combinaciones y teoría del color...</p>`;

        try {
            // Preparamos un resumen del armario en texto para enviárselo a Gemini
            const wardrobeSummary = wardrobe.map((item, index) => 
                `ID: ${index}, Categoría: ${item.category}, Color: ${item.color}, Estilo: ${item.style}`
            ).join('\n');

            const prompt = `Eres un asesor de imagen y estilista profesional. El usuario necesita un outfit para la siguiente ocasión: "${occasion}".
            Aquí está la lista completa de prendas disponibles en su armario:
            ${wardrobeSummary}

            Por favor, selecciona las mejores prendas de la lista (necesitas elegir al menos una superior, una inferior y un calzado de los IDs proporcionados). Si consideras necesario un abrigo de la lista, inclúyelo también.
            Devuélveme la respuesta estrictamente en un formato JSON válido con esta estructura exacta (sin texto adicional fuera del JSON):
            {
                "selectedIds": [ID_SUPERIOR, ID_INFERIOR, ID_CALZADO],
                "advice": "Un consejo breve y motivador de por qué este estilo funciona para la ocasión y cómo combinar los colores."
            }`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            const textResponse = data.candidates[0].content.parts[0].text;
            
            // Limpiar posibles bloques de código markdown que devuelva el modelo
            const cleanJsonText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const resultJson = JSON.parse(cleanJsonText);

            // Buscar las prendas seleccionadas por Gemini en el armario
            const selectedItems = resultJson.selectedIds.map(id => wardrobe.find((_, idx) => idx === id)).filter(Boolean);

            // Renderizar resultado visual y el consejo de la IA
            outfitResult.innerHTML = `
                <div style="grid-column: 1 / -1; background: #e0e7ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h3 style="color: #4f46e5; margin-bottom: 0.5rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> Consejo del Estilista Virtual</h3>
                    <p style="color: #374151; font-size: 0.95rem; line-height: 1.4;">${resultJson.advice}</p>
                </div>
            `;

            const renderItemCard = (item) => `
                <div class="clothing-card">
                    <img src="${item.image}" alt="${item.category}">
                    <div class="clothing-info">
                        <h3>${item.category}</h3>
                        <p><strong>Color:</strong> ${item.color}</p>
                        <p><strong>Estilo:</strong> ${item.style}</p>
                    </div>
                </div>
            `;

            selectedItems.forEach(item => {
                outfitResult.innerHTML += renderItemCard(item);
            });

        } catch (error) {
            console.error("Error al conectar con Gemini:", error);
            // Plan B automático si ocurre algún error de red o parseo: selección aleatoria inteligente
            fallbackRandomOutfit(superiors, inferiors, shoes, coats, occasion);
        } finally {
            generateOutfitBtn.disabled = false;
            generateOutfitBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ¡Generar Outfit Ideal!`;
        }
    });

    // Función de respaldo por si falla la API
    function fallbackRandomOutfit(superiors, inferiors, shoes, coats, occasion) {
        const randomSuperior = superiors[Math.floor(Math.random() * superiors.length)];
        const randomInferior = inferiors[Math.floor(Math.random() * inferiors.length)];
        const randomShoes = shoes[Math.floor(Math.random() * shoes.length)];
        
        outfitResult.innerHTML = `
            <div style="grid-column: 1 / -1; background: #fef3c7; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <h3 style="color: #d97706;"><i class="fa-solid fa-triangle-exclamation"></i> Modo Local (Sin conexión a IA)</h3>
                <p>Aquí tienes una combinación rápida para la ocasión: <strong>${occasion}</strong></p>
            </div>
        `;
        
        const renderItemCard = (item, title) => `
            <div class="clothing-card">
                <img src="${item.image}" alt="${title}">
                <div class="clothing-info">
                    <h3>${title}</h3>
                    <p><strong>Color:</strong> ${item.color}</p>
                    <p><strong>Estilo:</strong> ${item.style}</p>
                </div>
            </div>
        `;

        outfitResult.innerHTML += renderItemCard(randomSuperior, 'Parte Superior');
        outfitResult.innerHTML += renderItemCard(randomInferior, 'Parte Inferior');
        outfitResult.innerHTML += renderItemCard(randomShoes, 'Calzado');
    }

    // Cargar el armario al iniciar la app
    loadWardrobe();
});