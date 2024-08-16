// Define an async function to use await
const updateThemeLinks = async () => {
    try {
        // Get theme data
        let themeDoc = await getTheme();

        if (!themeDoc || !themeDoc.workspace) {
            console.error('No theme data or workspace found.');
            return;
        }

        // Map workspace data
        let arr = themeDoc.workspace.map(e => {
            if (!e.ref_doctype || !e.workspace) {
                console.error('Invalid workspace item:', e);
                return null;
            }
            return {
                path: `/app/${e.ref_doctype.toLowerCase().replace(' ', '-')}`,
                workspace: e.workspace
            };
        }).filter(e => e !== null);

        let nodes = await getElements('.desk-sidebar a', 5)
        nodes.forEach((e) => {
            let title = e.getAttribute('title');
            let path = arr.find(f => f.workspace == title)?.path;
            if (path) {
                e.setAttribute('href', path)
                console.log('Path:', path);
            }
        });
    } catch (error) {
        console.error('Error updating theme links:', error);
    }
}

updateThemeLinks();
