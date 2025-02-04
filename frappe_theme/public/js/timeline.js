class TimelineGenerator {
    constructor(frm, wrapper) {
        this.frm = frm;
        this.wrapper = this.setupWrapper(wrapper);
        this.fetchTimelineData();
        return this.wrapper;
    }
    setupWrapper(wrapper) {
        this.styles = `
        .card { margin-bottom: 10px; }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .table { margin: 0px; }
        .table th, .table td { text-align: left; padding: 8px !important; }
        `;

        this.timeline_wrapper = document.createElement('div');
        this.timeline_wrapper.id = 'timeline-wrapper';

        const styleTag = document.createElement('style');
        styleTag.textContent = this.styles;
        document.head.appendChild(styleTag);
        wrapper.appendChild(this.timeline_wrapper);
        return wrapper;
    }
    fetchTimelineData() {
        frappe.call({
            method: "mgrant.apis.api.get_versions",
            args: {
                dt: this.frm.doctype,
                dn: this.frm.docname,
            },
        }).then((response) => {
            this.versions = response.message || [];
            this.timeline_wrapper.innerHTML = '';

            const timelineContainer = document.createElement('div');
            timelineContainer.id = 'timeline-container';

            const dataTimeline = document.createElement('div');
            dataTimeline.id = 'data-timeline';

            if (this.versions.length > 0) {
                for (let item of this.versions) {
                    let changes = [];
                    try {
                        changes = JSON.parse(item.changed);
                    } catch (error) {
                        console.error("Error parsing 'changed' field:", error, item.changed);
                    }

                    const cardWrapper = document.createElement('div');
                    cardWrapper.style.width = '100%';

                    const title = document.createElement('span');
                    title.style.fontSize = '12px';
                    title.style.fontWeight = 'bold';
                    title.textContent = __(item.custom_actual_doctype || item.ref_doctype);
                    cardWrapper.appendChild(title);

                    const card = document.createElement('div');
                    card.classList.add('card', 'mb-3');

                    const cardHeader = document.createElement('div');
                    cardHeader.classList.add('card-header');

                    const ownerText = document.createElement('p');
                    ownerText.style.marginBottom = '0px';
                    ownerText.textContent = item.owner;

                    const updateText = document.createElement('p');
                    updateText.style.marginBottom = '0px';
                    updateText.innerHTML = `<strong>Updated on:</strong> ${item.creation ? formatDateTime(item.creation, true, true) : '--:--'}`;

                    cardHeader.appendChild(ownerText);
                    cardHeader.appendChild(updateText);
                    card.appendChild(cardHeader);

                    const cardBody = document.createElement('div');
                    cardBody.classList.add('card-body');

                    const table = document.createElement('table');
                    table.classList.add('table', 'table-bordered');

                    const thead = document.createElement('thead');
                    thead.innerHTML = `<tr><th>Field</th><th>Old Value</th><th>New Value</th></tr>`;
                    table.appendChild(thead);

                    const tbody = document.createElement('tbody');
                    changes.forEach(change => {
                        const tr = document.createElement('tr');

                        const fieldTd = document.createElement('td');
                        fieldTd.style.width = '35%';
                        fieldTd.textContent = change[0];

                        const oldValueTd = document.createElement('td');
                        oldValueTd.style.backgroundColor = 'rgb(253,241,241)';
                        oldValueTd.textContent = change[1] ? change[1] : '';

                        const newValueTd = document.createElement('td');
                        newValueTd.style.backgroundColor = 'rgb(229,245,232)';
                        newValueTd.textContent = change[2] ? change[2] : '';

                        tr.appendChild(fieldTd);
                        tr.appendChild(oldValueTd);
                        tr.appendChild(newValueTd);
                        tbody.appendChild(tr);
                    });

                    table.appendChild(tbody);
                    cardBody.appendChild(table);
                    card.appendChild(cardBody);
                    cardWrapper.appendChild(card);
                    dataTimeline.appendChild(cardWrapper);
                }
            } else {
                const noChangesDiv = document.createElement('div');
                noChangesDiv.style.display = 'flex';
                noChangesDiv.style.justifyContent = 'center';
                noChangesDiv.style.alignItems = 'center';
                noChangesDiv.style.height = '75vh';
                noChangesDiv.style.width = '100%';
                noChangesDiv.textContent = 'No Changes Found';
                dataTimeline.appendChild(noChangesDiv);
            }
            timelineContainer.appendChild(dataTimeline);
            if (!this.wrapper.querySelector('#timeline-container')) {
                this.wrapper.appendChild(timelineContainer);
            }
        }).catch((error) => {
            this.timeline_wrapper.innerHTML = `<p style="color: red;">Failed to load timeline data.</p>`;
        });
        return this.wrapper;
    }
}