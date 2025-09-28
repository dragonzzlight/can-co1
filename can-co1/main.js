// main.js - Logique métier complète avec gestion des stocks ET catégories

import { db } from "./firebase.js";
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Variables Globales
let products = [];
let selectedDate = '';
let currentOrderProduct = null;
let currentFilter = 'all';
const CASIER_NUMBER = '046';

// Configuration des catégories
const CATEGORIES = {
    'boissons': { name: 'Boissons', icon: '🥤' },
    'snacks': { name: 'Snacks', icon: '🍿' },
    'bonbons': { name: 'Bonbons', icon: '🍭' },
    'lots': { name: 'Lots', icon: '📦' }
};

// Initialisation d'EmailJS
emailjs.init('N1IUycuxTv277ZixO');

// Fonctions d'Affichage (Rendering)
function renderProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';
    
    // Grouper les produits par catégorie
    const productsByCategory = {};
    
    // Initialiser toutes les catégories
    Object.keys(CATEGORIES).forEach(cat => {
        productsByCategory[cat] = [];
    });
    
    // Répartir les produits par catégorie
    products.forEach(product => {
        const category = product.category || 'lots';
        if (!productsByCategory[category]) {
            productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
    });
    
    // Afficher selon le filtre actuel
    if (currentFilter === 'all') {
        // Afficher toutes les catégories
        Object.keys(CATEGORIES).forEach(categoryKey => {
            if (productsByCategory[categoryKey].length > 0) {
                renderCategorySection(categoryKey, productsByCategory[categoryKey], container);
            }
        });
    } else {
        // Afficher seulement la catégorie sélectionnée
        if (productsByCategory[currentFilter] && productsByCategory[currentFilter].length > 0) {
            renderCategorySection(currentFilter, productsByCategory[currentFilter], container);
        }
    }
}

function renderCategorySection(categoryKey, categoryProducts, container) {
    const categoryInfo = CATEGORIES[categoryKey];
    
    const section = document.createElement('div');
    section.className = 'category-section';
    
    const title = document.createElement('h3');
    title.className = 'category-title';
    title.textContent = `${categoryInfo.icon} ${categoryInfo.name}`;
    
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    
    categoryProducts.forEach(product => {
        const div = document.createElement('div');
        div.className = `product-card ${!product.inStock ? 'out-of-stock' : ''}`;
        
        let priceHTML = '';
        const finalPrice = product.hasPromo ? product.pricePromo : product.priceOriginal;
        
        if (product.hasPromo && product.inStock) {
            priceHTML = `<p class="product-price-original">${product.priceOriginal.toFixed(2)} $</p>` +
                        `<p class="product-price-promo">${product.pricePromo.toFixed(2)} $</p>` +
                        `<span class="promo-badge">PROMO</span>`;
        } else {
            priceHTML = `<p class="product-price-normal">${product.priceOriginal.toFixed(2)} $</p>`;
        }
        
        const stockStatus = product.inStock ? '' : '<span class="stock-badge">RUPTURE DE STOCK</span>';
        const buttonHTML = product.inStock 
            ? `<button class="add-to-cart-btn" onclick="startOrder('${product.id}')">Ajouter au panier</button>`
            : `<button class="add-to-cart-btn disabled" disabled>Non disponible</button>`;
        
        div.innerHTML = 
            `<div class="product-image">
                <img src="assets/${product.image}" alt="${product.name}" />
                ${!product.inStock ? '<div class="out-of-stock-overlay">RUPTURE</div>' : ''}
            </div>
            <div class="product-info">
                <h3>${product.name} (${product.size})</h3>
                <p class="product-description">${product.description}</p>
                <div class="price-section">${priceHTML}${stockStatus}</div>
                ${buttonHTML}
            </div>`;
        grid.appendChild(div);
    });
    
    section.appendChild(title);
    section.appendChild(grid);
    container.appendChild(section);
}

function renderAdminProducts() {
    const list = document.getElementById('adminProductsList');
    list.innerHTML = '';
    
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'admin-product-card';
        let priceText = product.priceOriginal.toFixed(2) + '$';
        if (product.hasPromo) {
            priceText += ` → ${product.pricePromo.toFixed(2)} $`;
        }
        
        const stockStatus = product.inStock ? 'En stock' : 'Rupture';
        const stockClass = product.inStock ? 'stock-available' : 'stock-unavailable';
        const categoryInfo = CATEGORIES[product.category || 'lots'];
        
        div.innerHTML = 
            `<div class="admin-product-info">
                <img src="assets/${product.image}" alt="${product.name}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: contain;">
                <div>
                    <h4>${product.name} (${product.size})</h4>
                    <p>Catégorie: ${categoryInfo.icon} ${categoryInfo.name}</p>
                    <p>Prix: ${priceText}</p>
                    <p class="${stockClass}">Stock: ${stockStatus}</p>
                </div>
            </div>
            <div class="admin-product-actions">
                <button class="btn-stock" onclick="toggleStock('${product.id}')">${product.inStock ? 'Marquer rupture' : 'Remettre en stock'}</button>
                <button class="btn-edit" onclick="editProduct('${product.id}')">Modifier</button>
                <button class="btn-delete" onclick="deleteProduct('${product.id}')">Supprimer</button>
            </div>`;
        list.appendChild(div);
    });
}

