/**
 * GéoWeb Kaffrine - Module d'analyse de réseau (itinéraire)
 * Fonctionnalité de calcul d'itinéraire avec Leaflet Routing Machine
 * Séparé du code qgis2web pour une meilleure maintenabilité
 */

// ============================================
// VARIABLES GLOBALES POUR LE ROUTAGE
// ============================================
var routingControl = null;
var routingMode = false;
var startMarker = null;
var endMarker = null;
var routingClickHandler = null;

// Icônes personnalisées pour les points de départ/arrivée
var startIcon, endIcon;

// Initialiser les icônes quand Leaflet est disponible
function initRoutingIcons() {
    if (typeof L !== 'undefined' && L.divIcon) {
        startIcon = L.divIcon({
            html: '<div style="background: #28a745; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">D</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'routing-start-marker'
        });

        endIcon = L.divIcon({
            html: '<div style="background: #dc3545; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">A</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'routing-end-marker'
        });
    }
}

// ============================================
// FONCTIONS PRINCIPALES DE ROUTAGE
// ============================================

/**
 * Affiche une notification à l'utilisateur
 */
function afficherNotification(message, type = 'info') {
    try {
        // Utiliser la fonction globale si disponible, sinon créer une alerte simple
        if (typeof window.afficherNotification === 'function') {
            window.afficherNotification(message, type);
        } else {
            // Solution de secours : créer une notification temporaire
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 15px 20px;
                background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#667eea'};
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-size: 0.9rem;
                max-width: 300px;
                animation: slideInRight 0.3s ease;
            `;
            notification.innerHTML = message;
            document.body.appendChild(notification);
            
            // Auto-suppression après 5 secondes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        }
    } catch (error) {
        console.error('Erreur dans afficherNotification:', error);
        // En dernier recours : console.log
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Active/désactive le mode de calcul d'itinéraire
 */
function toggleRouting() {
    try {
        routingMode = !routingMode;
        
        if (routingMode) {
            enableRoutingMode();
        } else {
            disableRoutingMode();
        }
    } catch (error) {
        console.error('Erreur dans toggleRouting:', error);
        afficherNotification('Erreur lors de l\'activation du mode itinéraire', 'error');
    }
}

/**
 * Active le mode de sélection d'itinéraire
 */
function enableRoutingMode() {
    try {
        // Désactiver les autres outils
        if (window.measureControl) {
            window.measureControl._measureControl.disable();
        }
        
        // Changer le curseur et ajouter un indicateur visuel
        document.getElementById('map').style.cursor = 'crosshair';
        
        // Ajouter le gestionnaire de clic pour la carte
        routingClickHandler = function(e) {
            handleRoutingClick(e);
        };
        map.on('click', routingClickHandler);
        
        // Afficher les instructions
        afficherNotification('Mode itinéraire activé. Cliquez sur la carte pour définir le point de départ, puis le point d\'arrivée.', 'info');
        
        // Mettre à jour l'interface
        updateRoutingUI(true);
        
    } catch (error) {
        console.error('Erreur dans enableRoutingMode:', error);
        afficherNotification('Erreur lors de l\'activation du mode itinéraire', 'error');
    }
}

/**
 * Désactive le mode de sélection d'itinéraire
 */
function disableRoutingMode() {
    try {
        // Restaurer le curseur
        document.getElementById('map').style.cursor = '';
        
        // Retirer le gestionnaire de clic
        if (routingClickHandler) {
            map.off('click', routingClickHandler);
            routingClickHandler = null;
        }
        
        // Mettre à jour l'interface
        updateRoutingUI(false);
        
        afficherNotification('Mode itinéraire désactivé', 'info');
        
    } catch (error) {
        console.error('Erreur dans disableRoutingMode:', error);
    }
}

/**
 * Gère les clics sur la carte en mode itinéraire
 */
function handleRoutingClick(e) {
    try {
        var latlng = e.latlng;
        
        if (!startMarker) {
            // Premier clic : point de départ
            setStartPoint(latlng);
            afficherNotification('Point de départ défini. Cliquez maintenant pour définir le point d\'arrivée.', 'success');
        } else if (!endMarker) {
            // Deuxième clic : point d'arrivée
            setEndPoint(latlng);
            calculateRoute();
        } else {
            // Troisième clic : réinitialiser et recommencer
            resetRouting();
            setStartPoint(latlng);
            afficherNotification('Nouvel itinéraire. Point de départ défini.', 'info');
        }
    } catch (error) {
        console.error('Erreur dans handleRoutingClick:', error);
        afficherNotification('Erreur lors de la sélection du point', 'error');
    }
}

/**
 * Définit le point de départ
 */
function setStartPoint(latlng) {
    try {
        // Initialiser les icônes si nécessaire
        initRoutingIcons();
        
        if (startMarker) {
            map.removeLayer(startMarker);
        }
        
        startMarker = L.marker(latlng, { icon: startIcon }).addTo(map);
        startMarker.bindPopup('<strong>Point de départ</strong><br>Lat: ' + latlng.lat.toFixed(6) + '<br>Lng: ' + latlng.lng.toFixed(6)).openPopup();
        
    } catch (error) {
        console.error('Erreur dans setStartPoint:', error);
        afficherNotification('Erreur lors de la définition du point de départ', 'error');
    }
}

/**
 * Définit le point d'arrivée
 */
function setEndPoint(latlng) {
    try {
        // Initialiser les icônes si nécessaire
        initRoutingIcons();
        
        if (endMarker) {
            map.removeLayer(endMarker);
        }
        
        endMarker = L.marker(latlng, { icon: endIcon }).addTo(map);
        endMarker.bindPopup('<strong>Point d\'arrivée</strong><br>Lat: ' + latlng.lat.toFixed(6) + '<br>Lng: ' + latlng.lng.toFixed(6)).openPopup();
        
    } catch (error) {
        console.error('Erreur dans setEndPoint:', error);
        afficherNotification('Erreur lors de la définition du point d\'arrivée', 'error');
    }
}

/**
 * Calcule et affiche l'itinéraire
 */
function calculateRoute() {
    try {
        if (!startMarker || !endMarker) {
            afficherNotification('Veuillez définir un point de départ et d\'arrivée', 'warning');
            return;
        }
        
        var startLatLng = startMarker.getLatLng();
        var endLatLng = endMarker.getLatLng();
        
        // Supprimer l'ancien itinéraire
        if (routingControl) {
            map.removeControl(routingControl);
        }
        
        // Créer le contrôle de routage avec OSRM
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(startLatLng.lat, startLatLng.lng),
                L.latLng(endLatLng.lat, endLatLng.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            createMarker: function() { return null; }, // Utiliser nos propres marqueurs
            lineOptions: {
                styles: [
                    { color: '#667eea', weight: 6, opacity: 0.8 },
                    { color: '#ffffff', weight: 3, opacity: 1 }
                ]
            },
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            show: true,
            showAlternatives: false,
            altLineOptions: {
                styles: [
                    { color: '#cccccc', weight: 4, opacity: 0.6 }
                ]
            }
        }).addTo(map);
        
        // Personnaliser l'affichage des instructions
        routingControl.on('routesfound', function(e) {
            var routes = e.routes;
            var summary = routes[0].summary;
            
            // Afficher un résumé de l'itinéraire
            var distance = (summary.totalDistance / 1000).toFixed(2);
            var time = Math.round(summary.totalTime / 60);
            
            afficherNotification(
                'Itinéraire trouvé : ' + distance + ' km, environ ' + time + ' minutes', 
                'success'
            );
            
            // Fermer les popups des marqueurs
            if (startMarker) startMarker.closePopup();
            if (endMarker) endMarker.closePopup();
        });
        
        routingControl.on('routingerror', function(e) {
            console.error('Erreur de routage:', e.error);
            afficherNotification(
                'Impossible de calculer l\'itinéraire. Vérifiez que les points sont accessibles par la route.', 
                'error'
            );
        });
        
    } catch (error) {
        console.error('Erreur dans calculateRoute:', error);
        afficherNotification('Erreur lors du calcul de l\'itinéraire', 'error');
    }
}

/**
 * Réinitialise complètement le routage
 */
function resetRouting() {
    try {
        // Supprimer les marqueurs
        if (startMarker) {
            map.removeLayer(startMarker);
            startMarker = null;
        }
        if (endMarker) {
            map.removeLayer(endMarker);
            endMarker = null;
        }
        
        // Supprimer le contrôle de routage
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }
        
        afficherNotification('Itinéraire réinitialisé', 'info');
        
    } catch (error) {
        console.error('Erreur dans resetRouting:', error);
    }
}

/**
 * Met à jour l'interface utilisateur en mode itinéraire
 */
function updateRoutingUI(isActive) {
    try {
        // Mettre à jour le bouton dans le menu
        var routingMenuItem = document.querySelector('a[onclick="toggleRouting()"]');
        if (routingMenuItem) {
            if (isActive) {
                routingMenuItem.style.background = 'rgba(102, 126, 234, 0.2)';
                routingMenuItem.style.borderLeft = '3px solid #667eea';
            } else {
                routingMenuItem.style.background = '';
                routingMenuItem.style.borderLeft = '';
            }
        }
        
        // Ajouter/retirer les boutons de contrôle
        addRoutingControls(isActive);
        
    } catch (error) {
        console.error('Erreur dans updateRoutingUI:', error);
    }
}

/**
 * Ajoute les contrôles supplémentaires pour le routage
 */
function addRoutingControls(isActive) {
    try {
        // Supprimer les anciens contrôles
        var existingControls = document.getElementById('routing-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        if (!isActive) return;
        
        // Créer les contrôles
        var controlsDiv = document.createElement('div');
        controlsDiv.id = 'routing-controls';
        controlsDiv.style.cssText = 'position: absolute; top: 80px; right: 20px; z-index: 1000; background: white; border-radius: 8px; padding: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 8px; min-width: 200px;';
        
        controlsDiv.innerHTML = '<div style="font-weight: bold; color: #667eea; margin-bottom: 8px; text-align: center;"><i class="fas fa-route"></i> Itinéraire</div><button onclick="resetRouting()" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-trash"></i> Réinitialiser</button><button onclick="toggleRouting()" style="background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-times"></i> Quitter le mode</button><div style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 8px;">Cliquez sur la carte pour définir départ et arrivée</div>';
        
        document.body.appendChild(controlsDiv);
        
    } catch (error) {
        console.error('Erreur dans addRoutingControls:', error);
    }
}

// ============================================
// INITIALISATION
// ============================================

/**
 * Initialise le module de routage quand la carte est prête
 */
function initRoutingModule() {
    try {
        // Initialiser les icônes en premier
        initRoutingIcons();
        
        // Vérifier que la carte et les bibliothèques nécessaires sont chargées
        if (typeof map === 'undefined' || typeof L === 'undefined') {
            console.warn('Carte ou Leaflet non disponible pour le module de routage');
            return;
        }
        
        if (typeof L.Routing === 'undefined') {
            console.warn('Leaflet Routing Machine non chargé');
            return;
        }
        
        console.log('Module de routage initialisé');
        
    } catch (error) {
        console.error('Erreur dans initRoutingModule:', error);
    }
}

// Initialiser le module quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que la carte soit initialisée
    setTimeout(initRoutingModule, 1000);
});

// Exporter les fonctions globalement
window.RoutingModule = {
    toggle: toggleRouting,
    reset: resetRouting,
    calculate: calculateRoute,
    isActive: function() { return routingMode; }
};
