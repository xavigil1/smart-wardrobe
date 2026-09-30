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

    // --- GENERADOR DE OUTFITS "SÁCAME DE APUROS" ---
    const generateOutfitBtn = document.getElementById('generate-outfit-btn');
    const outfitResult = document.getElementById('outfit-result');

    generateOutfitBtn.addEventListener('click', () => {
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
            outfitResult.innerHTML = `<p class="empty-message" style="color: #d97706;">Para generar un outfit necesitas al menos una prenda superior, una inferior y calzado.</p>`;
            return;
        }

        // Seleccionar aleatoriamente una prenda de cada categoría esencial
        const randomSuperior = superiors[Math.floor(Math.random() * superiors.length)];
        const randomInferior = inferiors[Math.floor(Math.random() * inferiors.length)];
        const randomShoes = shoes[Math.floor(Math.random() * shoes.length)];
        
        let randomCoat = null;
        if (coats.length > 0 && Math.random() > 0.5) {
            randomCoat = coats[Math.floor(Math.random() * coats.length)];
        }

        // Mostrar el resultado visual
        outfitResult.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 1rem;">
                <h3 style="color: #4f46e5;"><i class="fa-solid fa-sparkles"></i> ¡Outfit sugerido para ocasión: ${occasion.toUpperCase()}!</h3>
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
        if (randomCoat) {
            outfitResult.innerHTML += renderItemCard(randomCoat, 'Abrigo / Chaqueta');
        }
    });

    // Cargar el armario al iniciar la app
    loadWardrobe();
});