// Fonction de filtrage par catégorie
function filterCategory(category) {
    currentFilter = category;
    
    // Mettre à jour les boutons de filtre
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Re-render les produits
    renderProducts();
}

// Fonctions Firestore (CRUD)
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            inStock: doc.data().inStock !== undefined ? doc.data().inStock : true,
            category: doc.data().category || 'lots' // Par défaut "autres" si pas de catégorie
        }));
        renderProducts();
        renderAdminProducts();
    } catch (e) {
        console.error("Erreur de chargement des produits:", e);
        alert("Problème de connexion. Veuillez rafraîchir la page.");
    }
}

async function addProduct() {
    const name = document.getElementById('adminName').value;
    const category = document.getElementById('adminCategory').value;
    const size = document.getElementById('adminSize').value;
    const price = parseFloat(document.getElementById('adminPrice').value);
    const promo = parseFloat(document.getElementById('adminPromo').value);
    const image = document.getElementById('adminImage').value;
    const description = document.getElementById('adminDescription').value;

    if (!name || !category || !size || !price || !image || !description) {
        alert("Remplissez tous les champs !");
        return;
    }

    try {
        await addDoc(collection(db, "products"), {
            name,
            category,
            size,
            priceOriginal: price,
            pricePromo: promo || price,
            description,
            image,
            hasPromo: promo && promo < price,
            inStock: true
        });
        
        alert("Produit ajouté et sauvegardé dans Firebase !");
        
        // Réinitialiser les champs
        document.getElementById('adminName').value = '';
        document.getElementById('adminCategory').value = 'boissons';
        document.getElementById('adminSize').value = '';
        document.getElementById('adminPrice').value = '';
        document.getElementById('adminPromo').value = '';
        document.getElementById('adminImage').value = '';
        document.getElementById('adminDescription').value = '';
        
        loadProducts();
    } catch (e) {
        console.error("Erreur d'ajout de produit:", e);
        alert("Erreur lors de l'ajout du produit.");
    }
}

async function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        const newPrice = prompt('Nouveau prix:', product.priceOriginal);
        const newPromo = prompt('Prix promo (vide si aucun):', product.hasPromo ? product.pricePromo : '');
        
        if (newPrice !== null) {
            const priceOriginal = parseFloat(newPrice) || product.priceOriginal;
            const pricePromo = parseFloat(newPromo) || priceOriginal;
            const hasPromo = newPromo && parseFloat(newPromo) < priceOriginal;
            
            try {
                await updateDoc(doc(db, "products", productId), {
                    priceOriginal: priceOriginal,
                    pricePromo: pricePromo,
                    hasPromo: hasPromo
                });
                
                alert('Modifié et sauvegardé dans Firebase !');
                loadProducts();
            } catch (e) {
                console.error("Erreur de modification:", e);
                alert("Erreur lors de la modification.");
            }
        }
    }
}

async function deleteProduct(productId) {
    const productToDelete = products.find(p => p.id === productId);
    
    if (productToDelete && confirm(`Supprimer ${productToDelete.name} ?`)) {
        try {
            await deleteDoc(doc(db, "products", productId));
            alert('Supprimé de la base de données !');
            loadProducts();
        } catch (e) {
            console.error("Erreur de suppression:", e);
            alert("Erreur lors de la suppression.");
        }
    }
}

async function toggleStock(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        const newStockStatus = !product.inStock;
        
        try {
            await updateDoc(doc(db, "products", productId), {
                inStock: newStockStatus
            });
            
            alert(`Stock mis à jour: ${newStockStatus ? 'En stock' : 'Rupture de stock'}`);
            loadProducts();
        } catch (e) {
            console.error("Erreur de mise à jour du stock:", e);
            alert("Erreur lors de la mise à jour du stock.");
        }
    }
}

// Fonctions de l'Interface (Modales / Commande)
function clickAdmin() {
    const password = prompt('Mot de passe admin :');
    if (password === 'admin123') {
        document.getElementById('adminPanel').style.display = 'block';
        renderAdminProducts();
    } else if (password !== null) {
        alert('Mot de passe incorrect !');
    }
}

function closeAdmin() {
    document.getElementById('adminPanel').style.display = 'none';
}

