/**
 * GÃ©oWeb Kaffrine - Application Moderne v3.1
 * Fichier JavaScript principal optimisÃ©
 * Performance: Lazy loading, cache intelligent, animations optimisÃ©es
 */

// ============================================
// VARIABLES GLOBALES & PERFORMANCE
// ============================================
let map;
let measureControl;
let locateControl;
let layerControl;
let currentBasemap = 'OSMStandard';
let highlightLayer;
let autolinker;
let bounds_group;

// ðŸš€ Performance monitoring
const PERFORMANCE = {
  startTime: performance.now(),
  marks: new Map(),
  mark: (name) => PERFORMANCE.marks.set(name, performance.now()),
  getMeasure: (name) => {
    const start = PERFORMANCE.marks.get(name);
    return start ? performance.now() - start : 0;
  }
};

// ðŸŽ¯ Lazy loading pour les donnÃ©es
const LAZY_LOAD = {
  loaded: new Set(),
  queue: [],
  load: async (layerName) => {
    if (LAZY_LOAD.loaded.has(layerName)) {
      return Promise.resolve();
    }
    
    LAZY_LOAD.queue.push(layerName);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (geojsonData[layerName]) {
          LAZY_LOAD.loaded.add(layerName);
          resolve();
        }
      }, Math.random() * 100); // DÃ©lai alÃ©atoire pour effet naturel
    });
  }
};

// Couches de donnÃ©es
let layers = {};
let clusters = {};

// DonnÃ©es GeoJSON brutes (dÃ©jÃ  chargÃ©es par les scripts data/)
let geojsonData = {
    Region: typeof json_Region_3 !== 'undefined' ? json_Region_3 : null,
    Departement: typeof json_Departement_4 !== 'undefined' ? json_Departement_4 : null,
    Arrondissement: typeof json_Arrondissement_5 !== 'undefined' ? json_Arrondissement_5 : null,
    Routes: typeof json_Routes_6 !== 'undefined' ? json_Routes_6 : null,
    Localites: typeof json_Localites_7 !== 'undefined' ? json_Localites_7 : null,
    Ecoles: typeof json_Ecoles_8 !== 'undefined' ? json_Ecoles_8 : null
};

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initLayers();
    initControls();
    initEventListeners();
    initAutoSavePosition();
    initTheme();
    updateCoordinates();
    updateScale();
    updateZoomLevel();
    
    // Centrer la carte aprÃ¨s un court dÃ©lai pour s'assurer que tout est chargÃ©
    setTimeout(function() {
        centerMap();
    }, 200);
    
    // Configurer la fermeture des panneaux au clic sur la carte
    setupPanelCloseOnMapClick();
    
    // S'assurer que le panneau de couches est visible par dÃ©faut sur desktop
    initializePanels();
    
    // Afficher le modal de bienvenue aprÃ¨s un court dÃ©lai
    setTimeout(function() {
        showWelcomeModal();
    }, 500);
});

// ============================================
// INITIALISATION DE LA CARTE
// ============================================
function initMap() {
    // CrÃ©er la carte
    map = L.map('map', {
        zoomControl: false,
        maxZoom: 28,
        minZoom: 1,
        attributionControl: true
    });

    // Hash pour les permaliens
    new L.Hash(map);

    // Configurer l'autolinker pour les popups
    autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

    // Groupe de limites
    bounds_group = new L.featureGroup([]);

    // Attribution
    map.attributionControl.setPrefix(
        '<a href="https://github.com/tomchadwin/qgis2web" target="_blank">qgis2web</a> &middot; ' +
        '<a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; ' +
        '<a href="https://qgis.org">QGIS</a>'
    );
}

function centerMap() {
    // Forcer le recalcul de la taille
    map.invalidateSize();
    
    // Centrer sur la rÃ©gion de Kaffrine
    map.fitBounds([[13.721171213050045, -16.131926969286404], [14.821030838950062, -14.310367685713494]]);
}

// ============================================
// INITIALISATION DES COUCHES
// ============================================
function initLayers() {
    // CrÃ©er les panes pour les couches
    createPane('CartoDbDarkMatter', 400);
    createPane('GoogleHybrid', 401);
    createPane('OSMStandard', 402);
    createPane('Region', 403);
    createPane('Departement', 404);
    createPane('Arrondissement', 405);
    createPane('Routes', 406);
    createPane('Localites', 407);
    createPane('Ecoles', 408);

    // Fonds de carte
    layers.CartoDbDarkMatter = L.tileLayer('http://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        pane: 'pane_CartoDbDarkMatter',
        opacity: 1.0,
        attribution: '',
        minZoom: 1,
        maxZoom: 28,
        minNativeZoom: 0,
        maxNativeZoom: 20
    });

    layers.GoogleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        pane: 'pane_GoogleHybrid',
        opacity: 1.0,
        attribution: '<a href="https://www.google.at/permissions/geoguidelines/attr-guide.html">Map data Â©2015 Google</a>',
        minZoom: 1,
        maxZoom: 28,
        minNativeZoom: 0,
        maxNativeZoom: 20
    });

    layers.OSMStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        pane: 'pane_OSMStandard',
        opacity: 1.0,
        attribution: '<a href="https://www.openstreetmap.org/copyright">Â© OpenStreetMap contributors, CC-BY-SA</a>',
        minZoom: 1,
        maxZoom: 28,
        minNativeZoom: 0,
        maxNativeZoom: 19
    });

    // Fond de carte par dÃ©faut
    map.addLayer(layers.OSMStandard);

    // Couches de donnÃ©es
    initDataLayers();

    // Ajouter le contrÃ´le des couches au panneau de gauche
    initLayerControl();
}

function createPane(name, zIndex) {
    map.createPane('pane_' + name);
    map.getPane('pane_' + name).style.zIndex = zIndex;
    if (name !== 'CartoDbDarkMatter' && name !== 'GoogleHybrid' && name !== 'OSMStandard') {
        map.getPane('pane_' + name).style['mix-blend-mode'] = 'normal';
    }
}

function initDataLayers() {
    // Couche Region
    if (geojsonData.Region) {
        layers.Region = L.geoJson(geojsonData.Region, {
            attribution: '',
            interactive: true,
            dataVar: 'json_Region_3',
            layerName: 'layer_Region',
            pane: 'pane_Region',
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer, 'Region');
            },
            style: function() {
                return {
                    pane: 'pane_Region',
                    opacity: 1,
                    color: 'rgba(35,35,35,1.0)',
                    dashArray: '',
                    lineCap: 'butt',
                    lineJoin: 'miter',
                    weight: 5.0,
                    fillOpacity: 0,
                    interactive: true
                };
            }
        });
        bounds_group.addLayer(layers.Region);
        map.addLayer(layers.Region);
    }

    // Couche Departement
    if (geojsonData.Departement) {
        layers.Departement = L.geoJson(geojsonData.Departement, {
            attribution: '',
            interactive: true,
            dataVar: 'json_Departement_4',
            layerName: 'layer_Departement',
            pane: 'pane_Departement',
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer, 'Departement');
            },
            style: styleDepartement
        });
        bounds_group.addLayer(layers.Departement);
        map.addLayer(layers.Departement);
    }

    // Couche Arrondissement
    if (geojsonData.Arrondissement) {
        layers.Arrondissement = L.geoJson(geojsonData.Arrondissement, {
            attribution: '',
            interactive: true,
            dataVar: 'json_Arrondissement_5',
            layerName: 'layer_Arrondissement',
            pane: 'pane_Arrondissement',
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer, 'Arrondissement');
            },
            style: styleArrondissement
        });
        bounds_group.addLayer(layers.Arrondissement);
        map.addLayer(layers.Arrondissement);
    }

    // Couche Routes
    if (geojsonData.Routes) {
        layers.Routes = L.geoJson(geojsonData.Routes, {
            attribution: '',
            interactive: true,
            dataVar: 'json_Routes_6',
            layerName: 'layer_Routes',
            pane: 'pane_Routes',
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer, 'Routes');
            },
            style: function() {
                return {
                    pane: 'pane_Routes',
                    opacity: 1,
                    color: 'rgba(255,0,0,1.0)',
                    dashArray: '',
                    lineCap: 'round',
                    lineJoin: 'round',
                    weight: 1.0,
                    fillOpacity: 0,
                    interactive: true
                };
            }
        });
        bounds_group.addLayer(layers.Routes);
        map.addLayer(layers.Routes);
    }

    // Couche Localites (avec clustering)
    if (geojsonData.Localites) {
        layers.Localites = L.geoJson(geojsonData.Localites, {
            attribution: '',
            interactive: true,
            dataVar: 'json_Localites_7',
            layerName: 'layer_Localites',
            pane: 'pane_Localites',
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer, 'Localites');
            },
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    pane: 'pane_Localites',
                    radius: 3.2,
                    opacity: 1,
                    color: 'rgba(247,247,247,1.0)',
                    dashArray: '',
                    lineCap: 'butt',
                    lineJoin: 'miter',
                    weight: 2.0,
                    fill: true,
                    fillOpacity: 1,
                    fillColor: 'rgba(83,83,83,1.0)',
                    interactive: true
                });
            }
        });
        
        clusters.Localites = new L.MarkerClusterGroup({
            showCoverageOnHover: false,
            spiderfyDistanceMultiplier: 2
        });
        clusters.Localites.addLayer(layers.Localites);
        bounds_group.addLayer(layers.Localites);
        map.addLayer(clusters.Localites);
    }

    // Couche Ecoles (avec clustering)
    if (geojsonData.Ecoles) {
        layers.Ecoles = L.geoJson(geojsonData.Ecoles, {
            attribution: '',
            interactive: true,
            dataVar: 'json_Ecoles_8',
            layerName: 'layer_Ecoles',
            pane: 'pane_Ecoles',
            onEachFeature: function(feature, layer) {
                onEachFeature(feature, layer, 'Ecoles');
            },
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    pane: 'pane_Ecoles',
                    radius: 4.77,
                    opacity: 1,
                    color: 'rgba(184,8,8,1.0)',
                    dashArray: '',
                    lineCap: 'butt',
                    lineJoin: 'miter',
                    weight: 1.0,
                    fill: true,
                    fillOpacity: 1,
                    fillColor: 'rgba(184,8,8,1.0)',
                    interactive: true
                });
            }
        });
        
        clusters.Ecoles = new L.MarkerClusterGroup({
            showCoverageOnHover: false,
            spiderfyDistanceMultiplier: 2
        });
        clusters.Ecoles.addLayer(layers.Ecoles);
        bounds_group.addLayer(layers.Ecoles);
        map.addLayer(clusters.Ecoles);
    }
}

// Styles pour les dÃ©partements
function styleDepartement(feature) {
    const colors = {
        'BIRKELANE': 'rgba(126,222,43,1.0)',
        'KAFFRINE': 'rgba(214,97,39,1.0)',
        'KOUNGHEUL': 'rgba(211,108,199,1.0)',
        'MALEM HODDAR': 'rgba(101,202,175,1.0)'
    };
    
    return {
        pane: 'pane_Departement',
        opacity: 1,
        color: 'rgba(35,35,35,1.0)',
        dashArray: '',
        lineCap: 'butt',
        lineJoin: 'miter',
        weight: 1.0,
        fill: true,
        fillOpacity: 1,
        fillColor: colors[feature.properties['dept']] || 'rgba(200,200,200,1.0)',
        interactive: true
    };
}

// Styles pour les arrondissements
function styleArrondissement(feature) {
    const colors = {
        'DAROU MINAME II': 'rgba(212,225,126,1.0)',
        'GNIBY': 'rgba(168,29,214,1.0)',
        'IDA MOURIDE': 'rgba(132,116,220,1.0)',
        'KATAKEL': 'rgba(200,69,76,1.0)',
        'KEUR MBOUCKI': 'rgba(202,130,41,1.0)',
        'LOUR ESCALE': 'rgba(61,142,235,1.0)',
        'MABO': 'rgba(234,59,173,1.0)',
        'MISSIRAH WADENE': 'rgba(68,214,204,1.0)',
        'SAGNA': 'rgba(87,201,45,1.0)'
    };
    
    return {
        pane: 'pane_Arrondissement',
        opacity: 1,
        color: 'rgba(35,35,35,1.0)',
        dashArray: '',
        lineCap: 'butt',
        lineJoin: 'miter',
        weight: 1.0,
        fill: true,
        fillOpacity: 1,
        fillColor: colors[feature.properties['arr']] || 'rgba(200,200,200,1.0)',
        interactive: true
    };
}

