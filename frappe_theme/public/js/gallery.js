
class GalleryComponent {
    constructor(frm, wrapper) {
        this.frm = frm;
        this.wrapper = wrapper;
        this.gallery_files = [];
        this.selectedFiles = [];
        this.view = 'Card'; // Default view
        this.initialize();
        return this.wrapper;
    }

    async initialize() {
        this.appendGalleryStyles();
        await this.fetchGalleryFiles();
        this.render();
        this.attachEventListeners();
    }

    appendGalleryStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .gallery {
                margin-bottom: 20px;
            }
            .table {
                width: 100%;
                border-collapse: collapse;
            }
            .checkbox-container {
                display: flex;
                align-items: center;
                position: absolute;
                top: 10px;
                left: 10px;
            }
            .checkbox-container input[type="checkbox"] {
                width: 20px !important;
                height: 20px !important;
                background-color: rgba(0, 0, 0, 0.2);
                border: 2px solid #fff;
            }
            .card-img-top{
                width: 100%;
                height: 200px;
                object-fit: cover;
            }
            .image-card {
                width: 100%;
            }
            .image-container {
                position: relative;
            }
            .image-container:hover .image-cover {
                display: block;
            }
            .image-container input[type="checkbox"]:checked ~ .image-cover {
                display: block;
            }
            .cover-header {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                width: 100%;
                padding: 10px;
            }
            .image-cover {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 200px;
                display: none;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                background-color: rgba(0, 0, 0, 0.4);
            }
            .dropdown-menu a i {
                margin-right: 5px;
            }
            .pointer {
                cursor: pointer;
            }
            .col-sm-6 {
                padding-right: 0px !important;
            }
        `;
        document.head.appendChild(style);
    }

    async fetchGalleryFiles() {
        this.gallery_files = await frappe.db.get_list('Gallery', {
            fields: ['name', 'image', 'title', 'creation'],
            filters: {
                'related_to': ['=', this.frm.doc.name],
                'document_type': ['=', this.frm.doc.doctype],
            },
            limit: 1000,
        });
    }

    stripHtmlTags(input) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = input;
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    render() {
        this.wrapper.innerHTML = ''; // Clear existing content
        const headerWrapper = document.createElement('div');
        headerWrapper.id = 'gallery-header';
        this.wrapper.appendChild(headerWrapper);

        const bodyWrapper = document.createElement('div');
        bodyWrapper.id = 'gallery-body';
        this.wrapper.appendChild(bodyWrapper);

        this.renderHeader();
        this.updateGallery();
    }

    renderHeader() {
        const headerHTML = `
            <div class="row" id="galleryHeader" style="display: flex; justify-content: space-between; align-items: center; gap: 12px;padding:0px 14px;">
                <div style="gap: 16px; display: flex;">
                    <span class="text-dark" style="font-weight: 400; font-size: 12px;">Total records: ${this.gallery_files.length}</span>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-light" style="display:none;" id="deleteSelectedButton">
                        <i class="fa fa-trash" style="color: #801621;"></i>
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-light" type="button" id="viewDropdown" data-toggle="dropdown">
                            <i class="fa ${this.view === 'Card' ? 'fa-th-large' : 'fa-list'}" style="color: #6E7073;"></i> 
                            <span style="color: #6E7073;" id="viewNameButton">${this.view} View</span>
                            <i class="fa fa-sort" style="color: #6E7073;"></i>
                        </button>
                        <div class="dropdown-menu">
                            <span class="dropdown-item" id="cardViewBtn"><i class="fa fa-th-large"></i> Card View</span>
                            <span class="dropdown-item" id="listViewBtn"><i class="fa fa-list"></i> List View</span>
                        </div>
                    </div>
                    <button class="btn " id="customUploadButton" style="background-color: #801621; color: white; width: 90px; height: 28px; border-radius: 8px; font-size: 14px;">+ Upload</button>
                </div>
            </div>
        `;
        this.wrapper.querySelector('#gallery-header').innerHTML = headerHTML;
    }

    renderCardView() {
        const cardViewHTML = `
            <div class="row mt-3" style ="hight:75% !important;"style="font-size:16px !important;">
                ${this.gallery_files.length > 0 ? `
                    ${this.gallery_files.filter(file => file.image.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]).map(file => {
            let extention = file.image.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]?.toLowerCase();
            return `
                            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4 ">
                                <div class="card gallery image-container">
                                    <div class="image-card">
                                        ${(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods'].includes(extention)) ?
                    `<img src="/assets/mgrant/images/pdf-plchldr.png" style="object-fit: contain;" class="card-img-top">`
                    :
                    (['mp4', 'webm', 'mkv', 'mp3', '3gp', 'avi', 'mov', 'flv', 'wmv', 'm4v'].includes(extention)) ?
                        `<img src="/assets/mgrant/images/video-plchldr.png" style="object-fit: contain;" class="card-img-top">`
                        :
                        (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'].includes(extention)) ?
                            `<img src="${file.image}" class="card-img-top" alt="${file.title}">`
                            :
                            `<img src="/assets/mgrant/images/default-plchldr.png" style="object-fit: contain;" class="card-img-top">`}
                                    </div>
                                    <div class="image-cover">
                                        <div class="cover-header">
                                            <div class="checkbox-container" >
                                                <input type="checkbox" data-id="${file.name}" class="toggleCheckbox"/>
                                            </div>
                                            <div class="dropdown dropeditBBTn">
                                                <p title="action" class="pointer " id="dropdownMenuButton-${file.name}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i class="fa fa-ellipsis-h " style="transform: rotate(90deg); font-size: 16px; width: 20px; height: 20px; color: white;"></i>
                                                </p>
                                                <div class="dropdown-menu" aria-labelledby="dropdownMenuButton-${file.name}">
                                                    <a class="dropdown-item edit-btn"  data-id="${file.name}">Edit</a>
                                                    <a class="dropdown-item delete-btn"  data-id="${file.name}">Delete</a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="cover-body" style="display:flex;align-items:center;justify-content:center;width:100%;">
                                            <a href="${file.image}" target="__blank" style="margin-top:20px;max-width:50px;max-height:50px;padding:5px;border-radius:50%;background:#E2E2E2;"><img src="/assets/mgrant/images/eye-icon.png" style="max-width:30px;max-height:30px;"/></a>
                                        </div>
                                    </div>
                                </div>
                                <p class="card-text px-2"
                                    style="max-height:20px;min-height:20px;overflow:hidden; margin: -20px 0px 0px 0px !important; color: #0E1116; font-size: 14px"
                                    data-toggle="tooltip"
                                    data-placement="bottom"
                                    title='${file.title}' 
                                    data-html="true">
                                    ${this.stripHtmlTags(file.title)}
                                </p>
                                <p class="card-text px-2" style="font-weight: 400; margin: 0px 0px 5px 0px; color: #6E7073; font-size: 10px">${getFormattedDate(file.creation)}</p>
                            </div>
                        `;
        }).join('')}`
                : `<div style="width: 100%; height: 75vh; display: flex; align-items: center; justify-content: center;"><p>You haven't created a Record yet</p></div>`}
            </div>
        `;
        return cardViewHTML;
    }

    renderCardView() {
        const cardViewHTML = `
            <div class="row mt-3" style ="hight:75% !important;"style="font-size:16px !important;">
                ${this.gallery_files.length > 0 ? `
                    ${this.gallery_files.filter(file => file?.image?.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]).map(file => {
            let extention = file?.image?.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]?.toLowerCase();
            return `
                            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4 ">
                                <div class="card gallery image-container">
                                    <div class="image-card">
                                        ${(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods'].includes(extention)) ?
                    `<img src="/assets/mgrant/images/pdf-plchldr.png" style="object-fit: contain;" class="card-img-top">`
                    :
                    (['mp4', 'webm', 'mkv', 'mp3', '3gp', 'avi', 'mov', 'flv', 'wmv', 'm4v'].includes(extention)) ?
                        `<img src="/assets/mgrant/images/video-plchldr.png" style="object-fit: contain;" class="card-img-top">`
                        :
                        (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'].includes(extention)) ?
                            `<img src="${file.image}" class="card-img-top" alt="${file.title}">`
                            :
                            `<img src="/assets/mgrant/images/default-plchldr.png" style="object-fit: contain;" class="card-img-top">`}
                                    </div>
                                    <div class="image-cover">
                                        <div class="cover-header">
                                            <div class="checkbox-container" >
                                                <input type="checkbox" data-id="${file.name}" class="toggleCheckbox"/>
                                            </div>
                                            <div class="dropdown dropeditBBTn">
                                                <p title="action" class="pointer " id="dropdownMenuButton-${file.name}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i class="fa fa-ellipsis-h " style="transform: rotate(90deg); font-size: 16px; width: 20px; height: 20px; color: white;"></i>
                                                </p>
                                                <div class="dropdown-menu" aria-labelledby="dropdownMenuButton-${file.name}">
                                                    <a class="dropdown-item edit-btn"  data-id="${file.name}">Edit</a>
                                                    <a class="dropdown-item delete-btn"  data-id="${file.name}">Delete</a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="cover-body" style="display:flex;align-items:center;justify-content:center;width:100%;">
                                            <a href="${file.image}" target="__blank" style="margin-top:20px;max-width:50px;max-height:50px;padding:5px;border-radius:50%;background:#E2E2E2;"><img src="/assets/mgrant/images/eye-icon.png" style="max-width:30px;max-height:30px;"/></a>
                                        </div>
                                    </div>
                                </div>
                                <p class="card-text px-2"
                                    style="max-height:20px;min-height:20px;overflow:hidden; margin: -20px 0px 0px 0px !important; color: #0E1116; font-size: 14px"
                                    data-toggle="tooltip"
                                    data-placement="bottom"
                                    title='${file.title}' 
                                    data-html="true">
                                    ${this.stripHtmlTags(file.title)}
                                </p>
                                <p class="card-text px-2" style="font-weight: 400; margin: 0px 0px 5px 0px; color: #6E7073; font-size: 10px">${getFormattedDate(file.creation)}</p>
                            </div>
                        `;
        }).join('')}`
                : `<div style="width: 100%; height: 75vh; display: flex; align-items: center; justify-content: center;"><p>You haven't created a Record yet</p></div>`}
            </div>
        `;
        return cardViewHTML;
    }

    renderListView() {
        const listViewHTML = `
            ${this.gallery_files.length > 0 ? `
                <div class="table-responsive">
                    <table class="table table-bordered mt-3">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="selectAllCheckBox" style="width: 20px !important; height: 20px !important;"></th>
                                <th style="font-weight: 400; font-size: 14px; line-height: 15.4px; letter-spacing: 0.25%; color: #6E7073;">Item</th>
                                <th style="font-weight: 400; font-size: 14px; line-height: 15.4px; letter-spacing: 0.25%; color: #6E7073;">Upload Date</th>
                                <th style="font-weight: 400; font-size: 14px; line-height: 15.4px; letter-spacing: 0.25%; color: #6E7073;">File</th>
                                <th style="font-weight: 400; font-size: 14px; line-height: 15.4px; letter-spacing: 0.25%; color: #6E7073;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.gallery_files.filter(file => file.image.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]).map(file => {
            let extention = file.image.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]?.toLowerCase();
            return `
                                    <tr>
                                        <td><input type="checkbox" class="toggleCheckbox" data-id="${file.name}" style="width: 20px !important; height: 20px !important;"></td>
                                        <td>${file.title}</td>
                                        <td style="min-width:100px;">${getFormattedDate(file.creation)}</td>
                                        <td>
                                            <a href="${file.image}" target="__blank">
                                                ${(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods'].includes(extention)) ?
                    `<img src="/assets/mgrant/images/pdf-plchldr.png" style="object-fit: contain;width: 32px; max-height: 27px !important; border-radius: 4px;" class="card-img-top">`
                    :
                    (['mp4', 'webm', 'mkv', 'mp3', '3gp', 'avi', 'mov', 'flv', 'wmv', 'm4v'].includes(extention)) ?
                        `<img src="/assets/mgrant/images/video-plchldr.png" style="object-fit: contain;width: 32px; max-height: 27px !important; border-radius: 4px;" class="card-img-top">`
                        :
                        (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'].includes(extention)) ?
                            `<img src="${file.image}" style="width: 32px; max-height: 27px !important; border-radius: 4px; object:cover;" alt="${file.title}">`
                            :
                            `<img src="/assets/mgrant/images/default-plchldr.png" style="object-fit: contain;width: 32px; max-height: 27px !important; border-radius: 4px;" class="card-img-top">`}
                                            </a>
                                        </td>
                                        <td>
                                            <div class="dropdown">
                                                <p title="action" class="pointer " id="dropdownMenuButton-${file.name}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                    <i class="fa fa-ellipsis-h " style="transform: rotate(90deg); font-size: 16px; width: 20px; height: 20px;"></i>
                                                </p>
                                                <div class="dropdown-menu" aria-labelledby="dropdownMenuButton-${file.name}">
                                                    <a class="dropdown-item edit-btn"  data-id="${file.name}">Edit</a>
                                                    <a class="dropdown-item delete-btn"  data-id="${file.name}">Delete</a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<div style="width: 100%; height: 75vh; display: flex; align-items: center; justify-content: center;">
                    <p>You haven't created a Record yet</p>
                </div>`}
        `;
        return listViewHTML;
    }

    updateGallery() {
        console.log('called', 'updateGallery');
        const bodyWrapper = this.wrapper.querySelector('#gallery-body');
        if (this.view === 'Card') {
            bodyWrapper.innerHTML = this.renderCardView();
        } else {
            bodyWrapper.innerHTML = this.renderListView();
        }
        bodyWrapper.style.height = '75vh';
        bodyWrapper.style.minHeight = '500px';
        bodyWrapper.style.overflow = 'auto';
        this.attachGalleryItemEventListeners(); // Attach event listeners to gallery items
    }

    attachGalleryItemEventListeners() {
        const self = this; // Store 'this' context for use in event handlers

        $('.delete-btn').off('click').on('click', async function () {  // Remove previous handlers
            const fileId = $(this).data('id');
            if (fileId) {
                try {
                    frappe.confirm('Are you sure you want to delete this file?', async () => {
                        await frappe.db.delete_doc('Gallery', fileId);
                        self.gallery_files = self.gallery_files.filter(file => file.name !== fileId);
                        self.updateGallery();
                    });
                } catch (error) {
                    console.error(error);
                }
            }
        });

        $('.edit-btn').off('click').on('click', async function () { // Remove previous handlers
            const fileId = $(this).data('id');
            await self.renderForm('edit', fileId); // Use self here
        });

        $('.toggleCheckbox').off('change').on('change', function () { // Remove previous handlers
            const fileId = $(this).data('id');
            if (this.checked) {
                self.selectedFiles.push(fileId); // Use self here
            } else {
                self.selectedFiles = self.selectedFiles.filter((fid) => fid != fileId); // Use self here
            }
            self.updateSelectedFilesUI(); // Call a function to update the UI
        });

        $('#selectAllCheckBox').off('change').on('change', function () {// ... (from previous part)
            const isChecked = this.checked;

            self.selectedFiles = isChecked ? self.gallery_files.map(file => file.name) : []; // Use self here
            $('.toggleCheckbox').prop('checked', isChecked);
            self.updateSelectedFilesUI(); // Call a function to update the UI
        });
    }

    updateSelectedFilesUI() {
        const deleteSelectedButton = document.getElementById('deleteSelectedButton');
        if (this.selectedFiles.length === this.gallery_files.length) {
            $('#selectAllCheckBox').prop('checked', true);
        } else {
            $('#selectAllCheckBox').prop('checked', false);
        }

        if (this.selectedFiles.length > 0) {
            deleteSelectedButton.style.display = 'block';
        } else {
            deleteSelectedButton.style.display = 'none';
        }
    }

    async renderForm(mode, fileId = null) {
        const docInfo = await frappe.call("frappe_theme.api.get_meta_fields", { doctype: 'Gallery' });
        let fields = [];
        if (mode === 'create') {
            fields = docInfo?.message?.map(f => {
                if (f.fieldname === "document_type") {
                    f.default = this.frm.doc.doctype;
                } else if (f.fieldname === "related_to") {
                    f.default = this.frm.doc.name;
                }
                return f;
            });
        } else {
            if (!fileId) {
                frappe.msgprint(__('File ID is missing.'));
                return;
            }
            let doc = await frappe.db.get_doc('Gallery', fileId);
            fields = docInfo?.message.map(f => {
                if (doc[f.fieldname]) {
                    f.default = doc[f.fieldname];
                }
                return f;
            });
        }

        const galDialog = new frappe.ui.Dialog({
            title: mode == "create" ? __("Upload Files") : __("Edit File"),
            fields: fields,
            primary_action: async (values) => {
                if (mode == 'create') {
                    try {
                        let new_gal = await frappe.db.insert({ doctype: 'Gallery', ...values });
                        this.gallery_files.push(new_gal); // Add the new file object
                    } catch (error) {
                        frappe.msgprint(`Error creating file: ${error}`);
                        return; // Stop if there's an error
                    }
                } else {
                    try {
                        let updated_gal = await frappe.db.set_value('Gallery', fileId, values);
                        this.gallery_files = this.gallery_files.map(file => file.name === fileId ? updated_gal.message : file);
                    } catch (error) {
                        frappe.msgprint(`Error updating file: ${error}`);
                        return; // Stop if there's an error
                    }
                }
                this.updateGallery(); // Update the gallery display
                galDialog.hide();
            },
        });
        galDialog.show();
    }


    attachEventListeners() {
        const self = this;  // Store 'this' context

        $('#customUploadButton').off('click').on('click', async () => {
            await self.renderForm('create');
        });

        $('#deleteSelectedButton').off('click').on('click', async () => {
            frappe.confirm('Are you sure you want to delete the selected files?', async () => {
                try {
                    for (const fileId of self.selectedFiles) {
                        await frappe.db.delete_doc('Gallery', fileId);
                    }
                    self.gallery_files = self.gallery_files.filter(file => !self.selectedFiles.includes(file.name));
                    self.selectedFiles = [];
                    self.updateSelectedFilesUI();
                    self.updateGallery();
                } catch (error) {
                    console.error("Error deleting selected files:", error);
                }
            });
        });

        $('#cardViewBtn').off('click').on('click', () => {
            self.view = 'Card';
            self.selectedFiles = [];
            $('#viewNameButton').text('Card View');
            self.updateSelectedFilesUI();
            self.updateGallery();
        });

        $('#listViewBtn').off('click').on('click', () => {
            self.view = 'List';
            self.selectedFiles = [];
            $('#viewNameButton').text('List View');
            self.updateSelectedFilesUI();
            self.updateGallery();
        });

        this.attachGalleryItemEventListeners(); // Attach event listeners to gallery items
    }
}

async function gallery_image(frm, selector) {
    const wrapper = document.querySelector(`[data-fieldname="${selector}"]`);
    if (wrapper) {
        const galleryComponent = new GalleryComponent(frm, wrapper);
        await galleryComponent.initialize();
    } else {
        console.error("Wrapper element not found!");
    }
}