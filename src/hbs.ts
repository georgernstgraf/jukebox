import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import * as fs from 'fs/promises';
import * as  path from 'path';

export const map = new Map();
export function render(templateName: string, context: object): string {
    return map.get(templateName)(context,);
}

async function listHBSFilesRecursive(dir: string): Promise<string[]> {
    let results: string[] = [];
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of list) {
        const res = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            results = results.concat(await listHBSFilesRecursive(res));
        } else if (dirent.isFile() && res.endsWith('.hbs')) {
            results.push(res);
        }
    }
    return results;
}

async function loadTemplates() {
    const templatesDir = './partials';
    const hbsFiles = await listHBSFilesRecursive(templatesDir);
    for (const file of hbsFiles) {
        const templateName = file.replace(`${templatesDir.substring(2,)}/`, '').replace('.hbs', '');
        const templateSource = readFileSync(file, 'utf-8');
        const template = handlebars.compile(templateSource);
        map.set(templateName, template);
        handlebars.registerPartial(templateName, template);
    }
}
loadTemplates()
    .then(() => console.log('Templates loaded successfully:', [...map.keys()]))
    .catch(err => { console.error('Error loading templates:', err); process.exit(1); });