// ============================================
// POPUPS ET INTERACTIONS
// ============================================
function onEachFeature(feature, layer, layerName) {
    layer.on({
        mouseout: function(e) {
            for (let i in e.target._eventParents) {
                if (typeof e.target._eventParents[i].resetStyle === 'function') {
                    e.target._eventParents[i].resetStyle(e.target);
                }
            }
            if (typeof layer.closePopup === 'function') {
                layer.closePopup();
            }
        },
        mouseover: highlightFeature
    });

    let popupContent = generatePopupContent(feature, layerName);
    let content = removeEmptyRowsFromPopupContent(popupContent, feature);
    
    layer.on('popupopen', function(e) {
        addClassToPopupIfMedia(content, e.popup);
    });
    
    layer.bindPopup(content, { maxHeight: 400 });
    
    // Ajouter des labels pour les Localites (communes)
    if (layerName === 'Localites' && feature.properties) {
        let label = feature.properties['NOM'] || feature.properties['Nom'] || feature.properties['nom'] || '';
        if (label) {
            layer.bindTooltip(label, {
                permanent: true,
                direction: 'top',
                className: 'localite-label',
                offset: [0, -10]
            });
        }
    }
    
    // Ajouter des labels pour les Arrondissements
    if (layerName === 'Arrondissement' && feature.properties) {
        let label = feature.properties['arr'] || feature.properties['ARR'] || feature.properties['Arrondissement'] || '';
        if (label) {
            layer.bindTooltip(label, {
                permanent: true,
                direction: 'center',
                className: 'arrondissement-label',
                offset: [0, 0]
            });
        }
    }
}

function highlightFeature(e) {
    highlightLayer = e.target;

    if (e.target.feature.geometry.type === 'LineString' || 
        e.target.feature.geometry.type === 'MultiLineString') {
        highlightLayer.setStyle({
            color: 'rgba(255, 255, 0, 1.00)',
            weight: 3
        });
    } else {
        highlightLayer.setStyle({
            fillColor: 'rgba(255, 255, 0, 1.00)',
            fillOpacity: 0.7
        });
    }
    highlightLayer.openPopup();
}

function generatePopupContent(feature, layerName) {
    let content = '<table>';
    
    switch(layerName) {
        case 'Region':
            content += `<tr><td colspan="2"><strong>Code</strong><br />${feature.properties['Code'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Region</strong><br />${feature.properties['Region'] || ''}</td></tr>`;
            break;
        case 'Departement':
            content += `<tr><td colspan="2"><strong>Region</strong><br />${feature.properties['reg'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Departement</strong><br />${feature.properties['dept'] || ''}</td></tr>`;
            break;
        case 'Arrondissement':
            content += `<tr><td colspan="2"><strong>Region</strong><br />${feature.properties['reg'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Departement</strong><br />${feature.properties['dept'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>CAV</strong><br />${feature.properties['cav'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Arrondissement</strong><br />${feature.properties['arr'] || ''}</td></tr>`;
            break;
        case 'Routes':
            content += `<tr><td colspan="2"><strong>Route ID</strong><br />${feature.properties['ROUTESA3_'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Route Info</strong><br />${feature.properties['ROUTESA3_I'] || ''}</td></tr>`;
            break;
        case 'Localites':
            content += `<tr><td colspan="2"><strong>Entite</strong><br />${feature.properties['ENTITY'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Nom</strong><br />${feature.properties['NOM'] || ''}</td></tr>`;
            content += `<tr><td colspan="2"><strong>Numero Village</strong><br />${feature.properties['NUM_VILLAG'] || ''}</td></tr>`;
            break;
        case 'Ecoles':
            content += `<tr><td colspan="2"><strong>Nom</strong><br />${feature.properties['Nom'] || ''}</td></tr>`;
            break;
    }
    
    content += '</table>';
    return content;
}

function removeEmptyRowsFromPopupContent(content, feature) {
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    let rows = tempDiv.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
        let td = rows[i].querySelector('td.visible-with-data');
        let key = td ? td.id : '';
        if (td && td.classList.contains('visible-with-data') && feature.properties[key] == null) {
            rows[i].parentNode.removeChild(rows[i]);
        }
    }
    return tempDiv.innerHTML;
}

function addClassToPopupIfMedia(content, popup) {
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    let imgTd = tempDiv.querySelector('td img');
    if (imgTd) {
        popup._contentNode.classList.add('media');
        setTimeout(function() {
            popup.update();
        }, 10);
    } else {
        popup._contentNode.classList.remove('media');
    }
}

// ============================================
// CONTRÃ”LE DES COUCHES
// ============================================
function initLayerControl() {
    let overlaysTree = [
        {label: '<i class="fas fa-graduation-cap" style="color: #b80808;"></i> Ecoles', layer: clusters.Ecoles || layers.Ecoles},
        {label: '<i class="fas fa-map-marker-alt" style="color: #535353;"></i> Localites', layer: clusters.Localites || layers.Localites},
        {label: '<i class="fas fa-road" style="color: #ff0000;"></i> Routes', layer: layers.Routes},
        {label: '<i class="fas fa-draw-polygon" style="color: #667eea;"></i> Arrondissement', layer: layers.Arrondissement},
        {label: '<i class="fas fa-draw-polygon" style="color: #764ba2;"></i> Departement', layer: layers.Departement},
        {label: '<i class="fas fa-draw-polygon" style="color: #333;"></i> Region', layer: layers.Region}
    ];

    let baseTree = [
        {label: 'OpenStreetMap', layer: layers.OSMStandard, radioGroup: 'bm'},
        {label: 'Google Hybrid', layer: layers.GoogleHybrid, radioGroup: 'bm'},
        {label: 'CartoDB Dark', layer: layers.CartoDbDarkMatter, radioGroup: 'bm'}
    ];

    layerControl = L.control.layers.tree(baseTree, overlaysTree, {
        collapsed: false,
        position: 'topright'
    });

    // Ajouter le contrÃ´le personnalisÃ© au panneau de gauche
    let layerControlContainer = document.getElementById('layerControlContainer');
    if (layerControlContainer) {
        // CrÃ©er une liste personnalisÃ©e des couches
        createCustomLayerControl(layerControlContainer, baseTree, overlaysTree);
    }
}

function createCustomLayerControl(container, baseTree, overlaysTree) {
    // Fonds de carte
    let baseSection = document.createElement('div');
    baseSection.className = 'layer-section';
    baseSection.innerHTML = '<h4>Fonds de carte</h4>';
    
    baseTree.forEach(function(item) {
        let div = document.createElement('div');
        div.className = 'layer-item';
        div.innerHTML = `
            <label>
                <input type="radio" name="basemap" value="${item.label}" 
                       ${item.layer === layers.OSMStandard ? 'checked' : ''}
                       onchange="changeBasemapByName('${item.label}')">
                ${item.label}
            </label>
        `;
        baseSection.appendChild(div);
    });
    
    container.appendChild(baseSection);
    
    // Couches de superposition
    let overlaySection = document.createElement('div');
    overlaySection.className = 'layer-section';
    overlaySection.innerHTML = '<h4>Couches thematiques</h4>';
    
    overlaysTree.forEach(function(item) {
        let div = document.createElement('div');
        div.className = 'layer-item-with-opacity';
        let layerName = item.label.replace(/<[^>]*>/g, '').trim();
        div.innerHTML = `
            <div class="layer-header">
                <label>
                    <input type="checkbox" checked onchange="toggleLayer('${layerName}', this.checked)">
                    ${item.label}
                </label>
            </div>
            <div class="opacity-control">
                <span class="opacity-label"><i class="fas fa-eye"></i></span>
                <input type="range" min="0" max="100" value="100" 
                       class="opacity-slider" 
                       oninput="changeLayerOpacity('${layerName}', this.value)"
                       title="Transparence: 0% (transparent) Ã  100% (opaque)">
                <span class="opacity-value">100%</span>
            </div>
        `;
        overlaySection.appendChild(div);
    });
    
    container.appendChild(overlaySection);
}

function changeBasemapByName(name) {
    let basemapMap = {
        'OpenStreetMap': 'OSMStandard',
        'Google Hybrid': 'GoogleHybrid',
        'CartoDB Dark': 'CartoDbDarkMatter'
    };
    changeBasemap(basemapMap[name] || 'OSMStandard');
}

function toggleLayer(layerName, visible) {
    let layerMap = {
        'Ecoles': clusters.Ecoles,
        'Localites': clusters.Localites,
        'Routes': layers.Routes,
        'Arrondissement': layers.Arrondissement,
        'Departement': layers.Departement,
        'Region': layers.Region
    };
    
    let layer = layerMap[layerName];
    if (layer) {
        if (visible) {
            map.addLayer(layer);
        } else {
            map.removeLayer(layer);
        }
    }
}

function changeLayerOpacity(layerName, opacityValue) {
    let layerMap = {
        'Ecoles': layers.Ecoles,
        'Localites': layers.Localites,
        'Routes': layers.Routes,
        'Arrondissement': layers.Arrondissement,
        'Departement': layers.Departement,
        'Region': layers.Region
    };
    
    let layer = layerMap[layerName];
    if (!layer) return;
    
    let opacity = opacityValue / 100;
    
    // Mettre Ã  jour l'opacitÃ© de la couche
    layer.eachLayer(function(l) {
        if (l.setStyle) {
            // Pour les couches vectorielles (polygones, lignes)
            l.setStyle({
                fillOpacity: opacity * 0.7,
                opacity: opacity
            });
        } else if (l.setOpacity) {
            // Pour les marqueurs avec setOpacity
            l.setOpacity(opacity);
        }
    });
    
    // Mettre Ã  jour l'affichage du pourcentage
    let slider = document.querySelector(`.opacity-slider[oninput*="${layerName}"]`);
    if (slider) {
        let valueSpan = slider.parentElement.querySelector('.opacity-value');
        if (valueSpan) {
            valueSpan.textContent = opacityValue + '%';
        }
        
        // Mettre Ã  jour l'icÃ´ne Å“il
        let icon = slider.parentElement.querySelector('.opacity-label i');
        if (icon) {
            if (opacityValue == 0) {
                icon.className = 'fas fa-eye-slash';
            } else if (opacityValue < 50) {
                icon.className = 'fas fa-eye-low-vision';
            } else {
                icon.className = 'fas fa-eye';
            }
        }
    }
}

// ============================================
// CONTRÃ”LES DE CARTE
// ============================================
function initControls() {
    // ContrÃ´le de localisation
    locateControl = L.control.locate({
        locateOptions: {maxZoom: 19},
        position: 'topright'
    }).addTo(map);

    // ContrÃ´le de mesure
    measureControl = new L.Control.Measure({
        position: 'topright',
        primaryLengthUnit: 'meters',
        secondaryLengthUnit: 'kilometers',
        primaryAreaUnit: 'sqmeters',
        secondaryAreaUnit: 'hectares'
    });
    measureControl.addTo(map);

    // Style pour le bouton de mesure
    setTimeout(function() {
        let measureToggle = document.querySelector('.leaflet-control-measure-toggle');
        if (measureToggle) {
            measureToggle.innerHTML = '<i class="fas fa-ruler"></i>';
            measureToggle.style.display = 'flex';
            measureToggle.style.alignItems = 'center';
            measureToggle.style.justifyContent = 'center';
        }
    }, 100);
}

// ============================================
// Ã‰VÃ‰NEMENTS ET MISES Ã€ JOUR DYNAMIQUES
// ============================================
function initEventListeners() {
    // CoordonnÃ©es dynamiques
    map.on('mousemove', function(e) {
        updateCoordinates(e.latlng);
    });

    // Mise Ã  jour de l'Ã©chelle
    map.on('zoomend', function() {
        updateScale();
        updateZoomLevel();
    });

    map.on('moveend', function() {
        updateScale();
    });

    // Clic sur la carte pour les coordonnÃ©es
    map.on('click', function(e) {
        updateCoordinates(e.latlng, true);
    });

    // Fermer les modals en cliquant Ã  l'extÃ©rieur
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    };
}

