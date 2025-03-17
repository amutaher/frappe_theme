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
                    this.applyDataToMap();
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

        const stateData = {};
        this.reportData.result.forEach(row => {
            stateData[row.state_id] = row.value;
        });

        this.stateLayer.eachLayer(layer => {
            const stateId = layer.feature.properties.id;
            if (stateData[stateId]) {
                layer.setStyle({
                    fillColor: this.getColorByValue(stateData[stateId]),
                    fillOpacity: 0.7
                });
                layer.bindPopup(`State: ${layer.feature.properties.name}<br>Value: ${stateData[stateId]}`);
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
                        weight: 1,
                        fillOpacity: 0.4
                    },
                    onEachFeature: (feature, layer) => {
                        layer.on({
                            mouseover: this.highlightFeature.bind(this),
                            mouseout: this.resetHighlight.bind(this),
                            click: this.onStateClick.bind(this)
                        });
                        layer.bindPopup(`State: ${feature.properties.name}`);
                    }
                }).addTo(this.map);

                this.map.fitBounds(this.stateLayer.getBounds());
                if (this.reportData) this.applyDataToMap();
                this.hideLoader();
            })
            .catch(error => {
                console.error('Error loading states:', error);
                this.hideLoader();
            });
    }

    highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 2,
            color: '#666',
            fillOpacity: 0.7
        });
        layer.openPopup();
        if (this.map) layer.bringToFront();
    }

    resetHighlight(e) {
        this.stateLayer.resetStyle(e.target);
        e.target.closePopup();
    }

    onStateClick(e) {
        const state = e.target.feature.properties;
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
        fetch(this.districtGeoJsonUrl)
            .then(response => response.json())
            .then(data => {
                if (this.districtLayer) this.map.removeLayer(this.districtLayer);
                if (this.stateLayer) this.map.removeLayer(this.stateLayer);

                const filtered = {
                    type: 'FeatureCollection',
                    features: data.features.filter(f => f.properties.ST_NM === stateName)
                };

                this.districtLayer = L.geoJSON(filtered, {
                    style: {
                        color: '#007BFF',
                        weight: 1,
                        fillOpacity: 0.6
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const districtData = this.reportData.district_data?.find(
                            d => d.district_id === props.id
                        );
                        layer.bindPopup(`
                            District: ${props.DISTRICT}<br>
                            Value: ${districtData?.value || 'N/A'}
                        `);
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
    console.log(wrapper, 'wrapper');
    if (wrapper) {
        new Heatmap({
            reportName: 'NGOs By District',
            wrapper: $(wrapper),
        });
    }
    index++;
    if (wrapper || index == 20) {
        clearInterval(interval);
    }
}, 1000);