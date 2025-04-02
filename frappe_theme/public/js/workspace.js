const get_wrapper = (block_name)=>{
    return new Promise((rslv, rjct)=>{
        let index = 0;
        let interval = setInterval(() => {
            let wrapper = document.querySelector(`[custom_block_name="${block_name}"]`);
            if (wrapper) {
                rslv(wrapper)
            }
            index++;
            if (wrapper || index == 20) {
                clearInterval(interval);
                if(index == 20 && !wrapper){
                    rjct(false)
                }
            }
        }, 1000);
    });
}
if (frappe?.workspace_block.blocks?.custom_block) {
    frappe.workspace_block.blocks.custom_block = class SVACustomBlock extends frappe.workspace_block.blocks.custom_block {
        constructor(...args) {
            super(...args);
            if (this.readOnly) {
                this.render_sva_custom_block()
            }
        }
        async render_sva_custom_block() {
            let page_type = frappe.get_route()[0];
            if (page_type == "Workspaces") {
                let workspace_name = frappe.get_route()[1];
                let workspace_conf = frappe.boot?.sva_workspaces?.[workspace_name];
                let blocks = [
                    ...workspace_conf?.heatmaps.map((heatmap) => {return {...heatmap,'type':"Heatmap"}}),
                    ...workspace_conf?.tables.map((table) => {return {...table,'type':"SVATable"}})
                ]
                if(workspace_conf){
                    let block = blocks.find(block => (block?.custom_block || block?.custom_html_block) == this.data.custom_block_name);
                    let wrapper = await get_wrapper(block?.custom_block || block?.custom_html_block)

                    if(block && wrapper){
                        if(block.type == "Heatmap"){
                            new Heatmap({
                                wrapper: $(wrapper),
                                ...block,
                            })
                        }else if (block.type == 'SVATable') {
                            new SvaDataTable({
                                label: block?.title,
                                wrapper,
                                doctype: block?.link_doctype,
                                connection:block,
                                options:{
                                    serialNumberColumn: true,
                                    editable: false,
                                    style:{height:'237px'}
                                }
                            })
                        }
                    }
                }
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