function updateCoordinates(latlng, clicked = false) {
    let coordsElement = document.getElementById('coordinates');
    if (coordsElement) {
        if (latlng) {
            let lat = latlng.lat.toFixed(6);
            let lng = latlng.lng.toFixed(6);
            coordsElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${lat}, ${lng}`;
            
            if (clicked) {
                // Afficher une popup temporaire avec les coordonnÃ©es
                L.popup()
                    .setLatLng(latlng)
                    .setContent(`<b>Coordonnees:</b><br>Lat: ${lat}<br>Lng: ${lng}`)
                    .openOn(map);
            }
        } else {
            coordsElement.innerHTML = '<i class="fas fa-map-marker-alt"></i> Deplacez le curseur...';
        }
    }
}

function updateScale() {
    let scaleElement = document.getElementById('scale');
    if (scaleElement) {
        let zoom = map.getZoom();
        // Calcul approximatif de l'Ã©chelle basÃ© sur le zoom
        let scales = {
            1: '1:500M', 2: '1:250M', 3: '1:100M', 4: '1:50M', 5: '1:25M',
            6: '1:15M', 7: '1:10M', 8: '1:5M', 9: '1:2.5M', 10: '1:1M',
            11: '1:500K', 12: '1:250K', 13: '1:100K', 14: '1:50K', 15: '1:25K',
            16: '1:10K', 17: '1:5K', 18: '1:2.5K', 19: '1:1K', 20: '1:500'
        };
        let scale = scales[zoom] || `1:${Math.round(500000000 / Math.pow(2, zoom))}`;
        scaleElement.innerHTML = `<i class="fas fa-ruler"></i> ${scale}`;
    }
}

function updateZoomLevel() {
    let zoomElement = document.getElementById('zoom-level');
    if (zoomElement) {
        let zoom = map.getZoom();
        zoomElement.innerHTML = `<i class="fas fa-search"></i> Niveau ${zoom}`;
    }
}

// ============================================
// FONCTIONS DE NAVIGATION
// ============================================
function changeBasemap(basemapName) {
    // Retirer tous les fonds de carte
    map.removeLayer(layers.CartoDbDarkMatter);
    map.removeLayer(layers.GoogleHybrid);
    map.removeLayer(layers.OSMStandard);

    // Ajouter le fond sÃ©lectionnÃ©
    if (layers[basemapName]) {
        map.addLayer(layers[basemapName]);
        currentBasemap = basemapName;
    }

    // Mettre Ã  jour l'UI
    document.querySelectorAll('.basemap-option').forEach(function(el) {
        el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

function resetZoom() {
    map.fitBounds([[13.721171213050045, -16.131926969286404], [14.821030838950062, -14.310367685713494]]);
}

function locateUser() {
    map.locate({
        setView: true,
        maxZoom: 16
    });
}

// ============================================
// INITIALISATION DES PANNEAUX
// ============================================
function initializePanels() {
    console.log('[INIT] Initialisation des panneaux...');
    let isDesktop = window.innerWidth > 768;
    console.log('[INIT] Taille Ã©cran:', window.innerWidth, 'Desktop:', isDesktop);
    
    if (isDesktop) {
        // Sur desktop, s'assurer que le panneau de couches est visible
        let leftPanel = document.getElementById('sidebarLeft');
        let rightPanel = document.getElementById('sidebarRight');
        
        console.log('[INIT] Panneau gauche trouvÃ©:', leftPanel ? 'oui' : 'non');
        console.log('[INIT] Panneau droit trouvÃ©:', rightPanel ? 'oui' : 'non');
        
        if (leftPanel) {
            leftPanel.classList.remove('collapsed');
            let leftIcon = leftPanel.querySelector('.panel-toggle i');
            if (leftIcon) {
                leftIcon.className = 'fas fa-chevron-left';
            }
            console.log('[INIT] Panneau gauche rendu visible');
        }
        
        if (rightPanel) {
            rightPanel.classList.add('collapsed');
            let rightIcon = rightPanel.querySelector('.panel-toggle i');
            if (rightIcon) {
                rightIcon.className = 'fas fa-chevron-left';
            }
            console.log('[INIT] Panneau droit rendu cachÃ©');
        }
    } else {
        // Sur mobile, s'assurer que les panneaux sont cachÃ©s par dÃ©faut
        let leftPanel = document.getElementById('sidebarLeft');
        let rightPanel = document.getElementById('sidebarRight');
        
        if (leftPanel) {
            leftPanel.classList.remove('active');
            console.log('[INIT] Panneau gauche cachÃ© pour mobile');
        }
        
        if (rightPanel) {
            rightPanel.classList.remove('active');
            console.log('[INIT] Panneau droit cachÃ© pour mobile');
        }
    }
}

// ============================================
// FONCTIONS UI - PANNEAUX (CORRIGE POUR MOBILE)
// ============================================
function updatePanelChevron(panel) {
    if (!panel) return;
    let icon = panel.querySelector('.panel-toggle i');
    if (!icon) return;

    // Ouvert = chevron vers l'interieur, ferme = chevron vers l'exterieur
    icon.className = panel.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
}

function invalidateMapSize() {
    setTimeout(() => {
        if (window.map) {
            map.invalidateSize();
        }
    }, 300);
}

function togglePanel(panelId, otherPanelId) {
    let panel = document.getElementById(panelId);
    let otherPanel = document.getElementById(otherPanelId);
    let isMobile = window.innerWidth <= 768;

    if (!panel) {
        console.error('[TOGGLE] Panneau non trouve:', panelId);
        return;
    }

    if (isMobile) {
        // Sur mobile, "collapsed" force width/visibility a 0 avec !important
        panel.classList.remove('collapsed');
        if (otherPanel) {
            otherPanel.classList.remove('collapsed');
            otherPanel.classList.remove('active');
        }
        panel.classList.toggle('active');
    } else {
        panel.classList.remove('active');
        let willOpen = panel.classList.contains('collapsed');
        panel.classList.toggle('collapsed');

        // Un seul panneau ouvert a la fois
        if (willOpen && otherPanel) {
            otherPanel.classList.remove('active');
            otherPanel.classList.add('collapsed');
            updatePanelChevron(otherPanel);
        }

        updatePanelChevron(panel);
    }

    invalidateMapSize();
}

function toggleLeftPanel() {
    console.log('[TOGGLE] toggleLeftPanel appele');
    togglePanel('sidebarLeft', 'sidebarRight');
}

function toggleRightPanel() {
    console.log('[TOGGLE] toggleRightPanel appele');
    togglePanel('sidebarRight', 'sidebarLeft');
}

// Fermer les panneaux au clic sur la carte (mobile)
function setupPanelCloseOnMapClick() {
    map.on('click', function() {
        let isMobile = window.innerWidth <= 768;
        if (isMobile) {
            document.getElementById('sidebarLeft').classList.remove('active');
            document.getElementById('sidebarRight').classList.remove('active');
        }
    });
}

// Fermer les panneaux avec le bouton X
function closeLeftPanel() {
    let panel = document.getElementById('sidebarLeft');
    let isMobile = window.innerWidth <= 768;

    if (!panel) return;

    if (isMobile) {
        panel.classList.remove('active');
    } else {
        panel.classList.remove('active');
        panel.classList.add('collapsed');
        updatePanelChevron(panel);
    }

    invalidateMapSize();
}

function closeRightPanel() {
    let panel = document.getElementById('sidebarRight');
    let isMobile = window.innerWidth <= 768;

    if (!panel) return;

    if (isMobile) {
        panel.classList.remove('active');
    } else {
        panel.classList.remove('active');
        panel.classList.add('collapsed');
        updatePanelChevron(panel);
    }

    invalidateMapSize();
}

function toggleMobileMenu() {
    let menu = document.querySelector('.navbar-menu');
    menu.classList.toggle('active');
}

// ============================================
// FONCTIONS UI - MODALS
// ============================================
function showAbout() {
    document.getElementById('aboutModal').classList.add('active');
}

function showInstallModal() {
    document.getElementById('installModal').classList.add('active');
}

function showSpatialQuery() {
    let modal = document.getElementById('spatialQueryModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('[ERROR] Modal spatialQueryModal non trouvÃ©');
        alert('Erreur: Le modal de requÃªte spatiale est introuvable');
    }
}

function showAttributeQuery() {
    let modal = document.getElementById('attributeQueryModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('[ERROR] Modal attributeQueryModal non trouvÃ©');
        alert('Erreur: Le modal de requÃªte attributaire est introuvable');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ============================================
// MODAL DE BIENVENUE
// ============================================
function showWelcomeModal() {
    // VÃ©rifier si l'utilisateur a choisi de ne plus afficher
    if (localStorage.getItem('hideWelcome') !== 'true') {
        document.getElementById('welcomeModal').classList.add('active');
    }
}

function closeWelcomeModal() {
    document.getElementById('welcomeModal').classList.remove('active');
    
    // Sauvegarder la prÃ©fÃ©rence si cochÃ©
    let dontShow = document.getElementById('dontShowWelcome').checked;
    if (dontShow) {
        localStorage.setItem('hideWelcome', 'true');
    }
}

function showHome() {
    resetZoom();
    // Fermer tous les modals
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.classList.remove('active');
    });
}

// ============================================
// GESTION DES THEMES CLAIR/SOMBRE
// ============================================
function initTheme() {
    // VÃ©rifier si un thÃ¨me est sauvegardÃ©
    let savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon('dark');
    }
}

function toggleTheme() {
    let isDark = document.body.classList.toggle('dark-theme');
    let theme = isDark ? 'dark' : 'light';
    
    // Sauvegarder le thÃ¨me
    localStorage.setItem('theme', theme);
    
    // Mettre Ã  jour l'icÃ´ne
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    let icon = document.getElementById('themeIcon');
    if (icon) {
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
}

// ============================================
// OUTILS DE MESURE
// ============================================
function toggleMeasure() {
    let measureToggle = document.querySelector('.leaflet-control-measure-toggle');
    if (measureToggle) {
        measureToggle.click();
    }
}

// ============================================
// TÃ‰LÃ‰CHARGEMENT DES DONNÃ‰ES - CORRIGÃ‰
// ============================================
function downloadData(format) {
    console.log('[DOWNLOAD] Tentative de tÃ©lÃ©chargement au format:', format);
    
    // VÃ©rifier que les couches existent
    if (typeof layers === 'undefined') {
        alert('Erreur: Les donnÃ©es ne sont pas encore chargÃ©es. Veuillez patienter...');
        return;
    }
    
    let data = {
        type: 'FeatureCollection',
        features: []
    };

    // Collecter toutes les donnÃ©es des couches (visibles ou non)
    let layerList = [
        { layer: layers.Region, name: 'Region' },
        { layer: layers.Departement, name: 'Departement' },
        { layer: layers.Arrondissement, name: 'Arrondissement' },
        { layer: layers.Routes, name: 'Routes' },
        { layer: layers.Localites, name: 'Localites' },
        { layer: layers.Ecoles, name: 'Ecoles' }
    ];

    let hasData = false;
    let errorLayers = [];

    layerList.forEach(function(item) {
        try {
            if (item.layer && typeof item.layer.toGeoJSON === 'function') {
                let geojson = item.layer.toGeoJSON();
                if (geojson.features && geojson.features.length > 0) {
                    hasData = true;
                    // Ajouter le nom de la couche comme propriÃ©tÃ©
                    geojson.features.forEach(function(f) {
                        f.properties = f.properties || {};
                        f.properties._layerName = item.name;
                    });
                    data.features = data.features.concat(geojson.features);
                    console.log(`[DOWNLOAD] ${item.name}: ${geojson.features.length} entitÃ©s`);
                }
            }
        } catch (e) {
            console.error(`[DOWNLOAD] Erreur avec ${item.name}:`, e);
            errorLayers.push(item.name);
        }
    });

    if (!hasData || data.features.length === 0) {
        alert('Aucune donnÃ©e disponible Ã  tÃ©lÃ©charger. Les couches ne sont pas encore chargÃ©es.');
        return;
    }

    console.log('[DOWNLOAD] Total:', data.features.length, 'entitÃ©s au format', format);
    
    if (errorLayers.length > 0) {
        console.warn('[DOWNLOAD] ProblÃ¨mes avec:', errorLayers.join(', '));
    }

    try {
        switch(format) {
            case 'geojson':
                downloadGeoJSON(data);
                break;
            case 'kml':
                downloadKML(data);
                break;
            case 'shapefile':
                alert('Export Shapefile nÃ©cessite une bibliothÃ¨que supplÃ©mentaire (shp-write). FonctionnalitÃ© en cours de dÃ©veloppement.');
                break;
            default:
                alert('Format non supportÃ©: ' + format);
        }
    } catch (e) {
        console.error('[DOWNLOAD] Erreur lors du tÃ©lÃ©chargement:', e);
        alert('Erreur lors du tÃ©lÃ©chargement: ' + e.message);
    }
}

function getLayerName(layer) {
    if (layer === layers.Region) return 'Region';
    if (layer === layers.Departement) return 'Departement';
    if (layer === layers.Arrondissement) return 'Arrondissement';
    if (layer === layers.Routes) return 'Routes';
    if (layer === layers.Localites) return 'Localites';
    if (layer === layers.Ecoles) return 'Ecoles';
    return 'Unknown';
}

function downloadKML(data) {
    // Conversion simple GeoJSON vers KML
    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kml += '<Document>\n';
    kml += '<name>GÃ©oWeb Kaffrine Data</name>\n';
    
    data.features.forEach(function(feature, index) {
        let name = feature.properties.Nom || feature.properties.dept || feature.properties.arr || feature.properties.NOM || 'Feature ' + (index + 1);
        let coords = [];
        
        if (feature.geometry.type === 'Point') {
            coords = feature.geometry.coordinates;
            kml += '<Placemark>\n';
            kml += '<name>' + escapeXml(name) + '</name>\n';
            kml += '<description>' + escapeXml(JSON.stringify(feature.properties)) + '</description>\n';
            kml += '<Point>\n';
            kml += '<coordinates>' + coords[0] + ',' + coords[1] + '</coordinates>\n';
            kml += '</Point>\n';
            kml += '</Placemark>\n';
        } else if (feature.geometry.type === 'LineString') {
            kml += '<Placemark>\n';
            kml += '<name>' + escapeXml(name) + '</name>\n';
            kml += '<description>Route</description>\n';
            kml += '<LineString>\n';
            kml += '<coordinates>' + feature.geometry.coordinates.map(c => c.join(',')).join(' ') + '</coordinates>\n';
            kml += '</LineString>\n';
            kml += '</Placemark>\n';
        } else if (feature.geometry.type === 'Polygon') {
            kml += '<Placemark>\n';
            kml += '<name>' + escapeXml(name) + '</name>\n';
            kml += '<description>' + escapeXml(JSON.stringify(feature.properties)) + '</description>\n';
            kml += '<Polygon>\n';
            kml += '<outerBoundaryIs>\n';
            kml += '<LinearRing>\n';
            kml += '<coordinates>' + feature.geometry.coordinates[0].map(c => c.join(',')).join(' ') + '</coordinates>\n';
            kml += '</LinearRing>\n';
            kml += '</outerBoundaryIs>\n';
            kml += '</Polygon>\n';
            kml += '</Placemark>\n';
        }
    });
    
    kml += '</Document>\n';
    kml += '</kml>';
    
    let blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
    let url = URL.createObjectURL(blob);
    
    let link = document.createElement('a');
    link.href = url;
    link.download = 'web_gis_kaffrine_data.kml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeXml(text) {
    return text.replace(/[<>&'"]/g, function(c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function downloadGeoJSON(data) {
    let dataStr = JSON.stringify(data, null, 2);
    let blob = new Blob([dataStr], {type: 'application/json'});
    let url = URL.createObjectURL(blob);
    
    let link = document.createElement('a');
    link.href = url;
    link.download = 'web_gis_kaffrine_data.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// REQUÃŠTES SPATIALES - CORRIGÃ‰
// ============================================
function executeSpatialQuery() {
    let sourceLayerName = document.getElementById('spatialLayer').value;
    let queryType = document.getElementById('spatialQueryType').value;
    let targetLayerName = document.getElementById('targetLayer').value;

    // RÃ©cupÃ©rer les couches
    let sourceLayerObj = getLayerByName(sourceLayerName);
    let targetLayerObj = getLayerByName(targetLayerName);

    if (!sourceLayerObj || !targetLayerObj) {
        alert('Couche source ou cible non trouvÃ©e');
        return;
    }

    let results = [];
    let sourceCount = 0;
    let matchCount = 0;

    // Pour chaque entitÃ© dans la couche source
    sourceLayerObj.eachLayer(function(sourceFeature) {
        sourceCount++;
        let sourceGeo = sourceFeature.feature.geometry;
        let matched = false;

        // VÃ©rifier avec chaque entitÃ© de la couche cible
        targetLayerObj.eachLayer(function(targetFeature) {
            if (matched) return; // DÃ©jÃ  trouvÃ©

            let targetGeo = targetFeature.feature.geometry;
            let intersects = false;

            switch(queryType) {
                case 'within':
                    intersects = checkWithin(sourceGeo, targetGeo);
                    break;
                case 'intersects':
                    intersects = checkIntersect(sourceGeo, targetGeo);
                    break;
                case 'nearby':
                    intersects = checkNearby(sourceFeature, targetFeature, 1000); // 1km
                    break;
            }

            if (intersects) {
                matched = true;
                matchCount++;
                results.push(sourceFeature);
                
                // Mettre en Ã©vidence
                highlightFeaturePermanent(sourceFeature);
            }
        });
    });

    alert(`RequÃªte spatiale terminÃ©e:\n${sourceCount} entitÃ©s analysÃ©es\n${matchCount} correspondances trouvÃ©es`);
    
    if (results.length > 0 && results[0].getBounds) {
        map.fitBounds(results[0].getBounds().pad(0.5));
    }

    closeModal('spatialQueryModal');
}

function getLayerByName(name) {
    // VÃ©rifier d'abord dans les clusters
    if (name === 'Ecoles' && clusters.Ecoles) return layers.Ecoles;
    if (name === 'Localites' && clusters.Localites) return layers.Localites;
    if (name === 'Routes') return layers.Routes;
    if (name === 'Arrondissement') return layers.Arrondissement;
    if (name === 'Departement') return layers.Departement;
    if (name === 'Region') return layers.Region;
    return null;
}

function checkWithin(sourceGeo, targetGeo) {
    // VÃ©rification simplifiÃ©e: si le centroÃ¯de de la source est dans la cible
    let sourceCenter = getCentroid(sourceGeo);
    return pointInPolygon(sourceCenter, targetGeo);
}

function checkIntersect(sourceGeo, targetGeo) {
    // VÃ©rification simplifiÃ©e: les bounding boxes s'intersectent
    let sourceBounds = getBounds(sourceGeo);
    let targetBounds = getBounds(targetGeo);
    return boundsIntersect(sourceBounds, targetBounds);
}

function checkNearby(sourceFeature, targetFeature, distance) {
    // Calculer la distance entre les centroÃ¯des
    let sourceCenter = getCentroid(sourceFeature.feature.geometry);
    let targetCenter = getCentroid(targetFeature.feature.geometry);
    let dist = calculateDistance(sourceCenter, targetCenter);
    return dist <= distance; // distance en mÃ¨tres
}

function getCentroid(geometry) {
    if (geometry.type === 'Point') {
        return { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };
    }
    // Pour les autres types, calculer le centroÃ¯de simple
    let coords = geometry.coordinates;
    if (geometry.type === 'Polygon') coords = coords[0];
    let sumLat = 0, sumLng = 0, count = 0;
    coords.forEach(function(coord) {
        if (Array.isArray(coord[0])) {
            coord.forEach(function(c) {
                sumLng += c[0];
                sumLat += c[1];
                count++;
            });
        } else {
            sumLng += coord[0];
            sumLat += coord[1];
            count++;
        }
    });
    return { lat: sumLat / count, lng: sumLng / count };
}

function getBounds(geometry) {
    let coords = [];
    if (geometry.type === 'Point') {
        coords = [geometry.coordinates];
    } else if (geometry.type === 'LineString') {
        coords = geometry.coordinates;
    } else if (geometry.type === 'Polygon') {
        coords = geometry.coordinates[0];
    }
    
    let lats = coords.map(c => c[1]);
    let lngs = coords.map(c => c[0]);
    return {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
    };
}

function boundsIntersect(b1, b2) {
    return !(b2.minLng > b1.maxLng || b2.maxLng < b1.minLng || 
             b2.minLat > b1.maxLat || b2.maxLat < b1.minLat);
}

function pointInPolygon(point, polygon) {
    // Algorithme ray-casting simplifiÃ©
    if (polygon.type !== 'Polygon') return false;
    let vertices = polygon.coordinates[0];
    let x = point.lng, y = point.lat;
    let inside = false;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let xi = vertices[i][0], yi = vertices[i][1];
        let xj = vertices[j][0], yj = vertices[j][1];
        
        let intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function calculateDistance(p1, p2) {
    // Formule de Haversine pour calculer la distance en mÃ¨tres
    let R = 6371000; // Rayon de la Terre en mÃ¨tres
    let lat1 = p1.lat * Math.PI / 180;
    let lat2 = p2.lat * Math.PI / 180;
    let deltaLat = (p2.lat - p1.lat) * Math.PI / 180;
    let deltaLng = (p2.lng - p1.lng) * Math.PI / 180;
    
    let a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function highlightFeaturePermanent(layer) {
    if (layer.setStyle) {
        layer.setStyle({
            fillColor: 'rgba(255, 255, 0, 0.8)',
            fillOpacity: 0.8,
            color: 'rgba(255, 0, 0, 1)',
            weight: 3
        });
    }
}

// ============================================
// REQUÃŠTES ATTRIBUTAIRES - CORRIGÃ‰
// ============================================
function executeAttributeQuery() {
    let layerName = document.getElementById('attributeLayer').value;
    let field = document.getElementById('attributeField').value;
    let operator = document.getElementById('attributeOperator').value;
    let value = document.getElementById('attributeValue').value;

    if (!value || value.trim() === '') {
        alert('Veuillez entrer une valeur de recherche');
        return;
    }

    // RÃ©cupÃ©rer la bonne couche
    let targetLayer = getLayerByName(layerName);
    
    if (!targetLayer) {
        alert('Couche non trouvÃ©e: ' + layerName);
        return;
    }

    // RÃ©initialiser les styles avant la nouvelle recherche
    resetAllStyles();

    let found = false;
    let results = [];
    let searchValue = value.toLowerCase().trim();

    targetLayer.eachLayer(function(l) {
        if (!l.feature || !l.feature.properties) return;
        
        // Essayer de trouver le champ (sensible Ã  la casse ou non)
        let propValue = l.feature.properties[field];
        
        // Si le champ n'existe pas directement, essayer des variantes
        if (propValue === undefined) {
            // Essayer diffÃ©rentes variantes du nom de champ
            let fieldVariants = [field, field.toUpperCase(), field.toLowerCase(), 
                field.charAt(0).toUpperCase() + field.slice(1).toLowerCase()];
            
            for (let variant of fieldVariants) {
                if (l.feature.properties[variant] !== undefined) {
                    propValue = l.feature.properties[variant];
                    break;
                }
            }
        }
        
        if (propValue !== undefined && propValue !== null) {
            let strValue = String(propValue).toLowerCase();
            let match = false;
            
            switch(operator) {
                case 'equals':
                    match = strValue === searchValue;
                    break;
                case 'contains':
                    match = strValue.includes(searchValue);
                    break;
                case 'starts':
                    match = strValue.startsWith(searchValue);
                    break;
            }
            
            if (match) {
                found = true;
                results.push(l);
                highlightFeaturePermanent(l);
            }
        }
    });

    if (found) {
        alert(`${results.length} entitÃ©(s) trouvÃ©e(s) dans la couche ${layerName}`);
        // Zoom sur les rÃ©sultats
        if (results.length === 1) {
            if (results[0].getBounds) {
                map.fitBounds(results[0].getBounds().pad(0.5));
            } else if (results[0].getLatLng) {
                map.setView(results[0].getLatLng(), 16);
            }
        } else if (results.length > 1) {
            // CrÃ©er un groupe pour tous les rÃ©sultats
            let group = new L.featureGroup(results);
            map.fitBounds(group.getBounds().pad(0.2));
        }
    } else {
        alert(`Aucune entitÃ© trouvÃ©e dans ${layerName} avec ${field} ${operator} "${value}"`);
    }

    closeModal('attributeQueryModal');
}

function resetAllStyles() {
    // RÃ©initialiser les styles pour toutes les couches
    let allLayers = [layers.Region, layers.Departement, layers.Arrondissement, 
                     layers.Routes, layers.Localites, layers.Ecoles];
    
    allLayers.forEach(function(layer) {
        if (layer && layer.eachLayer) {
            layer.eachLayer(function(l) {
                if (l.setStyle && layer.resetStyle) {
                    layer.resetStyle(l);
                }
            });
        }
    });
}

function clearAttributeQuery() {
    document.getElementById('attributeValue').value = '';
    resetAllStyles();
    alert('Recherche rÃ©initialisÃ©e');
}

// ============================================
// REQUÃŠTES SPATIALES AVANCÃ‰ES - Buffer, Intersection, Distance
// ============================================
let currentSpatialQuery = {
    type: 'buffer',
    targetLayer: null,
    bufferDistance: 1000,
    nearestCount: 3,
    clickPoint: null,
    results: [],
    bufferCircle: null
};

function setQueryType(type) {
    currentSpatialQuery.type = type;
    
    // Mettre Ã  jour l'interface
    document.querySelectorAll('.query-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Afficher les paramÃ¨tres appropriÃ©s
    document.getElementById('spatialStep3').style.display = 'block';
    
    if (type === 'buffer') {
        document.getElementById('bufferParams').style.display = 'block';
        document.getElementById('distanceParams').style.display = 'none';
    } else if (type === 'distance') {
        document.getElementById('bufferParams').style.display = 'none';
        document.getElementById('distanceParams').style.display = 'block';
    } else {
        document.getElementById('bufferParams').style.display = 'none';
        document.getElementById('distanceParams').style.display = 'none';
    }
}

function setTargetLayer(layerName) {
    currentSpatialQuery.targetLayer = layerName;
    
    // Mettre Ã  jour l'interface
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function updateBufferValue(val) {
    currentSpatialQuery.bufferDistance = parseInt(val);
    document.getElementById('bufferValue').textContent = val + ' m';
}

function executeSpatialQueryNew() {
    if (!currentSpatialQuery.targetLayer) {
        alert('Veuillez d\'abord choisir ce que vous cherchez (Ã‰coles, LocalitÃ©s ou Routes)');
        return;
    }
    
    // Fermer le modal et attendre un clic
    closeModal('spatialQueryModal');
    
    // Message
    alert('Cliquez sur la carte pour dÃ©finir le point de dÃ©part de la recherche');
    
    // Attendre le clic
    map.once('click', function(e) {
        currentSpatialQuery.clickPoint = e.latlng;
        performSpatialSearch();
    });
}

function performSpatialSearch() {
    // RÃ©initialiser
    resetAllStyles();
    
    // Supprimer l'ancien buffer s'il existe
    if (currentSpatialQuery.bufferCircle) {
        map.removeLayer(currentSpatialQuery.bufferCircle);
    }
    
    let point = currentSpatialQuery.clickPoint;
    let targetLayer = getLayerByName(currentSpatialQuery.targetLayer);
    
    if (!targetLayer) {
        alert('Couche non trouvÃ©e');
        return;
    }
    
    currentSpatialQuery.results = [];
    
    // CrÃ©er le cercle de buffer si nÃ©cessaire
    if (currentSpatialQuery.type === 'buffer') {
        currentSpatialQuery.bufferCircle = L.circle(point, {
            radius: currentSpatialQuery.bufferDistance,
            className: 'buffer-circle',
            fillColor: '#667eea',
            fillOpacity: 0.2,
            color: '#667eea',
            weight: 2
        }).addTo(map);
    }
    
    // Rechercher
    targetLayer.eachLayer(function(layer) {
        let layerPoint = null;
        
        if (layer.getLatLng) {
            layerPoint = layer.getLatLng();
        } else if (layer.getBounds && layer.getBounds().getCenter) {
            layerPoint = layer.getBounds().getCenter();
        }
        
        if (layerPoint) {
            let distance = calculateDistance(
                {lat: point.lat, lng: point.lng},
                {lat: layerPoint.lat, lng: layerPoint.lng}
            );
            
            let shouldInclude = false;
            
            if (currentSpatialQuery.type === 'buffer') {
                // Dans le buffer
                shouldInclude = distance <= currentSpatialQuery.bufferDistance;
            } else if (currentSpatialQuery.type === 'intersect') {
                // Intersection simple - dans un rayon de 500m
                shouldInclude = distance <= 500;
            } else if (currentSpatialQuery.type === 'distance') {
                // On prend tous et on trie par distance
                shouldInclude = true;
            }
            
            if (shouldInclude) {
                currentSpatialQuery.results.push({
                    layer: layer,
                    distance: distance,
                    name: getFeatureName(layer)
                });
                highlightFeaturePermanent(layer);
            }
        }
    });
    
    // Trier par distance si mode distance
    if (currentSpatialQuery.type === 'distance') {
        currentSpatialQuery.results.sort((a, b) => a.distance - b.distance);
        let count = parseInt(document.getElementById('nearestCount').value);
        currentSpatialQuery.results = currentSpatialQuery.results.slice(0, count);
    }
    
    // Afficher les rÃ©sultats
    showSpatialResults();
    
    // ZOOMER automatiquement sur les rÃ©sultats
    zoomToSpatialResults();
}

function getFeatureName(layer) {
    if (!layer.feature || !layer.feature.properties) return 'Sans nom';
    let props = layer.feature.properties;
    return props.Nom || props.dept || props.arr || props.NOM || props.name || 'Feature';
}

function showSpatialResults() {
    let resultsDiv = document.getElementById('spatialResultsContent');
    let count = currentSpatialQuery.results.length;
    
    if (count === 0) {
        resultsDiv.innerHTML = '<p style="color: #888;"><i class="fas fa-info-circle"></i> Aucun rÃ©sultat trouvÃ©</p>';
    } else {
        let html = `<div class="results-list">`;
        
        currentSpatialQuery.results.forEach(function(res, index) {
            let icon = 'fa-map-marker-alt';
            if (currentSpatialQuery.targetLayer === 'Ecoles') icon = 'fa-graduation-cap';
            if (currentSpatialQuery.targetLayer === 'Routes') icon = 'fa-road';
            
            html += `
                <div class="result-item" onclick="zoomToSpatialResult(${index})">
                    <i class="fas ${icon}"></i>
                    <span>${res.name}</span>
                    <span class="distance">${Math.round(res.distance)}m</span>
                </div>
            `;
        });
        
        html += `</div>`;
        html += `<p style="text-align: center; color: #667eea; font-weight: 600;">${count} rÃ©sultat(s) trouvÃ©(s)</p>`;
        
        resultsDiv.innerHTML = html;
    }
    
    // Afficher la section rÃ©sultats
    document.getElementById('spatialStep1').style.display = 'none';
    document.getElementById('spatialStep2').style.display = 'none';
    document.getElementById('spatialStep3').style.display = 'none';
    document.getElementById('spatialStep4').style.display = 'none';
    document.getElementById('spatialResults').style.display = 'block';
    
    // Rouvrir le modal
    document.getElementById('spatialQueryModal').classList.add('active');
}

function zoomToSpatialResults() {
    if (currentSpatialQuery.results.length === 0) return;
    
    // CrÃ©er un groupe avec tous les rÃ©sultats et le point de dÃ©part
    let features = currentSpatialQuery.results.map(r => r.layer);
    
    // Ajouter le cercle de buffer au groupe si existe
    if (currentSpatialQuery.bufferCircle) {
        features.push(currentSpatialQuery.bufferCircle);
    }
    
    let group = new L.featureGroup(features);
    map.fitBounds(group.getBounds().pad(0.2));
}

function zoomToSpatialResult(index) {
    let result = currentSpatialQuery.results[index];
    if (!result) return;
    
    let layer = result.layer;
    
    if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.3));
    } else if (layer.getLatLng) {
        map.setView(layer.getLatLng(), 16);
    }
    
    // Ouvrir popup
    if (layer.feature && layer.feature.properties) {
        let content = '<b>' + result.name + '</b><br>Distance: ' + Math.round(result.distance) + 'm';
        layer.bindPopup(content).openPopup();
    }
}

function resetSpatialQuery() {
    // RÃ©initialiser
    currentSpatialQuery.results = [];
    if (currentSpatialQuery.bufferCircle) {
        map.removeLayer(currentSpatialQuery.bufferCircle);
        currentSpatialQuery.bufferCircle = null;
    }
    resetAllStyles();
    
    // RÃ©afficher les Ã©tapes
    document.getElementById('spatialStep1').style.display = 'block';
    document.getElementById('spatialStep2').style.display = 'block';
    document.getElementById('spatialStep3').style.display = 'block';
    document.getElementById('spatialStep4').style.display = 'block';
    document.getElementById('spatialResults').style.display = 'none';
}

function stopSpatialQuery() {
    if (currentSpatialQuery.bufferCircle) {
        map.removeLayer(currentSpatialQuery.bufferCircle);
        currentSpatialQuery.bufferCircle = null;
    }
    resetAllStyles();
}

// ============================================
// REQUÃŠTES ULTRA-SIMPLES
// ============================================

// 1. CLIQUER SUR LA CARTE - RequÃªte spatiale ultra-simple
function startClickQuery() {
    // Fermer le modal
    closeModal('spatialQueryModal');
    
    // Message simple
    alert('Cliquez maintenant sur la carte pour voir ce qui est proche !');
    
    // Attendre un clic
    map.once('click', function(e) {
        findNearPoint(e.latlng);
    });
}

function findNearPoint(latlng) {
    // RÃ©initialiser
    resetAllStyles();
    
    let results = {
        ecoles: [],
        localites: [],
        routes: []
    };
    
    // Chercher les Ã©coles proches (500m)
    if (layers.Ecoles) {
        layers.Ecoles.eachLayer(function(l) {
            if (l.getLatLng) {
                let dist = calculateDistance(
                    {lat: latlng.lat, lng: latlng.lng},
                    {lat: l.getLatLng().lat, lng: l.getLatLng().lng}
                );
                if (dist <= 500) {
                    results.ecoles.push(l);
                    highlightFeaturePermanent(l);
                }
            }
        });
    }
    
    // Chercher les localitÃ©s proches (1km)
    if (layers.Localites) {
        layers.Localites.eachLayer(function(l) {
            if (l.getLatLng) {
                let dist = calculateDistance(
                    {lat: latlng.lat, lng: latlng.lng},
                    {lat: l.getLatLng().lat, lng: l.getLatLng().lng}
                );
                if (dist <= 1000) {
                    results.localites.push(l);
                    highlightFeaturePermanent(l);
                }
            }
        });
    }
    
    // Afficher les rÃ©sultats dans le modal
    showClickResults(results);
}

function showClickResults(results) {
    let content = '';
    
    if (results.ecoles.length > 0) {
        content += `<div class="query-result-item"><i class="fas fa-graduation-cap"></i> ${results.ecoles.length} Ã©cole(s)</div>`;
    }
    if (results.localites.length > 0) {
        content += `<div class="query-result-item"><i class="fas fa-map-marker-alt"></i> ${results.localites.length} localitÃ©(s)</div>`;
    }
    if (results.routes.length > 0) {
        content += `<div class="query-result-item"><i class="fas fa-road"></i> ${results.routes.length} route(s)</div>`;
    }
    
    if (content === '') {
        content = '<p style="color: #888;">Rien trouvÃ© Ã  cet endroit. Essayez ailleurs !</p>';
    }
    
    document.getElementById('clickQueryContent').innerHTML = content;
    document.getElementById('clickQueryResult').style.display = 'block';
    
    // RÃ©ouvrir le modal pour montrer les rÃ©sultats
    showSpatialQuery();
}
// 2. CHERCHER UN NOM - Recherche attributaire ultra-simple
function doSuperSearch() {
    let term = document.getElementById('superSearchInput').value.trim();
    
    if (!term) {
        alert('Tapez un nom d\'abord !');
        return;
    }
    
    // RÃ©initialiser
    resetAllStyles();
    
    let found = [];
    let searchIn = [layers.Ecoles, layers.Localites, layers.Departement, layers.Arrondissement];
    let icons = ['fa-graduation-cap', 'fa-map-marker-alt', 'fa-draw-polygon', 'fa-draw-polygon'];
    let names = ['Ã‰cole', 'LocalitÃ©', 'DÃ©partement', 'Arrondissement'];
    
    for (let i = 0; i < searchIn.length; i++) {
        let layer = searchIn[i];
        if (!layer) continue;
        
        layer.eachLayer(function(l) {
            if (!l.feature || !l.feature.properties) return;
            
            // Chercher dans toutes les propriÃ©tÃ©s
            for (let key in l.feature.properties) {
                let val = String(l.feature.properties[key] || '');
                if (val.toLowerCase().includes(term.toLowerCase())) {
                    found.push({
                        name: val,
                        type: names[i],
                        icon: icons[i],
                        layer: l
                    });
                    highlightFeaturePermanent(l);
                    break;
                }
            }
        });
    }
    
    // Afficher
    showSuperSearchResults(found, term);
}

function showSuperSearchResults(found, term) {
    let contentDiv = document.getElementById('superSearchContent');
    
    if (found.length === 0) {
        contentDiv.innerHTML = `<p style="color: #c62828;"><i class="fas fa-times-circle"></i> Aucun rÃ©sultat pour "${term}"</p>`;
    } else {
        let html = `<p style="color: #2e7d32; margin-bottom: 10px;"><i class="fas fa-check-circle"></i> ${found.length} trouvÃ©(s) :</p>`;
        
        found.slice(0, 10).forEach(function(item) {
            html += `
                <div class="query-result-item" onclick="zoomToFeature(${JSON.stringify(item.name).replace(/"/g, '&quot;')})">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.name} (${item.type})</span>
                </div>
            `;
        });
        
        if (found.length > 10) {
            html += `<p style="color: #888; font-size: 0.85rem; margin-top: 10px;">... et ${found.length - 10} autres</p>`;
        }
        
        contentDiv.innerHTML = html;
        
        // Zoom sur le premier
        if (found[0].layer.getBounds) {
            map.fitBounds(found[0].layer.getBounds().pad(0.3));
        } else if (found[0].layer.getLatLng) {
            map.setView(found[0].layer.getLatLng(), 15);
        }
    }
    
    document.getElementById('superSearchResult').style.display = 'block';
}

function clearSuperSearch() {
    document.getElementById('superSearchInput').value = '';
    document.getElementById('superSearchResult').style.display = 'none';
    document.querySelector('.big-button-container').style.display = 'block';
    document.getElementById('clickQueryResult').style.display = 'none';
    resetAllStyles();
}

function zoomToFeature(name) {
    // Trouver et zoomer
    let allLayers = [layers.Ecoles, layers.Localites, layers.Departement, layers.Arrondissement];
    
    for (let layer of allLayers) {
        if (!layer) continue;
        
        layer.eachLayer(function(l) {
            if (!l.feature || !l.feature.properties) return;
            
            for (let key in l.feature.properties) {
                if (String(l.feature.properties[key]) === name) {
                    if (l.getBounds) {
                        map.fitBounds(l.getBounds().pad(0.3));
                    } else if (l.getLatLng) {
                        map.setView(l.getLatLng(), 16);
                    }
                    
                    // Popup
                    let popupContent = '<b>' + name + '</b><br>';
                    for (let k in l.feature.properties) {
                        popupContent += k + ': ' + l.feature.properties[k] + '<br>';
                    }
                    l.bindPopup(popupContent).openPopup();
                    return;
                }
            }
        });
    }
}

// ============================================
// REQUÃŠTES SIMPLIFIÃ‰ES - NOUVELLE VERSION
// ============================================

let spatialSimpleState = {
    targetLayer: null,
    results: [],
    clickPoint: null
};

let attrSearchType = 'nom';

// REQUÃŠTE SPATIALE SIMPLIFIÃ‰E
function startSpatialSimple(layerName) {
    spatialSimpleState.targetLayer = layerName;
    
    // Changer l'affichage
    document.getElementById('spatialSimpleStep1').style.display = 'none';
    document.getElementById('spatialSimpleStep2').style.display = 'block';
    
    // Fermer le modal pour permettre le clic sur la carte
    closeModal('spatialQueryModal');
    
    // Attendre le clic
    map.once('click', function(e) {
        spatialSimpleState.clickPoint = e.latlng;
        performSpatialSimpleSearch();
    });
}

function performSpatialSimpleSearch() {
    resetAllStyles();
    
    let targetLayer = getLayerByName(spatialSimpleState.targetLayer);
    if (!targetLayer) {
        alert('Erreur: couche non trouvÃ©e');
        return;
    }
    
    spatialSimpleState.results = [];
    let point = spatialSimpleState.clickPoint;
    
    // Chercher dans un rayon de 1km
    targetLayer.eachLayer(function(layer) {
        let layerPoint = null;
        
        if (layer.getLatLng) {
            layerPoint = layer.getLatLng();
        } else if (layer.getBounds && layer.getBounds().getCenter) {
            layerPoint = layer.getBounds().getCenter();
        }
        
        if (layerPoint) {
            let distance = calculateDistance(
                {lat: point.lat, lng: point.lng},
                {lat: layerPoint.lat, lng: layerPoint.lng}
            );
            
            if (distance <= 1000) { // 1km
                let name = getFeatureName(layer);
                spatialSimpleState.results.push({
                    layer: layer,
                    name: name,
                    distance: distance
                });
                highlightFeaturePermanent(layer);
            }
        }
    });
    
    // Trier par distance
    spatialSimpleState.results.sort((a, b) => a.distance - b.distance);
    
    // Afficher les rÃ©sultats
    showSpatialSimpleResults();
    
    // Zoom automatique
    zoomToSpatialSimpleResults();
}

function showSpatialSimpleResults() {
    let contentDiv = document.getElementById('spatialSimpleContent');
    let count = spatialSimpleState.results.length;
    
    if (count === 0) {
        contentDiv.innerHTML = '<p style="color: #888;"><i class="fas fa-info-circle"></i> Aucun rÃ©sultat dans un rayon de 1km</p>';
    } else {
        let html = `<p style="color: #667eea; font-weight: 600; margin-bottom: 10px;">${count} trouvÃ©(s) :</p>`;
        
        spatialSimpleState.results.slice(0, 10).forEach(function(res, index) {
            html += `
                <div class="attr-result-item" onclick="zoomToSpatialSimpleResult(${index})">
                    <div class="attr-result-type">${Math.round(res.distance)}m</div>
                    <div class="attr-result-name">${res.name}</div>
                </div>
            `;
        });
        
        if (count > 10) {
            html += `<p style="color: #888; font-size: 0.85rem;">... et ${count - 10} autres</p>`;
        }
        
        contentDiv.innerHTML = html;
    }
    
    // Afficher
    document.getElementById('spatialSimpleStep2').style.display = 'none';
    document.getElementById('spatialSimpleResults').style.display = 'block';
    document.getElementById('spatialQueryModal').classList.add('active');
}

function zoomToSpatialSimpleResults() {
    if (spatialSimpleState.results.length === 0) return;
    
    let features = spatialSimpleState.results.map(r => r.layer);
    let group = new L.featureGroup(features);
    map.fitBounds(group.getBounds().pad(0.2));
}

function zoomToSpatialSimpleResult(index) {
    let result = spatialSimpleState.results[index];
    if (!result) return;
    
    let layer = result.layer;
    
    if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.3));
    } else if (layer.getLatLng) {
        map.setView(layer.getLatLng(), 16);
    }
    
    if (layer.feature && layer.feature.properties) {
        let content = '<b>' + result.name + '</b><br>Distance: ' + Math.round(result.distance) + 'm';
        layer.bindPopup(content).openPopup();
    }
}

function cancelSpatialSimple() {
    document.getElementById('spatialSimpleStep1').style.display = 'block';
    document.getElementById('spatialSimpleStep2').style.display = 'none';
    map.off('click');
}

function resetSpatialSimple() {
    spatialSimpleState.results = [];
    spatialSimpleState.clickPoint = null;
    resetAllStyles();
    
    document.getElementById('spatialSimpleStep1').style.display = 'block';
    document.getElementById('spatialSimpleStep2').style.display = 'none';
    document.getElementById('spatialSimpleResults').style.display = 'none';
}

function clearSpatialSimple() {
    resetSpatialSimple();
}

// RECHERCHE ATTRIBUTAIRE SIMPLIFIÃ‰E
function setSearchType(type) {
    attrSearchType = type;
    
    // Mettre Ã  jour les boutons
    document.getElementById('btnSearchNom').classList.toggle('active', type === 'nom');
    document.getElementById('btnSearchCode').classList.toggle('active', type === 'code');
    
    // Mettre Ã  jour le placeholder
    let input = document.getElementById('attrSearchInput');
    if (type === 'nom') {
        input.placeholder = 'Tapez le nom...';
    } else {
        input.placeholder = 'Tapez le code...';
    }
}

function executeAttrSearch() {
    let term = document.getElementById('attrSearchInput').value.trim();
    
    if (!term) {
        alert('Veuillez entrer un terme de recherche');
        return;
    }
    
    // RÃ©initialiser
    resetAllStyles();
    
    let found = [];
    let searchIn = [layers.Ecoles, layers.Localites, layers.Departement, layers.Arrondissement, layers.Region, layers.Routes];
    let typeNames = ['Ã‰cole', 'LocalitÃ©', 'DÃ©partement', 'Arrondissement', 'RÃ©gion', 'Route'];
    
    for (let i = 0; i < searchIn.length; i++) {
        let layer = searchIn[i];
        if (!layer) continue;
        
        layer.eachLayer(function(l) {
            if (!l.feature || !l.feature.properties) return;
            
            let props = l.feature.properties;
            let match = false;
            let matchedValue = '';
            
            // Chercher selon le type
            if (attrSearchType === 'nom') {
                // Chercher dans les champs de nom
                let nameFields = ['Nom', 'nom', 'NOM', 'name', 'NAME', 'dept', 'arr', 'region'];
                for (let field of nameFields) {
                    if (props[field] && String(props[field]).toLowerCase().includes(term.toLowerCase())) {
                        match = true;
                        matchedValue = props[field];
                        break;
                    }
                }
            } else {
                // Chercher dans les champs de code
                let codeFields = ['code', 'Code', 'CODE', 'id', 'ID', 'num', 'Num', 'ref'];
                for (let field of codeFields) {
                    if (props[field] && String(props[field]).toLowerCase().includes(term.toLowerCase())) {
                        match = true;
                        matchedValue = props[field];
                        break;
                    }
                }
                // Si pas de match dans les codes, chercher aussi dans les noms
                if (!match) {
                    for (let key in props) {
                        if (String(props[key]).toLowerCase().includes(term.toLowerCase())) {
                            match = true;
                            matchedValue = props[key];
                            break;
                        }
                    }
                }
            }
            
            if (match) {
                found.push({
                    layer: l,
                    type: typeNames[i],
                    name: matchedValue,
                    allProps: props
                });
                highlightFeaturePermanent(l);
            }
        });
    }
    
    showAttrResults(found, term);
}

function showAttrResults(found, term) {
    let contentDiv = document.getElementById('attrResultsContent');
    
    if (found.length === 0) {
        contentDiv.innerHTML = `<p style="color: #c62828;"><i class="fas fa-times-circle"></i> Aucun rÃ©sultat pour "${term}"</p>`;
    } else {
        let html = `<p style="color: #2e7d32; margin-bottom: 10px;"><i class="fas fa-check-circle"></i> ${found.length} trouvÃ©(s) :</p>`;
        
        found.slice(0, 15).forEach(function(item, index) {
            html += `
                <div class="attr-result-item" onclick="zoomToAttrResult(${index})">
                    <div class="attr-result-type">${item.type}</div>
                    <div class="attr-result-name">${item.name}</div>
                </div>
            `;
        });
        
        if (found.length > 15) {
            html += `<p style="color: #888; font-size: 0.85rem; margin-top: 10px;">... et ${found.length - 15} autres</p>`;
        }
        
        contentDiv.innerHTML = html;
        
        // Sauvegarder pour le zoom
        window.lastAttrResults = found;
        
        // Zoom sur le premier
        if (found[0].layer.getBounds) {
            map.fitBounds(found[0].layer.getBounds().pad(0.3));
        } else if (found[0].layer.getLatLng) {
            map.setView(found[0].layer.getLatLng(), 15);
        }
    }
    
    document.getElementById('attrResults').style.display = 'block';
}

function zoomToAttrResult(index) {
    if (!window.lastAttrResults || !window.lastAttrResults[index]) return;
    
    let item = window.lastAttrResults[index];
    let layer = item.layer;
    
    if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.3));
    } else if (layer.getLatLng) {
        map.setView(layer.getLatLng(), 16);
    }
    
    // Popup avec toutes les infos
    let content = '<b>' + item.name + '</b><br><small>' + item.type + '</small><br><br>';
    for (let key in item.allProps) {
        content += key + ': ' + item.allProps[key] + '<br>';
    }
    layer.bindPopup(content).openPopup();
}

function clearAttrSearch() {
    document.getElementById('attrSearchInput').value = '';
    document.getElementById('attrResults').style.display = 'none';
    resetAllStyles();
}

// ============================================
// SAUVEGARDE POSITION CARTE (pour rechargement)
// ============================================
function saveMapPosition() {
    if (!map) return;
    
    let center = map.getCenter();
    let zoom = map.getZoom();
    
    let position = {
        lat: center.lat,
        lng: center.lng,
        zoom: zoom
    };
    
    localStorage.setItem('mapPosition', JSON.stringify(position));
}

function restoreMapPosition() {
    // DÃ‰SACTIVÃ‰: La carte ne se recentre plus automatiquement au chargement
    console.log('[MAP] Restauration position dÃ©sactivÃ©e - maintien du zoom actuel');
    return false;
}

// Sauvegarder la position avant de quitter la page
window.addEventListener('beforeunload', function() {
    saveMapPosition();
});

// Sauvegarder aussi Ã  chaque mouvement de la carte
function initAutoSavePosition() {
    map.on('moveend', function() {
        saveMapPosition();
    });
}

// ============================================
// UTILITAIRES
// ============================================
function setBounds() {
    // Fonction vide pour compatibilitÃ©
}

// Gestion des erreurs
window.onerror = function(msg, url, line) {
    console.error('Erreur:', msg, 'URL:', url, 'Ligne:', line);
    return false;
};

// ============================================
// GEOLOCALISATION AVANCEE - PWA MOBILE
// ============================================
let userLocationMarker = null;
let userLocationCircle = null;
let locationWatchId = null;
let isTracking = false;
let locationHistory = [];
let maxLocationHistory = 100;

function locateUser() {
    // VÃ©rifier si la gÃ©olocalisation est supportÃ©e
    if (!navigator.geolocation) {
        alert('La gÃ©olocalisation n\'est pas supportÃ©e par votre navigateur');
        return;
    }
    
    // Options de gÃ©olocalisation haute prÃ©cision
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    
    // Demander la position actuelle
    navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        onLocationError,
        options
    );
}

function onLocationSuccess(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    console.log('[GEO] Position trouvÃ©e:', lat, lng, 'PrÃ©cision:', accuracy, 'm');
    
    // Centrer la carte sur la position
    map.setView([lat, lng], 16);
    
    // Mettre Ã  jour ou crÃ©er le marqueur de position
    updateUserLocationMarker(lat, lng, accuracy);
    
    // Sauvegarder dans l'historique
    addToLocationHistory(lat, lng, accuracy);
    
    // Afficher une notification
    showLocationNotification(lat, lng, accuracy);
}

function onLocationError(error) {
    let message = 'Erreur de gÃ©olocalisation: ';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += 'Permission refusÃ©e. Veuillez autoriser l\'accÃ¨s Ã  votre position.';
            break;
        case error.POSITION_UNAVAILABLE:
            message += 'Position indisponible.';
            break;
        case error.TIMEOUT:
            message += 'DÃ©lai expirÃ©.';
            break;
        default:
            message += 'Erreur inconnue.';
    }
    console.error('[GEO]', message);
    alert(message);
}

function updateUserLocationMarker(lat, lng, accuracy) {
    // Supprimer l'ancien marqueur s'il existe
    if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
    }
    if (userLocationCircle) {
        map.removeLayer(userLocationCircle);
    }
    
    // CrÃ©er un nouveau marqueur avec une icÃ´ne personnalisÃ©e
    const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background: #3498db; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
    
    userLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    
    // Ajouter un cercle de prÃ©cision
    userLocationCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#3498db',
        fillColor: '#3498db',
        fillOpacity: 0.15,
        weight: 1
    }).addTo(map);
    
    // Ajouter un popup avec les informations
    const popupContent = `
        <div style="text-align: center;">
            <b>Votre position</b><br>
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}<br>
            PrÃ©cision: ${Math.round(accuracy)}m
        </div>
    `;
    userLocationMarker.bindPopup(popupContent);
}

function addToLocationHistory(lat, lng, accuracy) {
    const timestamp = new Date().toISOString();
    locationHistory.push({ lat, lng, accuracy, timestamp });
    
    // Limiter l'historique
    if (locationHistory.length > maxLocationHistory) {
        locationHistory.shift();
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem('locationHistory', JSON.stringify(locationHistory));
}

function showLocationNotification(lat, lng, accuracy) {
    // CrÃ©er une notification visuelle
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-map-marker-alt" style="font-size: 1.5rem;"></i>
            <div>
                <div style="font-weight: 600;">Position trouvÃ©e !</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">
                    PrÃ©cision: ${Math.round(accuracy)}m
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer aprÃ¨s 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function startContinuousTracking() {
    if (!navigator.geolocation) {
        alert('La gÃ©olocalisation n\'est pas supportÃ©e');
        return;
    }
    
    if (isTracking) {
        stopContinuousTracking();
        return;
    }
    
    isTracking = true;
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    
    locationWatchId = navigator.geolocation.watchPosition(
        onLocationSuccess,
        onLocationError,
        options
    );
    
    // Mettre Ã  jour l'interface
    const btn = document.querySelector('.float-btn[onclick="locateUser()"]');
    if (btn) {
        btn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        btn.title = 'ArrÃªter le suivi';
        btn.setAttribute('onclick', 'stopContinuousTracking()');
    }
    
    showNotification('Suivi de position activÃ©', 'info');
}

function stopContinuousTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    
    isTracking = false;
    
    // Restaurer l'interface
    const btn = document.querySelector('.float-btn[onclick="stopContinuousTracking()"]');
    if (btn) {
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.title = 'Localiser ma position';
        btn.setAttribute('onclick', 'locateUser()');
    }
    
    showNotification('Suivi de position arrÃªtÃ©', 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : '#667eea'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// ============================================
// STYLES CSS POUR GEOLOCALISATION
// ============================================
const geoStyles = document.createElement('style');
geoStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .user-location-marker {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
`;
document.head.appendChild(geoStyles);

