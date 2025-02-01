var selectedFiles = [];
var gallery_files = [];
let galleryWrapper = document.querySelector('[data-fieldname="gallery"]');

function stripHtmlTags(input) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = input;
    return tempDiv.textContent || tempDiv.innerText || '';
}
const fileList = (file_list, selector) => {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
}
const append_gallery_styles = () => {
    // Append CSS Styles for the Gallery
    const style = document.createElement('style');
    style.innerHTML = `
    .gallery {
        margin-bottom: 20px;
    }
    .table {
        width: 100%;
        border-collapse: collapse;
    }
    /* Add styles for selected checkbox */
    .checkbox-container {
        display: flex;
        align-items: center;
    }
    .checkbox-container input[type="checkbox"] {
        margin-right: 10px;
    }
 
    /* Add checkbox on top of the image */
    .checkbox-container {
        position: absolute;
        top: 10px;
        left: 10px;
       /* Ensure checkbox is above the image */
    }
    .checkbox-container input[type="checkbox"] {
        width: 20px !important;
        height: 20px !important;
        background-color: rgba(0, 0, 0, 0.2); /* Semi-transparent background */
        border: 2px solid #fff; /* White border for visibility */
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
};

const renderCardView = (files) => {
    return `
            <div class="row mt-3" style ="hight:75% !important;"style="font-size:16px !important;">
                ${files.length > 0 ? `
                    
                ${files.filter(file => file.image.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]).map(file => {
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
                            ${stripHtmlTags(file.title)}
                            </p>
                        <p class="card-text px-2" style="font-weight: 400; margin: 0px 0px 5px 0px; color: #6E7073; font-size: 10px">${getFormattedDate(file.creation)}</p>
                    </div>
                `}).join('')}`

            : `<div style="width: 100%; height: 75vh; display: flex; align-items: center; justify-content: center;"><p>You haven't created a Record yet</p></div>`}
                </div>
            `;
}
const renderHeader = (files, view) => {
    return `
            <div class="row" id="galleryHeader" style="display: flex; justify-content: space-between; align-items: center; gap: 12px;padding:0px 14px;">
            <div style="gap: 16px; display: flex;">
            <span class="text-dark" style="font-weight: 400; font-size: 12px;">Total records: ${files.length}</span>
            </div>
            <div style="display: flex; gap: 12px;">
            <button class="btn btn-light" style="display:none;" id="deleteSelectedButton">
            <i class="fa fa-trash" style="color: #801621;"></i>
            </button>
            <div class="dropdown">
            <button class="btn btn-light" type="button" id="viewDropdown" data-toggle="dropdown">
            <i class="fa ${view === 'Card' ? 'fa-th-large' : 'fa-list'}" style="color: #6E7073;"></i> 
            <span style="color: #6E7073;" id="viewNameButton">${view} View</span>
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
}
const renderListView = (files) => {
    return `
           ${files.length > 0 ? `
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
            ${files.filter(file => file.image.match(/\.(pdf|jpg|jpeg|png|img|mp4|webmp|mkv)(\?|#|$)/i)?.[1]).map(file => {
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
                                <p title="action" class="pointer " id="dropdownMenuButton-" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <i class=" " style="transform: rotate(90deg); font-size: 16px; width: 20px; height: 20px;"></i>
                                </p>
                                <div class="dropdown-menu" aria-labelledby="dropdownMenuButton-${file.name}">
                                    <a class="dropdown-item edit-btn"  data-id="${file.name}">Edit</a>
                                    <a class="dropdown-item delete-btn"  data-id="${file.name}">Delete</a>
                                </div>
                            </div>
                        </td>
                    </tr>
                `}).join('')}
                </tbody>
                </table>
                </div>
            ` : `<div style="width: 100%; height: 75vh; display: flex; align-items: center; justify-content: center;">
                <p>You haven't created a Record yet</p>
            </div>`}
                `;
}

const renderForm = async (frm, mode, view, fileId = null) => {
    const docInfo = await frappe.call("frappe_theme.api.get_meta_fields", { doctype: 'Gallery' });
    let fields = [];
    if (mode === 'create') {
        fields = docInfo?.message?.map(f => {
            if (f.fieldname === "document_type") {
                f.default = frm.doc.doctype; // Set default document type
            } else if (f.fieldname === "related_to") {
                f.default = frm.doc.name; // Set default document name
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
    // Update the fields dynamically
    const galDialog = new frappe.ui.Dialog({
        title: mode == "create" ? __("Upload Files") : __("Edit File"),
        fields: fields,
        primary_action: async function (values) {
            if (mode == 'create') {
                let new_gal = await frappe.db.insert({ doctype: 'Gallery', ...values });
                gallery_files.push(new_gal);
            } else {
                let updated_gal = await frappe.db.set_value('Gallery', fileId, values);
                gallery_files = gallery_files.map(file => file.name === fileId ? updated_gal.message : file);
            }
            updateGallery(frm, gallery_files, view);
            galDialog.hide();
        },
    });
    galDialog.show();
}


const updateGallery = (frm, files, view) => {
    if (view === 'Card') {
        galleryWrapper.querySelector('#gallery-body').innerHTML = renderCardView(files);
        galleryWrapper.querySelector('#gallery-body').style.height = '75vh';
        galleryWrapper.querySelector('#gallery-body').style.minheight = '75vh';
        galleryWrapper.querySelector('#gallery-body').style.overflow = 'auto';

    } else {
        galleryWrapper.querySelector('#gallery-body').innerHTML = renderListView(files);
        galleryWrapper.querySelector('#gallery-body').style.height = '75vh';
    }

    $('.delete-btn').on('click', async function () {
        const fileId = $(this).data('id');
        if (fileId) {
            try {
                frappe.confirm('Are you sure you want to delete this file?', async () => {
                    await frappe.db.delete_doc('Gallery', fileId);
                    gallery_files = gallery_files.filter(file => file.name !== fileId);
                    updateGallery(frm, gallery_files, view);
                });
            } catch (error) {
                console.error(error);
            }
        }
    });
    // handle edit and delete button click event
    $('.edit-btn').on('click', async function () {
        const fileId = $(this).data('id');
        await renderForm(frm, 'edit', view, fileId);
    });
    $('.toggleCheckbox').on('change', function () {
        const fileId = $(this).data('id');
        if (this.checked) {
            selectedFiles.push(fileId);
        } else {
            selectedFiles = selectedFiles.filter((fid) => fid != fileId);
        }
        let deleteSelectedButton = document.getElementById('deleteSelectedButton');
        if (selectedFiles.length === gallery_files.length) {
            $('#selectAllCheckBox').prop('checked', true);
        }
        else {
            $('#selectAllCheckBox').prop('checked', false);
        }
        if (selectedFiles.length > 0) {
            deleteSelectedButton.style.display = 'block';
        } else {
            deleteSelectedButton.style.display = 'none';
        }
    });
    $('#selectAllCheckBox').on('change', function () {
        console.log('Select All Checkbox Clicked', this);
        const isChecked = this.checked; // Check if the "select all" checkbox is checked

        selectedFiles = isChecked ? gallery_files.map(file => file.name) : [];
        $('.toggleCheckbox').prop('checked', isChecked);
        // Show or hide the delete button based on whether any checkbox is selected
        if (selectedFiles.length > 0) {
            deleteSelectedButton.style.display = 'block';
        } else {
            deleteSelectedButton.style.display = 'none';
        }
    });
}
const gallery_image = async (frm, selector) => {
    toggleLoader(true, selector);
    var view = 'Card';
    append_gallery_styles();
    // Fetch files related to the document
    gallery_files = await frappe.db.get_list('Gallery', {
        fields: ['name', 'image', 'title', 'creation'],
        filters: {
            'related_to': ['=', frm.doc.name],
            'document_type': ['=', frm.doc.doctype],
        },
        limit: 1000,
    });
    galleryWrapper = document.querySelector(`[data-fieldname="${selector}"]`);
    let header_wrapper = document.createElement('div');
    header_wrapper.id = 'gallery-header';
    if (!galleryWrapper.querySelector('#gallery-header')) {
        galleryWrapper.appendChild(header_wrapper);
    }
    let body_wrapper = document.createElement('div');
    body_wrapper.id = 'gallery-body';
    if (!galleryWrapper.querySelector('#gallery-body')) {
        galleryWrapper.appendChild(body_wrapper);
    }
    galleryWrapper.querySelector('#gallery-header').innerHTML = renderHeader(gallery_files, 'Card');
    updateGallery(frm, gallery_files, view);
    // Handle Upload
    $('#customUploadButton').on('click', async () => {
        await renderForm(frm, 'create', view);
    });
    $('#deleteSelectedButton').on('click', async () => {
        frappe.confirm('Are you sure you want to delete the selected files?', async () => {
            for (const fileId of selectedFiles) {
                await frappe.db.delete_doc('Gallery', fileId);
            }
            // Remove deleted files from the files list
            gallery_files = gallery_files.filter(file => !selectedFiles.includes(file.name));
            selectedFiles = [];
            let deleteSelectedButton = document.getElementById('deleteSelectedButton');
            deleteSelectedButton.style.display = 'none';
            updateGallery(frm, gallery_files, view);
        });
    });

    $('#cardViewBtn').on('click', () => {
        view = 'Card';
        selectedFiles = [];
        $(document).find('#viewNameButton').text('Card View');
        let deleteSelectedButton = document.getElementById('deleteSelectedButton');
        deleteSelectedButton.style.display = 'none';
        updateGallery(frm, gallery_files, view);
    });
    $('#listViewBtn').on('click', () => {
        view = 'List';
        selectedFiles = [];
        $(document).find('#viewNameButton').text('List View');
        let deleteSelectedButton = document.getElementById('deleteSelectedButton');
        deleteSelectedButton.style.display = 'none';
        updateGallery(frm, gallery_files, view);
    });
    toggleLoader(false, selector);
};




//  Filter Button 

{/* <button class="btn btn-light filter-btn">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6E7073" class="bi bi-filter" viewBox="0 0 16 16">
        <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5" />
    </svg>
    <span class="mx-2">Filters</span>
</button> */}