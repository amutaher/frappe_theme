if (frappe?.workspace_block.blocks?.custom_block) {
    frappe.workspace_block.blocks.custom_block = class SVACustomBlock extends frappe.workspace_block.blocks.custom_block {
        constructor(...args) {
            super(...args);
            if (this.readOnly) {
                this.render_sva_custom_block()
            }
        }
        render_sva_custom_block() {
            if (this.data.custom_block_name == "TESTING HEATMAP") {
                let index = 0;
                let interval = setInterval(() => {
                    let wrapper = document.querySelector('[custom_block_name="TESTING HEATMAP"]');
                    if (wrapper) {
                        console.log('index:', index);
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
            }
        }
    }

}

// // Define an async function to use await
// const updateThemeLinks = async () => {
//     try {
//         let themeDoc = await getTheme();
//         if (!themeDoc || !themeDoc?.workspace) {
//             console.error('No theme data or workspace found.');
//             return;
//         }
//         // Map workspace data
//         let arr = themeDoc?.workspace?.map(e => {
//             if (!e.ref_doctype || !e.workspace) {
//                 console.error('Invalid workspace item:', e);
//                 return null;
//             }
//             return {
//                 path: `/app/${e.ref_doctype.toLowerCase().replace(/\s+/g, '-')}`,
//                 workspace: e.workspace
//             };
//         }).filter(e => e !== null);
//         if (themeDoc?.sidebar_element_selector) {
//             let nodes = await getElements(themeDoc?.sidebar_element_selector, 5)
//             nodes.forEach((e) => {
//                 let title = e.getAttribute('title');
//                 let path = arr.find(f => f.workspace == title)?.path;
//                 if (path) {
//                     e.setAttribute('href', path)
//                     // console.log('Path:', path);
//                 }else{
//                     let url = e.getAttribute('href');
//                     if(url?.includes('/app/')){
//                         e.setAttribute('target', 'self');
//                     }
//                 }
//             });
//         }
//     } catch (error) {
//         console.error('Error updating theme links:', error);
//     }
// }

// frappe.router.on('change', () => {
//     updateThemeLinks();
// });