console.log('[PWA] Module de gÃ©olocalisation avancÃ©e chargÃ©');

// ============================================
// REQUÃŠTES ATTRIBUTAIRES AVANCÃ‰ES
// ============================================
let currentAttrOperator = 'equals';

function setAttrOperator(op) {
    currentAttrOperator = op;
    
    // Mettre Ã  jour l'apparence des boutons
    document.querySelectorAll('.btn-operator').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#333';
        btn.style.borderColor = '#e0e0e0';
    });
    
    let activeBtn = document.getElementById('btnOp' + op.charAt(0).toUpperCase() + op.slice(1));
    if (activeBtn) {
        activeBtn.style.background = '#667eea';
        activeBtn.style.color = 'white';
        activeBtn.style.borderColor = '#667eea';
    }
}

function updateAttrFields() {
    let layerName = document.getElementById('attrLayerSelect').value;
    let fieldSelect = document.getElementById('attrFieldSelect');
    
    // Vider les options actuelles
    fieldSelect.innerHTML = '<option value="">-- SÃ©lectionner un champ --</option>';
    
    // Ajouter les champs selon la couche
    let commonFields = [
        { value: '*', label: 'Tous les champs' }
    ];
    
    let layerFields = {
        'Ecoles': [
            { value: 'Nom', label: 'Nom' },
            { value: 'type', label: 'Type' },
            { value: 'code', label: 'Code' },
            { value: 'dept', label: 'DÃ©partement' }
        ],
        'Localites': [
            { value: 'Nom', label: 'Nom' },
            { value: 'type', label: 'Type' },
            { value: 'code', label: 'Code' }
        ],
        'Departement': [
            { value: 'dept', label: 'Nom du dÃ©partement' },
            { value: 'code', label: 'Code' }
        ],
        'Arrondissement': [
            { value: 'arr', label: 'Nom de l\'arrondissement' },
            { value: 'code', label: 'Code' },
            { value: 'dept', label: 'DÃ©partement' }
        ],
        'Region': [
            { value: 'region', label: 'Nom de la rÃ©gion' },
            { value: 'code', label: 'Code' }
        ],
        'Routes': [
            { value: 'type', label: 'Type de route' },
            { value: 'Nom', label: 'Nom' }
        ]
    };
    
    let fields = layerFields[layerName] || [];
    fields = [...commonFields, ...fields];
    
    fields.forEach(field => {
        let option = document.createElement('option');
        option.value = field.value;
        option.textContent = field.label;
        fieldSelect.appendChild(option);
    });
}

