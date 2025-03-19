class Heatmap {
    constructor(opts) {
        this.reportName = opts.reportName || '';
        this.wrapper = opts.wrapper;
        this.filters = opts.filters || {};
        this.stateGeoJsonUrl = '/assets/frappe_theme/json/states.json';
        this.districtGeoJsonUrl = '/assets/frappe_theme/json/districts.json';

        this.map = null;
        this.stateLayer = null;
        this.districtLayer = null;
        this.mapId = 'map-' + frappe.utils.get_random(8);
        this.isLoading = true;
        this.targetNumericField = opts.targetNumericField || 'count';
        this.stateField = opts.stateField;
        this.districtField = opts.districtField;
        this.isLoadingDistricts = null;

        this.init();
    }

    init() {
        if (!this.wrapper) {
            console.error('No wrapper element provided');
            return;
        }
        this.mapContainer = $('<div>')
            .attr('id', this.mapId)
            .css({
                height: '500px',
                width: '100%',
                position: 'relative',
                margin: '0 auto'
            });

        this.resetButton = $('<button>')
            .text('Reset to Country View')
            .css({
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                padding: '8px 15px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'none'
            })
            .on('click', () => this.resetToCountryView());

        this.mapContainer.append(this.resetButton);
        this.loader = $('<div>')
            .addClass('map-loader')
            .css({
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.7)',
                padding: '20px',
                borderRadius: '5px',
                textAlign: 'center'
            })
            .html('<div>Loading map data...</div>');

        this.mapContainer.append(this.loader);
        this.wrapper.html(this.mapContainer);

        setTimeout(() => {
            this.render();
            this.fetchData();
        }, 0);
    }

    render() {
        if (!document.getElementById(this.mapId)) return;

        try {
            this.map = L.map(this.mapId, {
                zoomControl: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                touchZoom: false,
                boxZoom: false,
                keyboard: false,
                dragging: false
            }).setView([22.5937, 78.9629], 5);

            this.loadStates();

            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 100);
        } catch (error) {
            $(this.wrapper).html('<div class="alert alert-danger">Failed to initialize map.</div>');
        }
    }

    fetchData() {
        if (!this.reportName) {
            this.hideLoader();
            return;
        }

        frappe.call({
            method: 'frappe.desk.query_report.run',
            args: {
                report_name: this.reportName,
                filters: this.filters
            },
            callback: (r) => {
                if (r.message) {
                    this.reportData = r.message;
                    const hasStateColumn = this.reportData.columns.some(col => col.options === 'State');
                    if (!this.stateField && hasStateColumn) {
                        this.stateField = this.reportData.columns.find(col => col.options === 'State').fieldname;
                    }
                    const hasDistrictColumn = this.reportData.columns.some(col => col.options === 'District');
                    if (!this.districtField && hasDistrictColumn) {
                        this.districtField = this.reportData.columns.find(col => col.options === 'District').fieldname;
                    }
                    if (hasStateColumn) {
                        this.applyDataToMap();
                    } else {
                        this.hideLoader();
                        $(this.wrapper).html('<div class="alert alert-warning">Report does not have a State column.</div>');
                    }

                    if (hasDistrictColumn) {
                        this.hasDistrictColumn = true;
                    } else {
                        this.hasDistrictColumn = false;
                    }
                }
                this.hideLoader();
            },
            error: () => this.hideLoader()
        });
    }

    hideLoader() {
        if (this.isLoading && this.loader) {
            this.isLoading = false;
            this.loader.remove();
        }
    }

    applyDataToMap() {
        if (!this.reportData || !this.stateLayer) return;

        this.stateData = {};
        this.reportData.result.forEach(row => {
            this.stateData[row[this.stateField]] = {
                count: this.stateData[row[this.stateField]] ? this.stateData[row[this.stateField]]?.count + row[this.targetNumericField] : row[this.targetNumericField],
                id: row[this.stateField]
            };
        });

        this.stateLayer.eachLayer(layer => {
            const stateID = layer.feature.properties.id;
            const data = this.stateData[stateID];
            if (data) {
                layer.setStyle({
                    fillColor: this.getColorByValue(data.count),
                    fillOpacity: 0.7
                });
            }
        });
    }

    getColorByValue(value) {
        return value > 1000 ? '#800026' :
            value > 500 ? '#BD0026' :
                value > 200 ? '#E31A1C' :
                    value > 100 ? '#FC4E2A' :
                        value > 50 ? '#FD8D3C' :
                            value > 20 ? '#FEB24C' :
                                value > 10 ? '#FED976' : '#FFEDA0';
    }

    loadStates() {
        fetch(this.stateGeoJsonUrl)
            .then(response => response.json())
            .then(data => {
                this.stateLayer = L.geoJSON(data, {
                    style: {
                        color: '#FF5733',
                        weight: 0.9,
                        fillOpacity: 0.7
                    },
                    onEachFeature: (feature, layer) => {
                        layer.on({
                            mouseover: (e) => {
                                const stateName = feature.properties.ST_NM;
                                const stateId = feature.properties.id;
                                const data = this.stateData?.[stateId] || { count: 0 };
                                const columnLabel = this.reportData?.columns.find(
                                    (column) => column.fieldname === this.targetNumericField
                                )?.label || 'Count';

                                e.target.bindPopup(`
                                    <div>
                                        <strong>${stateName}</strong><br/>
                                        ${columnLabel}: ${data.count}
                                    </div>
                                `).openPopup();
                            },
                            click: this.onStateClick.bind(this)
                        });
                    }
                }).addTo(this.map);

                this.map.fitBounds(this.stateLayer.getBounds());
                if (this.reportData) {
                    this.applyDataToMap();
                }
                this.hideLoader();
            })
            .catch(error => {
                console.error('Error loading states:', error);
                this.hideLoader();
            });
    }

    onStateClick(e) {
        if (!this.hasDistrictColumn) return;

        const state = e.target.feature.properties;
        this.stateLayer.clearLayers();
        this.map.removeLayer(this.stateLayer);
        this.showDistrictLoader();
        this.loadDistricts(state.ST_NM);
    }

    showDistrictLoader() {
        this.districtLoader = $('<div>')
            .css({
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '10px',
                borderRadius: '5px'
            })
            .text('Loading districts...')
            .appendTo(this.mapContainer);
    }

    loadDistricts(stateName) {
        this.resetButton.show();
        fetch(this.districtGeoJsonUrl)
            .then(response => response.json())
            .then(data => {
                if (this.districtLayer) this.map.removeLayer(this.districtLayer);
                if (this.stateLayer) this.map.removeLayer(this.stateLayer);
                const filtered = {
                    type: 'FeatureCollection',
                    features: data.features.filter(f => f.properties.DISTRICT && f.properties.ST_NM === stateName)
                };

                // Process district data for easier lookup
                this.districtData = {};
                if (this.reportData?.result) {
                    this.reportData.result.forEach(row => {
                        if (row[this.districtField]) {
                            const districtName = String(row[this.districtField]).toUpperCase();
                            this.districtData[districtName] = {
                                count: this.districtData[districtName] 
                                    ? this.districtData[districtName].count + row[this.targetNumericField] 
                                    : row[this.targetNumericField],
                                id: districtName
                            };
                        }
                    });
                }
                this.districtLayer = L.geoJSON(filtered, {
                    style: {
                        color: '#007BFF',
                        weight: 1,
                        fillOpacity: 0.7
                    },
                    onEachFeature: (feature, layer) => {
                        layer.on({
                            click: (e) => {
                                const districtID = feature.properties?.censuscode 
                                const districtName = feature.properties?.DISTRICT 
                                    ? String(feature.properties.DISTRICT).toUpperCase() 
                                    : 'Unknown District';
                                const data = this.districtData[districtID] || { count: 0 };
                                const columnLabel = this.reportData?.columns.find(
                                    (column) => column.fieldname === this.targetNumericField
                                )?.label || 'Count';

                                e.target.bindPopup(`
                                    <div>
                                        <strong>${districtName || 'Unknown District'}</strong><br/>
                                        ${columnLabel}: ${data.count}
                                    </div>
                                `).openPopup();
                            }
                        });

                        // Set initial color based on data
                        const districtID = feature.properties?.censuscode;
                        const data = this.districtData[districtID];
                        if (data) {
                            layer.setStyle({
                                fillColor: this.getColorByValue(data.count),
                                fillOpacity: 0.7
                            });
                        }
                    }
                }).addTo(this.map);

                this.map.fitBounds(this.districtLayer.getBounds());
                this.hideDistrictLoader();
            })
            .catch(error => {
                console.error('District load error:', error);
                this.hideDistrictLoader();
            });
    }
    

    hideDistrictLoader() {
        if (this.districtLoader) this.districtLoader.remove();
    }

    resetToCountryView() {
        if (this.districtLayer) {
            this.map.removeLayer(this.districtLayer);
            this.districtLayer = null;
        }
        
        if (!this.stateLayer) {
            this.loadStates();
        } else {
            this.map.addLayer(this.stateLayer);
            
            const bounds = this.stateLayer.getBounds();
            if (bounds && bounds.isValid()) {
                this.map.fitBounds(bounds);
            } else {
                console.warn("Invalid bounds, reinitializing country map");
                
                // Remove the current stateLayer
                this.map.removeLayer(this.stateLayer);
                this.stateLayer = null;
                
                // Reinitialize the country map
                this.loadStates();
                
                // You might need to add a slight delay to ensure the layer is loaded
                setTimeout(() => {
                    if (this.stateLayer && this.stateLayer.getBounds().isValid()) {
                        this.map.fitBounds(this.stateLayer.getBounds());
                    } else {
                        // Ultimate fallback if reinitialization fails
                        this.map.setView([37.8, -96], 4); // Example for US center
                    }
                }, 300);
            }
        }
        
        this.resetButton.hide();
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.mapContainer?.remove();
    }
}

let index = 0;
let interval = setInterval(() => {
    let wrapper = document.querySelector('[custom_block_name="TESTING HEATMAP"]');
    if (wrapper) {
        new Heatmap({
            reportName: 'NGOs By District',
            wrapper: $(wrapper),
            targetNumericField: 'count' // Replace 'count' with the actual field name you want to use
        });
    }
    index++;
    if (wrapper || index == 20) {
        clearInterval(interval);
    }
}, 1000);