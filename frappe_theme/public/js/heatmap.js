class Heatmap {
    constructor(opts) {
        this.reportName = opts.report || '';
        this.wrapper = opts.wrapper;
        this.stateGeoJsonUrl = '/assets/frappe_theme/json/states.json';
        this.districtGeoJsonUrl = '/assets/frappe_theme/json/districts.json';
        this.defaultView = opts.default_view || 'State';
        this.blockHeight = opts.block_height || 280;

        this.map = null;
        this.stateLayer = null;
        this.districtLayer = null;
        this.mapId = 'map-' + frappe.utils.get_random(8);
        this.isLoading = true;
        this.primaryTargetField = opts.primary_target;
        this.targetFields = JSON.parse(opts.target_fields || '[]')?.filter((field) => field.fieldname !== this.primaryTargetField);
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
                height: `${this.blockHeight}px`,
                width: '100%',
                position: 'relative',
                margin: '0 auto',
                // transform: 'scale(1.5)',
                backgroundColor: '#fff'
            });

        // Add title container
        this.titleContainer = $('<div>')
            .css({
                position: 'absolute',
                top: '10px',
                left: '0%',
                // transform: 'translateX(-50%)',
                zIndex: 1000,
                // padding: '8px 15px',
                backgroundColor: '#fff',
                // border: '1px solid #ccc',
                // borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '14px'
            });

        // // Add legend container
        // this.legendContainer = $('<div>')
        //     .css({
        //         position: 'absolute',
        //         bottom: '20px',
        //         left: '20px',
        //         zIndex: 1000,
        //         backgroundColor: '#fff',
        //         padding: '10px',
        //         borderRadius: '4px',
        //         border: '1px solid #ccc'
        //     });

        this.mapContainer.append(this.titleContainer);
        // this.mapContainer.append(this.legendContainer);

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

        // Add refresh button
        this.refreshButton = $('<button class="btn btn-secondary btn-sm" title="Refresh Data">')
            .html('<svg class="icon icon-sm"><use href="#icon-refresh"></use></svg>')
            .css({
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                padding: '4px 6px',
                backgroundColor: '#fff',
                border: 'none',
                cursor: 'pointer'
            })
            .on('click', () => this.refreshData());

        this.mapContainer.append(this.refreshButton);
        this.mapContainer.append(this.resetButton);
        this.loader = $('<div>')
            .addClass('map-loader')
            .css({
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
            })
            .html(`
                <div class="loading-indicator text-muted">
                    <i class="fa fa-spinner fa-pulse fa-2x"></i>
                </div>
                <div class="text-muted mt-2">Loading map data...</div>
            `);

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
                dragging: false,
            }).setView([22.5937, 78.9629], 5);
            if (this.defaultView == "State") {
                this.loadStates();
            } else {
                this.loadDistricts();
            }

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
                    // Update title with report name
                    this.titleContainer.text(this.reportName);

                    // Add legend
                    // this.updateLegend();

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
            const stateId = row[this.stateField];
            if (!this.stateData[stateId]) {
                this.stateData[stateId] = {
                    data: { ...row },  // Create a copy of the row data
                    count: row[this.primaryTargetField],
                    id: stateId
                };
            } else {
                this.stateData[stateId].count += row[this.primaryTargetField];
                // Merge the data for additional fields
                this.targetFields.forEach(field => {
                    const fieldname = field.fieldname;
                    if (typeof row[fieldname] === 'number') {
                        this.stateData[stateId].data[fieldname] = 
                            (this.stateData[stateId].data[fieldname] || 0) + row[fieldname];
                    } else {
                        this.stateData[stateId].data[fieldname] = row[fieldname];
                    }
                });
            }
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
    // Define color scale
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
                        color: '#F2F2F3',
                        weight: 1,
                        fillOpacity: 0.7,
                    },
                    onEachFeature: (feature, layer) => {
                        layer.on({
                            mouseover: (e) => {
                                const stateName = feature.properties.ST_NM;
                                const stateId = feature.properties.id;
                                const data = this.stateData?.[stateId] || { count: 0, data: {} };
                                
                                e.target.bindPopup(
                                    this.getPopupContent(stateName, null, data)
                                ).openPopup();
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
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
            })
            .html(`
                <div class="loading-indicator text-muted">
                    <i class="fa fa-spinner fa-pulse fa-2x"></i>
                </div>
                <div class="text-muted mt-2">Loading districts...</div>
            `)
            .appendTo(this.mapContainer);
    }

    loadDistricts(stateName = null) {
        if (this.defaultView == "State") {
            this.resetButton.show();
            this.refreshButton.hide();
        } else {
            this.resetButton.hide();
            this.refreshButton.show();
        }
        fetch(this.districtGeoJsonUrl)
            .then(response => response.json())
            .then(data => {
                if (this.districtLayer) this.map.removeLayer(this.districtLayer);
                if (this.stateLayer) this.map.removeLayer(this.stateLayer);
                let filtered = {
                    type: 'FeatureCollection',
                    features: []
                };
                if (!stateName) {
                    filtered.features = data.features.filter(f => f.properties.DISTRICT)
                } else {
                    filtered.features = data.features.filter(f => f.properties.DISTRICT && f.properties.ST_NM === stateName)
                }

                // Process district data for easier lookup
                this.districtData = {};
                if (this.reportData?.result) {
                    this.reportData.result.forEach(row => {
                        if (row[this.districtField]) {
                            const districtName = String(row[this.districtField]).toUpperCase();
                            this.districtData[districtName] = {
                                data: row,  // Store the complete row data
                                count: this.districtData[districtName]
                                    ? this.districtData[districtName].count + row[this.primaryTargetField]
                                    : row[this.primaryTargetField],
                                id: districtName
                            };
                        }
                    });
                }
                this.districtLayer = L.geoJSON(filtered, {
                    style: {
                        color: '#F2F2F3',
                        weight: 1,
                        fillOpacity: 0.7
                    },
                    onEachFeature: (feature, layer) => {
                        layer.on({
                            mouseover: (e) => {
                                const districtID = feature.properties?.censuscode;
                                const districtName = feature.properties?.DISTRICT
                                    ? String(feature.properties.DISTRICT).toUpperCase()
                                    : 'Unknown District';
                                const data = this.districtData[districtID] || { count: 0, data: {} };
                                
                                e.target.bindPopup(
                                    this.getPopupContent(districtName, districtID, data)
                                ).openPopup();
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
        this.refreshButton.show();
        this.resetButton.hide();
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
    }

    // Add new method to refresh data
    refreshData() {
        this.showLoader();
        this.fetchData();
    }

    showLoader() {
        this.isLoading = true;
        if (!this.loader) {
            this.loader = $('<div>')
                .addClass('map-loader')
                .css({
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    zIndex: 1000,
                    background: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                })
                .html(`
                    <div class="loading-indicator text-muted">
                        <i class="fa fa-spinner fa-pulse fa-2x"></i>
                    </div>
                    <div class="text-muted mt-2">Loading map data...</div>
                `);
        }
        this.mapContainer.append(this.loader);
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.mapContainer?.remove();
    }

    // Add this new method for consistent popup configuration
    getPopupContent(name, id, data) {
        const columnLabel = this.reportData?.columns.find(
            (column) => column.fieldname === this.primaryTargetField
        )?.label || 'Count';

        let additionalFields = '';
        if (this.targetFields?.length && data?.data) {
            additionalFields = this.targetFields
                .map(field => {
                    const value = data.data[field.fieldname];
                    return value ? `<br/>${field.label}: ${value}` : '';
                })
                .join('');
        }

        return `
            <div>
                <strong>${name}${id ? ' (' + id + ')' : ''}</strong><br/>
                ${columnLabel}: ${data?.count || 0}
                ${additionalFields}
            </div>
        `;
    }

    // Add new method for legend
    //     updateLegend() {
    //         const ranges = [
    //             {min: 1000, label: '> 1000'},
    //             {min: 500, max: 1000, label: '500-1000'},
    //             {min: 200, max: 500, label: '200-500'},
    //             {min: 100, max: 200, label: '100-200'},
    //             {min: 50, max: 100, label: '50-100'},
    //             {min: 20, max: 50, label: '20-50'},
    //             {min: 10, max: 20, label: '10-20'},
    //             {min: 0, max: 10, label: '0-10'}
    //         ];

    //         let legendHtml = '<div style="font-weight: bold; margin-bottom: 5px">Legend</div>';
    //         ranges.forEach(range => {
    //             const value = range.max ? (range.min + 1) : range.min + 1;
    //             legendHtml += `
    //                 <div style="display: flex; align-items: center; margin: 2px 0;">
    //                     <div style="width: 20px; height: 20px; background: ${this.getColorByValue(value)}; margin-right: 5px;"></div>
    //                     <div>${range.label}</div>
    //                 </div>
    //             `;
    //         });

    //         this.legendContainer.html(legendHtml);
    //     }
}