function executeAdvancedAttrQuery() {
    let layerName = document.getElementById('attrLayerSelect').value;
    let fieldName = document.getElementById('attrFieldSelect').value;
    let searchValue = document.getElementById('attrSearchValue').value.trim();
    
    if (!layerName) {
        alert('Veuillez sÃ©lectionner une couche');
        return;
    }
    if (!fieldName) {
        alert('Veuillez sÃ©lectionner un champ');
        return;
    }
    if (!searchValue) {
        alert('Veuillez entrer une valeur Ã  rechercher');
        return;
    }
    
    // RÃ©cupÃ©rer la couche
    let targetLayer = getLayerByName(layerName);
    if (!targetLayer) {
        alert('Couche non trouvÃ©e: ' + layerName);
        return;
    }
    
    // RÃ©initialiser les styles
    resetAllStyles();
    
    let results = [];
    let searchLower = searchValue.toLowerCase();
    
    targetLayer.eachLayer(function(layer) {
        if (!layer.feature || !layer.feature.properties) return;
        
        let props = layer.feature.properties;
        let match = false;
        let matchedValue = '';
        
        if (fieldName === '*') {
            // Chercher dans tous les champs
            for (let key in props) {
                let val = String(props[key] || '').toLowerCase();
                if (checkMatch(val, searchLower, currentAttrOperator)) {
                    match = true;
                    matchedValue = props[key];
                    break;
                }
            }
        } else {
            // Chercher dans un champ spÃ©cifique avec variantes
            let variants = [fieldName, fieldName.toUpperCase(), fieldName.toLowerCase(),
                fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase()];
            
            for (let variant of variants) {
                if (props[variant] !== undefined) {
                    let val = String(props[variant]).toLowerCase();
                    if (checkMatch(val, searchLower, currentAttrOperator)) {
                        match = true;
                        matchedValue = props[variant];
                        break;
                    }
                }
            }
        }
        
        if (match) {
            results.push({
                layer: layer,
                name: matchedValue || getFeatureName(layer),
                properties: props
            });
            highlightFeaturePermanent(layer);
        }
    });
    
    showAdvancedAttrResults(results, searchValue);
}

