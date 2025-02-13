class GalleryComponent {
    constructor(frm, wrapper) {
        this.frm = frm;
        this.wrapper = wrapper;
        this.gallery_files = [];
        this.selectedFiles = [];
        this.view = 'Card'; // Default view
        this.initialize();
    }

    async initialize() {
        try {
            if (!this.wrapper) {
                console.error('Wrapper element is null');
                return;
            }

            // Clear and initialize wrapper
            this.wrapper.innerHTML = `
                <div class="gallery-wrapper">
                    <div class="gallery-header" id="gallery-header"></div>
                    <div class="gallery-body" id="gallery-body"></div>
                </div>
            `;

            this.appendGalleryStyles();
            await this.fetchGalleryFiles();
            this.renderHeader();
            this.updateGallery();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error in initialize:', error);
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: __('Failed to initialize gallery: ') + (error.message || error)
            });
        }
    }

    appendGalleryStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .gallery-wrapper {
                height: calc(100vh - 270px);
                min-height: 400px;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .gallery-header {
                padding: 0px 0px 12px 0px;
                background: #fff;
                border-bottom: 1px solid #e2e2e2;
                z-index: 1;
            }
            .gallery-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
            }
            .empty-state {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 32px;
                text-align: center;
                color: #6E7073;
            }
            .empty-state i {
                font-size: 48px;
                margin-bottom: 16px;
                color: #E2E2E2;
            }
            .empty-state p {
                font-size: 16px;
                margin-bottom: 16px;
            }
            ${this.getCommonStyles()}
        `;
        document.head.appendChild(style);
    }

    getCommonStyles() {
        return `
            .gallery {
                margin-bottom: 20px;
            }
            .checkbox-container {
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 2;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .image-container:hover .checkbox-container {
                opacity: 1;
            }
            .checkbox-container input[type="checkbox"] {
                width: 20px !important;
                height: 20px !important;
                background-color: rgba(255, 255, 255, 0.9);
                border: 2px solid #fff;
                border-radius: 4px;
            }
            .card-img-top {
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            .image-card {
                width: 100%;
                background: white;
                border-radius: 8px;
            
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .image-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px rgba(0,0,0,0.15);
            }
            .image-container {
                position: relative;
            }
            .image-container:hover .image-cover {
                opacity: 1;
                visibility: visible;
            }
            .image-cover {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 200px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
            }
            .cover-header {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 2;
            }
            .cover-body {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .action-button {
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                color: #1F272E;
                transition: background-color 0.2s;
            }
            .action-button:hover {
                background: #ffffff;
            }
            .view-button {
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #1F272E;
                transition: transform 0.2s, background-color 0.2s;
                text-decoration: none;
            }
            .view-button:hover {
                transform: scale(1.1);
                background: #ffffff;
                text-decoration: none;
                color: #1F272E;
            }
            .file-name {
                padding: 12px;
                font-size: 14px;
                color: #1F272E;
                word-break: break-word;
            }
            .file-date {
                padding: 0 12px 12px;
                font-size: 12px;
                color: #6E7073;
            }
            @media (max-width: 768px) {
                .gallery-wrapper {
                    height: calc(100vh - 200px);
                }
                .card-img-top {
                    height: 160px;
                }
                .image-cover {
                    height: 160px;
                }
            }
        `;
    }

    async fetchGalleryFiles() {
        const loader = new Loader(this.wrapper.querySelector('.gallery-wrapper'), 'gallery-fetch-loader');
        try {
            loader.show();
            if (!this.frm || !this.frm.doc) {
                console.error('Form or document not initialized');
                return;
            }

            const filters = {
                'attached_to_name': ['=', this.frm.doc.name],
                'attached_to_doctype': ['=', this.frm.doc.doctype],
                'is_folder': 0
            };

            console.log('Fetching files with filters:', filters);

            this.gallery_files = await frappe.db.get_list('File', {
                fields: ['*'],  // Get all fields
                filters: filters,
                order_by: 'creation desc',
                limit: 1000,
            }) || [];

            console.log('Fetched files:', this.gallery_files);
            this.updateGallery();
        } catch (error) {
            console.error('Error fetching files:', error);
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: __('Error fetching files: ') + (error.message || error)
            });
        } finally {
            loader.hide();
        }
    }

    render() {
        this.wrapper.innerHTML = ''; // Clear existing content

        // Create wrapper with fixed height and scrollable content
        this.wrapper.innerHTML = `
            <div class="gallery-wrapper">
                <div class="gallery-header" id="gallery-header"></div>
                <div class="gallery-body" id="gallery-body"></div>
            </div>
        `;

        this.renderHeader();
        this.updateGallery();
    }

    renderHeader() {
        const headerHTML = `
            <div class="row" style="display: flex; justify-content: space-between; align-items: center; margin: 0;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span class="text-muted">Total records: ${this.gallery_files.length}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="btn btn-danger btn-sm" style="display:none;" id="deleteSelectedButton">
                        <i class="fa fa-trash"></i> Delete Selected
                    </button>
                    <div class="btn-group">
                        <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown">
                            <i class="fa ${this.view === 'Card' ? 'fa-th-large' : 'fa-list'}"></i> 
                            <span id="viewNameButton">${this.view} View</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-right">
                            <li><a class="dropdown-item" id="cardViewBtn"><i class="fa fa-th-large"></i> Card View</a></li>
                            <li><a class="dropdown-item" id="listViewBtn"><i class="fa fa-list"></i> List View</a></li>
                        </ul>
                    </div>
                    <button class="btn btn-primary btn-sm" id="customUploadButton">
                        <i class="fa fa-upload"></i> Upload
                    </button>
                </div>
            </div>
        `;
        this.wrapper.querySelector('#gallery-header').innerHTML = headerHTML;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fa fa-file-o"></i>
                <p>No files uploaded yet</p>
            </div>
        `;
    }

    renderCardView() {
        if (!this.gallery_files.length) {
            return this.renderEmptyState();
        }

        return `
            <div class="row">
                ${this.gallery_files.map(file => {
            let extension = file?.file_url?.split('.').pop()?.toLowerCase();
            return `
                        <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                            <div class="image-card">
                                <div class="image-container">
                                    ${this.getFilePreview(file, extension)}
                                    <div class="checkbox-container">
                                        <input type="checkbox" data-id="${file.name}" class="toggleCheckbox"/>
                                    </div>
                                    <div class="image-cover">
                                        <div class="cover-header">
                                            <div class="dropdown">
                                                <button class="action-button" data-toggle="dropdown">
                                                    <i class="fa fa-ellipsis-v"></i>
                                                </button>
                                                <div class="dropdown-menu dropdown-menu-right">
                                                    <a class="dropdown-item edit-btn" data-id="${file.name}">
                                                        <i class="fa fa-edit"></i> Edit
                                                    </a>
                                                    <a class="dropdown-item delete-btn" data-id="${file.name}">
                                                        <i class="fa fa-trash"></i> Delete
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="cover-body">
                                            <a href="javascript:void(0)" onclick="window.open('${file.file_url}', '_blank')" class="view-button">
                                                <i class="fa fa-eye"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div class="file-name">${file.file_name}</div>
                                <div class="file-date">${frappe.datetime.str_to_user(file.creation)}</div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    getFilePreview(file, extension) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
        const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt'];
        const videoExtensions = ['mp4', 'webm', 'mkv', 'mp3', '3gp', 'avi', 'mov'];

        if (imageExtensions.includes(extension)) {
            return `<img src="${file.file_url}" class="card-img-top" alt="${file.file_name}">`;
        } else if (documentExtensions.includes(extension)) {
            return `<img src="/assets/frappe/images/document.svg" class="card-img-top" style="object-fit: contain; padding: 20px;">`;
        } else if (videoExtensions.includes(extension)) {
            return `<img src="/assets/frappe/images/video.svg" class="card-img-top" style="object-fit: contain; padding: 20px;">`;
        } else {
            return `<img src="/assets/frappe/images/file.svg" class="card-img-top" style="object-fit: contain; padding: 20px;">`;
        }
    }

    async renderForm(mode, fileId = null) {
        const self = this;
        const loader = new Loader(this.wrapper.querySelector('.gallery-wrapper'), 'gallery-form-loader');
        let fields = [
            {
                label: 'File',
                fieldname: 'file',
                fieldtype: 'Attach',
                reqd: 1
            },
            {
                label: 'File Name',
                fieldname: 'file_name',
                fieldtype: 'Data',
                reqd: 1,
                description: 'Enter a name for your file'
            }
        ];

        if (mode === 'edit' && fileId) {
            try {
                loader.show();
                let doc = await frappe.db.get_doc('File', fileId);
                fields = fields.map(f => {
                    if (doc[f.fieldname]) {
                        f.default = doc[f.fieldname];
                    }
                    return f;
                });
            } catch (error) {
                console.error('Error fetching file:', error);
                frappe.msgprint(__('Error fetching file details. Please try again.'));
                return;
            } finally {
                loader.hide();
            }
        }

        const fileDialog = new frappe.ui.Dialog({
            title: mode === "create" ? __("Upload Files") : __("Edit File"),
            fields: fields,
            primary_action_label: mode === "create" ? __("Upload") : __("Save"),
            async primary_action(values) {
                try {
                    if (!values.file) {
                        frappe.msgprint(__('Please select a file to upload'));
                        return;
                    }

                    if (!values.file_name) {
                        values.file_name = values.file.split('/').pop().split('?')[0];
                    }

                    loader.show();

                    if (mode === 'create') {
                        let file_doc = {
                            doctype: 'File',
                            attached_to_doctype: self.frm?.doctype,
                            attached_to_name: self.frm?.docname,
                            file_url: values.file,
                            file_name: values.file_name,
                            is_private: 0
                        };

                        let new_file = await frappe.db.insert(file_doc);
                        if (new_file) {
                            let complete_file = await frappe.db.get_doc('File', new_file.name);
                            self.gallery_files.unshift(complete_file);
                            await self.fetchGalleryFiles();
                            frappe.show_alert({
                                message: __('File uploaded successfully'),
                                indicator: 'green'
                            });
                        }
                    } else {
                        let updated_file = await frappe.db.set_value('File', fileId, values);
                        if (updated_file?.message) {
                            self.gallery_files = self.gallery_files.map(file =>
                                file.name === fileId ? updated_file.message : file
                            );
                            await self.fetchGalleryFiles();
                            frappe.show_alert({
                                message: __('File updated successfully'),
                                indicator: 'green'
                            });
                        }
                    }

                    self.updateGallery();
                    this.hide();
                } catch (error) {
                    console.error('Error handling file:', error);
                    frappe.msgprint(`Error ${mode === 'create' ? 'uploading' : 'updating'} file: ${error.message || error}`);
                } finally {
                    loader.hide();
                }
            }
        });

        fileDialog.show();
        this.dialog = fileDialog;
    }

    attachEventListeners() {
        const self = this;

        $('#customUploadButton').off('click').on('click', async () => {
            await self.renderForm('create');
        });

        $('#deleteSelectedButton').off('click').on('click', async () => {
            if (self.selectedFiles.length === 0) {
                frappe.msgprint(__('Please select files to delete'));
                return;
            }

            frappe.confirm('Are you sure you want to delete the selected files?', async () => {
                const loader = new Loader(self.wrapper.querySelector('.gallery-wrapper'), 'gallery-delete-loader');
                try {
                    loader.show();
                    for (const fileId of self.selectedFiles) {
                        await frappe.db.delete_doc('File', fileId);
                    }
                    self.gallery_files = self.gallery_files.filter(file => !self.selectedFiles.includes(file.name));
                    self.selectedFiles = [];
                    self.updateSelectedFilesUI();
                    self.updateGallery();
                    frappe.show_alert({
                        message: __('Files deleted successfully'),
                        indicator: 'green'
                    });
                } catch (error) {
                    console.error("Error deleting files:", error);
                    frappe.msgprint(__('Error deleting files. Please try again.'));
                } finally {
                    loader.hide();
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

    attachGalleryItemEventListeners() {
        const self = this;

        $('.delete-btn').off('click').on('click', async function () {  // Remove previous handlers
            const fileId = $(this).data('id');
            if (fileId) {
                try {
                    frappe.confirm('Are you sure you want to delete this file?', async () => {
                        await frappe.db.delete_doc('File', fileId);
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

    renderListView() {
        if (!this.gallery_files.length) {
            return this.renderEmptyState();
        }

        return `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllCheckBox"></th>
                            <th>File Name</th>
                            <th>Upload Date</th>
                            <th>Preview</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.gallery_files.map(file => {
            let extension = file?.file_url?.split('.').pop()?.toLowerCase();
            return `
                                <tr>
                                    <td><input type="checkbox" class="toggleCheckbox" data-id="${file.name}"></td>
                                    <td>${file.file_name}</td>
                                    <td>${frappe.datetime.str_to_user(file.creation)}</td>
                                    <td>
                                        ${this.getFilePreview(file, extension)}
                                    </td>
                                    <td>
                                        <div class="dropdown">
                                            <button class="btn btn-sm btn-light" data-toggle="dropdown">
                                                <i class="fa fa-ellipsis-v"></i>
                                            </button>
                                            <div class="dropdown-menu dropdown-menu-right">
                                                <a class="dropdown-item edit-btn" data-id="${file.name}">
                                                    <i class="fa fa-edit"></i> Edit
                                                </a>
                                                <a class="dropdown-item delete-btn" data-id="${file.name}">
                                                    <i class="fa fa-trash"></i> Delete
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
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