function startOrder(productId) {
    currentOrderProduct = products.find(p => p.id === productId);

    if (currentOrderProduct && currentOrderProduct.inStock) {
        const finalPrice = currentOrderProduct.hasPromo ? currentOrderProduct.pricePromo : currentOrderProduct.priceOriginal;
        
        const confirmed = confirm(`ATTENTION - PAIEMENT EN ESPECES\n\n` +
            `Quand vous allez commander, vous devrez vous présenter avec l'argent EN ESPECES au casier ${CASIER_NUMBER}.\n\n` +
            `AUCUN paiement sur le site\n` +
            `Apportez exactement ${finalPrice.toFixed(2)} $ en monnaie\n\n` +
            `Voulez-vous continuer et choisir votre date ?`);
        
        if (confirmed) {
            document.getElementById('dateModal').style.display = 'block';
        }
    } else {
        alert('Ce produit n\'est actuellement pas disponible.');
    }
}

function closeDateModal() {
    document.getElementById('dateModal').style.display = 'none';
}

function confirmDate() {
    const dateInput = document.getElementById('dateInput');
    if (dateInput.value) {
        selectedDate = dateInput.value;
        const formattedDate = new Date(selectedDate).toLocaleDateString('fr-FR');
        
        document.getElementById('timeModalTitle').textContent = `Choisir votre horaire pour le ${formattedDate}`;
        document.getElementById('dateModal').style.display = 'none';
        document.getElementById('timeModal').style.display = 'block';
    } else {
        alert('Veuillez sélectionner une date !');
    }
}

function closeTimeModal() {
    document.getElementById('timeModal').style.display = 'none';
    clearTimeSelection();
}

function clearTimeSelection() {
    const options = document.querySelectorAll('.time-option');
    options.forEach(option => option.classList.remove('selected'));
}

function selectTime(meetingTime) {
    const options = document.querySelectorAll('.time-option');
    options.forEach(option => option.classList.remove('selected'));
    
    event.target.closest('.time-option').classList.add('selected');
    
    setTimeout(() => {
        const firstName = prompt(`Pour finaliser votre commande au ${meetingTime}, veuillez entrer votre prénom :`);
        
        if (firstName && firstName.trim() !== '') {
            const cleanFirstName = firstName.trim();
            document.getElementById('timeModal').style.display = 'none';
            showNotification(meetingTime, cleanFirstName, selectedDate);
            sendEmailNotification(meetingTime, cleanFirstName, selectedDate);
        } else {
            alert('Commande annulée - Le prénom est obligatoire.');
            clearTimeSelection();
        }
    }, 500);
}

// Fonctions de notification / Email
function showNotification(meetingTime, firstName, date) {
    const notif = document.getElementById('notification');
    const messageElement = document.getElementById('notifMessage');
    const formattedDate = new Date(date).toLocaleDateString('fr-FR');
    const finalPrice = currentOrderProduct.hasPromo ? currentOrderProduct.pricePromo : currentOrderProduct.priceOriginal;

    messageElement.innerHTML = 
        `Merci d avoir commande chez Can&Co, <strong>${firstName}</strong>!<br>` +
        `Rendez-vous le <span class="time-highlight">${formattedDate}</span> a <span class="time-highlight">${meetingTime}</span> au <span class="casier-highlight">casier ${CASIER_NUMBER}</span>`;

    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 6000);
}

function sendEmailNotification(meetingTime, firstName, date) {
    if (!currentOrderProduct) return;
    
    const finalPrice = currentOrderProduct.hasPromo ? currentOrderProduct.pricePromo : currentOrderProduct.priceOriginal;
    const formattedDate = new Date(date).toLocaleDateString('fr-FR');
    
    const templateParams = {
        user_name: firstName,
        delivery_date: formattedDate,
        delivery_time: meetingTime,
        product_name: currentOrderProduct.name,
        price: finalPrice.toFixed(2),
        casier: CASIER_NUMBER
    };

    emailjs.send('service_rvk1gba', 'template_ile7kud', templateParams)
        .then(
            (response) => {
                console.log('Email envoyé avec succès!', response.status, response.text);
            },
            (error) => {
                console.log('Erreur envoi email:', error);
                alert("Erreur lors de l'envoi de la notification par email. Veuillez informer l'administrateur.");
            },
        );
}

// Événements et Exposition Globale
window.addEventListener("load", () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').setAttribute('min', today);
    document.getElementById('dateInput').value = today;
    
    loadProducts();
});

// Rendre les fonctions accessibles aux événements onclick du HTML
window.clickAdmin = clickAdmin;
window.closeAdmin = closeAdmin;
window.addProduct = addProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleStock = toggleStock;
window.startOrder = startOrder;
window.closeDateModal = closeDateModal;
window.confirmDate = confirmDate;
window.closeTimeModal = closeTimeModal;
window.selectTime = selectTime;

window.filterCategory = filterCategory;