function checkMatch(value, search, operator) {
    switch(operator) {
        case 'equals':
            return value === search;
        case 'contains':
            return value.includes(search);
        case 'starts':
            return value.startsWith(search);
        default:
            return value.includes(search);
    }
}

function showAdvancedAttrResults(results, searchValue) {
    let resultsDiv = document.getElementById('attrResultsContent');
    let resultsContainer = document.getElementById('attrResults');
    
    // Cacher les Ã©tapes et montrer rÃ©sultats
    document.getElementById('attrStep1').style.display = 'none';
    document.getElementById('attrStep2').style.display = 'none';
    document.getElementById('attrStep3').style.display = 'none';
    document.getElementById('attrStep4').style.display = 'none';
    resultsContainer.style.display = 'block';
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `<p style="color: #c62828; text-align: center; padding: 20px;"><i class="fas fa-times-circle"></i> Aucun rÃ©sultat pour "${searchValue}"</p>`;
    } else {
        let html = `<div style="background: #e8f5e9; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center;">`;
        html += `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> <b>${results.length}</b> rÃ©sultat(s) trouvÃ©(s)`;
        html += `</div>`;
        html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        
        results.slice(0, 20).forEach((res, index) => {
            html += `
                <div onclick="zoomToAdvancedAttrResult(${index})" style="padding: 12px; background: #f5f5f5; border-radius: 8px; cursor: pointer; border-left: 4px solid #667eea; transition: all 0.2s;" onmouseover="this.style.background='#e8eaf6'" onmouseout="this.style.background='#f5f5f5'">
                    <div style="font-weight: 600; color: #333;">${res.name}</div>
                    <div style="font-size: 0.85rem; color: #666;">
                        ${Object.entries(res.properties).slice(0, 3).map(([k,v]) => `${k}: ${v}`).join(' | ')}
                    </div>
                </div>
            `;
        });
        
        if (results.length > 20) {
            html += `<p style="text-align: center; color: #888;">... et ${results.length - 20} autres rÃ©sultats</p>`;
        }
        
        html += `</div>`;
        resultsDiv.innerHTML = html;
        
        // Sauvegarder pour le zoom
        window.advancedAttrResults = results;
        
        // Zoom sur le premier rÃ©sultat
        setTimeout(() => {
            if (results[0].layer.getBounds) {
                map.fitBounds(results[0].layer.getBounds().pad(0.3));
            } else if (results[0].layer.getLatLng) {
                map.setView(results[0].layer.getLatLng(), 16);
            }
        }, 100);
    }
}

