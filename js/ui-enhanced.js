/**
 * GéoWeb Kaffrine - Interface Utilisateur Améliorée
 * Fichier séparé pour les fonctionnalités UI/UX
 * Séparé du code qgis2web pour une meilleure maintenabilité
 */

// ============================================
// ALIAS DE FONCTIONS - TERMES UTILISATEURS
// ============================================

// Fonctions conviviales pour les utilisateurs
function afficherCouches() {
    toggleLeftPanel();
}

function afficherLegende() {
    toggleRightPanel();
}

function rechercherSurLaCarte() {
    showSpatialQuery();
}

function rechercherParAttribut() {
    showAttributeQuery();
}

function mesurerDistance() {
    toggleMeasure();
}

function exporterDonnees() {
    // Ouvrir le menu déroulant d'export
    const dropdown = document.querySelector('.navbar-menu .dropdown:nth-child(5) .dropdown-toggle');
    if (dropdown) dropdown.click();
}

function voirInformations() {
    showAbout();
}

function changerFondDeCarte() {
    // Ouvrir le panneau droit pour les fonds de carte
    toggleRightPanel();
}

function localiserMaPosition() {
    locateUser();
}

function voirVueComplete() {
    resetZoom();
}

// Alias pour les fonctions de requête plus explicites
function trouverEcolesProches() {
    showSpatialQuery();
    // Pré-sélectionner les options appropriées
    setTimeout(() => {
        const targetLayer = document.getElementById('spatialTargetLayer');
        if (targetLayer) {
            targetLayer.value = 'Ecoles';
            setSpatialQueryType('buffer');
        }
    }, 100);
}

function chercherLocaliteParNom() {
    showAttributeQuery();
    // Pré-sélectionner les options appropriées
    setTimeout(() => {
        const layerSelect = document.getElementById('attrLayerSelect');
        if (layerSelect) {
            layerSelect.value = 'Localites';
            updateAttrFields();
        }
    }, 100);
}

function analyserRegion() {
    showSpatialQuery();
    // Pré-sélectionner les options appropriées
    setTimeout(() => {
        const targetLayer = document.getElementById('spatialTargetLayer');
        if (targetLayer) {
            targetLayer.value = 'Departement';
            setSpatialQueryType('buffer');
        }
    }, 100);
}

// ============================================
// GESTION DES ACTIONS RAPIDES
// ============================================
function toggleQuickActions() {
    const quickActions = document.getElementById('quickActions');
    const toggle = document.querySelector('.quick-actions-toggle');
    
    if (quickActions.classList.contains('visible')) {
        quickActions.classList.remove('visible');
        toggle.classList.remove('active');
        toggle.innerHTML = '<i class="fas fa-rocket"></i>';
    } else {
        quickActions.classList.add('visible');
        toggle.classList.add('active');
        toggle.innerHTML = '<i class="fas fa-times"></i>';
    }
}

// ============================================
// AUTO-COMPLÉTION POUR REQUÊTES ATTRIBUTAIRES
// ============================================
let autocompleteData = {};
let currentAutocomplete = null;

function initAutocomplete() {
    // Précharger les données uniques pour chaque champ
    const layers = ['Ecoles', 'Localites', 'Departement', 'Arrondissement'];
    
    layers.forEach(layerName => {
        if (geojsonData[layerName]) {
            autocompleteData[layerName] = {};
            
            geojsonData[layerName].features.forEach(feature => {
                Object.keys(feature.properties).forEach(field => {
                    if (!autocompleteData[layerName][field]) {
                        autocompleteData[layerName][field] = new Set();
                    }
                    const value = feature.properties[field];
                    if (value !== null && value !== undefined) {
                        autocompleteData[layerName][field].add(String(value));
                    }
                });
            });
            
            // Convertir les Sets en arrays triés
            Object.keys(autocompleteData[layerName]).forEach(field => {
                autocompleteData[layerName][field] = Array.from(autocompleteData[layerName][field])
                    .filter(val => val && val.trim() !== '')
                    .sort();
            });
        }
    });
}

function setupAutocomplete(inputId, layerName, fieldName) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        
        if (value.length < 2) {
            closeAutocomplete();
            return;
        }
        
        if (!autocompleteData[layerName] || !autocompleteData[layerName][fieldName]) {
            closeAutocomplete();
            return;
        }
        
        const suggestions = autocompleteData[layerName][fieldName].filter(item => 
            item.toLowerCase().includes(value)
        ).slice(0, 10); // Limiter à 10 suggestions
        
        if (suggestions.length > 0) {
            showAutocomplete(suggestions, input);
        } else {
            closeAutocomplete();
        }
    });
    
    input.addEventListener('blur', function() {
        setTimeout(closeAutocomplete, 200); // Délai pour permettre le clic sur une suggestion
    });
}

function showAutocomplete(suggestions, input) {
    closeAutocomplete();
    
    const container = document.createElement('div');
    container.className = 'autocomplete-list';
    container.id = 'autocomplete-list';
    
    suggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = suggestion;
        item.addEventListener('click', function() {
            input.value = suggestion;
            closeAutocomplete();
        });
        item.addEventListener('mouseenter', function() {
            document.querySelectorAll('.autocomplete-item').forEach(el => el.classList.remove('selected'));
            this.classList.add('selected');
        });
        container.appendChild(item);
    });
    
    // Insérer après l'input parent
    const parent = input.parentElement;
    if (parent.classList.contains('autocomplete-container')) {
        parent.appendChild(container);
    } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-container';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(container);
    }
}

function closeAutocomplete() {
    const list = document.getElementById('autocomplete-list');
    if (list) {
        list.remove();
    }
}

function updateAttrFieldsWithAutocomplete() {
    const layerSelect = document.getElementById('attrLayerSelect');
    const fieldSelect = document.getElementById('attributeField');
    const valueInput = document.getElementById('attributeValue');
    
    if (!layerSelect || !fieldSelect || !valueInput) return;
    
    const layerName = layerSelect.value;
    const fieldName = fieldSelect.value;
    
    // Configurer l'auto-complétion pour l'input de valeur
    if (layerName && fieldName) {
        setupAutocomplete('attributeValue', layerName, fieldName);
    }
}

// ============================================
// INITIALISATION UI
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser l'auto-complétion
    initAutocomplete();
    
    // Fermer les actions rapides au clic sur la carte
    setTimeout(() => {
        if (typeof map !== 'undefined') {
            map.on('click', function() {
                const quickActions = document.getElementById('quickActions');
                const toggle = document.querySelector('.quick-actions-toggle');
                
                if (quickActions && quickActions.classList.contains('visible')) {
                    quickActions.classList.remove('visible');
                    toggle.classList.remove('active');
                    toggle.innerHTML = '<i class="fas fa-rocket"></i>';
                }
            });
        }
    }, 1000);
});

// ============================================
// UTILITAIRES UI
// ============================================

// Fonction pour afficher des notifications utilisateur
function afficherNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-suppression après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Fonction pour confirmer les actions utilisateur
function confirmerAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Export des fonctions pour utilisation globale
window.GeoWebUI = {
    afficherCouches,
    afficherLegende,
    rechercherSurLaCarte,
    rechercherParAttribut,
    mesurerDistance,
    exporterDonnees,
    voirInformations,
    changerFondDeCarte,
    localiserMaPosition,
    voirVueComplete,
    trouverEcolesProches,
    chercherLocaliteParNom,
    analyserRegion,
    toggleQuickActions,
    afficherNotification,
    confirmerAction
};