function zoomToAdvancedAttrResult(index) {
    if (!window.advancedAttrResults || !window.advancedAttrResults[index]) return;
    
    let res = window.advancedAttrResults[index];
    let layer = res.layer;
    
    if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.3));
    } else if (layer.getLatLng) {
        map.setView(layer.getLatLng(), 16);
    }
    
    // Ouvrir popup avec toutes les propriÃ©tÃ©s
    let popupContent = '<b>' + res.name + '</b><br><hr style="margin: 8px 0;">';
    for (let key in res.properties) {
        popupContent += `<b>${key}:</b> ${res.properties[key]}<br>`;
    }
    layer.bindPopup(popupContent).openPopup();
}

function clearAttrQuery() {
    document.getElementById('attrLayerSelect').value = '';
    document.getElementById('attrFieldSelect').innerHTML = '<option value="">-- SÃ©lectionner un champ --</option>';
    document.getElementById('attrSearchValue').value = '';
    
    document.getElementById('attrStep1').style.display = 'block';
    document.getElementById('attrStep2').style.display = 'block';
    document.getElementById('attrStep3').style.display = 'block';
    document.getElementById('attrStep4').style.display = 'block';
    document.getElementById('attrResults').style.display = 'none';
    
    resetAllStyles();
    window.advancedAttrResults = null;
}

// ============================================
// REQUÃŠTES SPATIALES AVANCÃ‰ES
// ============================================
let currentSpatialType = 'buffer';
let currentBufferDistance = 1000; // 1km par dÃ©faut
let currentSpatialResults = [];
let currentBufferCircle = null;

function setSpatialQueryType(type) {
    currentSpatialType = type;
    
    // Mettre Ã  jour l'apparence des boutons
    document.querySelectorAll('.btn-spatial-type').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#333';
        btn.style.borderColor = '#e0e0e0';
    });
    
    let btn = document.getElementById('btnType' + type.charAt(0).toUpperCase() + type.slice(1));
    if (btn) {
        btn.style.background = '#667eea';
        btn.style.color = 'white';
        btn.style.borderColor = '#667eea';
    }
    
    // Afficher les paramÃ¨tres appropriÃ©s
    document.getElementById('spatialBufferParams').style.display = (type === 'buffer') ? 'block' : 'none';
    document.getElementById('spatialNearestParams').style.display = (type === 'nearest') ? 'block' : 'none';
    document.getElementById('spatialExecute').style.display = (type === 'click') ? 'none' : 'block';
}

function setBufferDistance(dist) {
    currentBufferDistance = dist;
    document.getElementById('bufferDistanceValue').value = dist;
    
    // Mettre Ã  jour l'apparence
    document.querySelectorAll('.btn-buffer').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#333';
        btn.style.borderColor = '#e0e0e0';
    });
    
    let activeBtn = document.querySelector(`.btn-buffer[data-dist="${dist}"]`);
    if (activeBtn) {
        activeBtn.style.background = '#667eea';
        activeBtn.style.color = 'white';
        activeBtn.style.borderColor = '#667eea';
    }
}

function executeAdvancedSpatialQuery() {
    let targetLayerName = document.getElementById('spatialTargetLayer').value;
    
    if (!targetLayerName) {
        alert('Veuillez sÃ©lectionner une couche Ã  rechercher');
        return;
    }
    
    if (currentSpatialType === 'click') {
        startClickQueryAdvanced();
        return;
    }
    
    // Fermer le modal et attendre un clic
    closeModal('spatialQueryModal');
    
    document.getElementById('spatialClickInstructions').style.display = 'block';
    
    // Attendre le clic sur la carte
    map.once('click', function(e) {
        document.getElementById('spatialClickInstructions').style.display = 'none';
        performAdvancedSpatialSearch(e.latlng, targetLayerName);
    });
}

function startClickQueryAdvanced() {
    let targetLayerName = document.getElementById('spatialTargetLayer').value;
    if (!targetLayerName) {
        alert('Veuillez sÃ©lectionner une couche');
        return;
    }
    
    closeModal('spatialQueryModal');
    
    setTimeout(() => {
        alert('Cliquez sur la carte pour voir les Ã©lÃ©ments proches');
    }, 300);
    
    map.once('click', function(e) {
        performClickSearch(e.latlng, targetLayerName);
    });
}

function performAdvancedSpatialSearch(latlng, targetLayerName) {
    console.log('[SPATIAL] Recherche dÃ©marrÃ©e', latlng, targetLayerName, 'type:', currentSpatialType, 'distance:', currentBufferDistance);
    resetAllStyles();
    
    // Supprimer l'ancien buffer
    if (currentBufferCircle) {
        map.removeLayer(currentBufferCircle);
        currentBufferCircle = null;
    }
    
    let targetLayer = getLayerByName(targetLayerName);
    if (!targetLayer) {
        console.error('[SPATIAL] Couche non trouvÃ©e:', targetLayerName);
        alert('Couche non trouvÃ©e');
        return;
    }
    console.log('[SPATIAL] Couche trouvÃ©e, nombre d\'Ã©lÃ©ments:', Object.keys(targetLayer._layers || {}).length);
    
    currentSpatialResults = [];
    let point = latlng;
    let checkedCount = 0;
    
    // CrÃ©er le cercle de buffer si type buffer
    if (currentSpatialType === 'buffer') {
        currentBufferCircle = L.circle(point, {
            radius: currentBufferDistance,
            fillColor: '#667eea',
            fillOpacity: 0.2,
            color: '#667eea',
            weight: 2
        }).addTo(map);
        console.log('[SPATIAL] Buffer crÃ©Ã© avec distance:', currentBufferDistance);
    }
    
    // Rechercher dans la couche
    targetLayer.eachLayer(function(layer) {
        let layerPoint = getLayerCenter(layer);
        checkedCount++;
        if (!layerPoint) {
            console.log('[SPATIAL] Ã‰lÃ©ment', checkedCount, 'sans position');
            return;
        }
        
        let distance = calculateDistance(
            {lat: point.lat, lng: point.lng},
            {lat: layerPoint.lat, lng: layerPoint.lng}
        );
        
        let shouldInclude = false;
        
        if (currentSpatialType === 'buffer') {
            shouldInclude = distance <= currentBufferDistance;
        } else if (currentSpatialType === 'nearest') {
            shouldInclude = true;
        }
        
        if (shouldInclude) {
            console.log('[SPATIAL] Ã‰lÃ©ment trouvÃ© Ã ', Math.round(distance), 'm');
            currentSpatialResults.push({
                layer: layer,
                distance: distance,
                name: getFeatureName(layer)
            });
            highlightFeaturePermanent(layer);
        }
    });
    
    console.log('[SPATIAL] Total vÃ©rifiÃ©:', checkedCount, 'TrouvÃ©s:', currentSpatialResults.length);
    
    // Trier par distance
    currentSpatialResults.sort((a, b) => a.distance - b.distance);
    
    // Limiter si nearest
    if (currentSpatialType === 'nearest') {
        let count = parseInt(document.getElementById('nearestCount').value);
        currentSpatialResults = currentSpatialResults.slice(0, count);
    }
    
    // Afficher les rÃ©sultats
    showAdvancedSpatialResults(targetLayerName);
    
    // Zoomer sur les rÃ©sultats
    zoomToSpatialResultsAdvanced();
}

function performClickSearch(latlng, targetLayerName) {
    resetAllStyles();
    
    let targetLayer = getLayerByName(targetLayerName);
    if (!targetLayer) return;
    
    currentSpatialResults = [];
    
    targetLayer.eachLayer(function(layer) {
        let layerPoint = getLayerCenter(layer);
        if (!layerPoint) return;
        
        let distance = calculateDistance(
            {lat: latlng.lat, lng: latlng.lng},
            {lat: layerPoint.lat, lng: layerPoint.lng}
        );
        
        // Par dÃ©faut, chercher dans 500m pour le clic simple
        if (distance <= 500) {
            currentSpatialResults.push({
                layer: layer,
                distance: distance,
                name: getFeatureName(layer)
            });
            highlightFeaturePermanent(layer);
        }
    });
    
    currentSpatialResults.sort((a, b) => a.distance - b.distance);
    
    showAdvancedSpatialResults(targetLayerName);
    zoomToSpatialResultsAdvanced();
}

function getLayerCenter(layer) {
    if (layer.getLatLng) {
        return layer.getLatLng();
    } else if (layer.getBounds && layer.getBounds().getCenter) {
        return layer.getBounds().getCenter();
    }
    return null;
}

function showAdvancedSpatialResults(layerName) {
    let resultsDiv = document.getElementById('spatialAdvancedResultsContent');
    let resultsContainer = document.getElementById('spatialAdvancedResults');
    
    // Cacher les Ã©tapes et montrer rÃ©sultats
    document.getElementById('spatialStep1').style.display = 'none';
    document.getElementById('spatialStep2').style.display = 'none';
    document.getElementById('spatialBufferParams').style.display = 'none';
    document.getElementById('spatialNearestParams').style.display = 'none';
    document.getElementById('spatialExecute').style.display = 'none';
    resultsContainer.style.display = 'block';
    
    if (currentSpatialResults.length === 0) {
        resultsDiv.innerHTML = `<p style="color: #c62828; text-align: center; padding: 20px;"><i class="fas fa-times-circle"></i> Aucun rÃ©sultat trouvÃ©</p>`;
    } else {
        let typeLabel = currentSpatialType === 'buffer' ? `dans ${currentBufferDistance}m` : 'les plus proches';
        
        let html = `<div style="background: #e8f5e9; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center;">`;
        html += `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> <b>${currentSpatialResults.length}</b> ${layerName} ${typeLabel}`;
        html += `</div>`;
        html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        
        currentSpatialResults.slice(0, 20).forEach((res, index) => {
            let icon = 'fa-map-marker-alt';
            if (layerName === 'Ecoles') icon = 'fa-graduation-cap';
            if (layerName === 'Routes') icon = 'fa-road';
            
            html += `
                <div onclick="zoomToAdvancedSpatialResult(${index})" style="padding: 12px; background: #f5f5f5; border-radius: 8px; cursor: pointer; border-left: 4px solid #667eea; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;" onmouseover="this.style.background='#e8eaf6'" onmouseout="this.style.background='#f5f5f5'">
                    <div>
                        <i class="fas ${icon}" style="color: #667eea; margin-right: 8px;"></i>
                        <span style="font-weight: 600;">${res.name}</span>
                    </div>
                    <span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">${Math.round(res.distance)}m</span>
                </div>
            `;
        });
        
        if (currentSpatialResults.length > 20) {
            html += `<p style="text-align: center; color: #888;">... et ${currentSpatialResults.length - 20} autres</p>`;
        }
        
        html += `</div>`;
        resultsDiv.innerHTML = html;
    }
    
    // Zoomer sur tous les rÃ©sultats AVANT de rouvrir le modal
    zoomToSpatialResultsAdvanced();
    
    // Attendre un peu puis rouvrir le modal pour voir les rÃ©sultats
    setTimeout(() => {
        let modal = document.getElementById('spatialQueryModal');
        if (modal) modal.classList.add('active');
    }, 1500);
}

function zoomToSpatialResultsAdvanced() {
    if (currentSpatialResults.length === 0) return;
    
    let features = currentSpatialResults.map(r => r.layer);
    if (currentBufferCircle) {
        features.push(currentBufferCircle);
    }
    
    let group = new L.featureGroup(features);
    map.fitBounds(group.getBounds().pad(0.2));
}

function zoomToAdvancedSpatialResult(index) {
    if (!currentSpatialResults[index]) return;
    
    let res = currentSpatialResults[index];
    let layer = res.layer;
    
    if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.3));
    } else if (layer.getLatLng) {
        map.setView(layer.getLatLng(), 16);
    }
    
    // Popup
    let content = '<b>' + res.name + '</b><br>Distance: ' + Math.round(res.distance) + 'm';
    if (layer.feature && layer.feature.properties) {
        content += '<br><hr style="margin: 8px 0;">';
        for (let key in layer.feature.properties) {
            content += `<b>${key}:</b> ${layer.feature.properties[key]}<br>`;
        }
    }
    layer.bindPopup(content).openPopup();
}

function clearAdvancedSpatialQuery() {
    // Supprimer le buffer
    if (currentBufferCircle) {
        map.removeLayer(currentBufferCircle);
        currentBufferCircle = null;
    }
    
    resetAllStyles();
    currentSpatialResults = [];
    
    // RÃ©afficher les Ã©tapes
    document.getElementById('spatialStep1').style.display = 'block';
    document.getElementById('spatialStep2').style.display = 'block';
    
    if (currentSpatialType === 'buffer') {
        document.getElementById('spatialBufferParams').style.display = 'block';
    } else if (currentSpatialType === 'nearest') {
        document.getElementById('spatialNearestParams').style.display = 'block';
    }
    
    document.getElementById('spatialExecute').style.display = 'block';
    document.getElementById('spatialAdvancedResults').style.display = 'none';
    document.getElementById('spatialTargetLayer').value = '';
}

console.log('[PWA] RequÃªtes avancÃ©es chargÃ©es');

