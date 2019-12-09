import * as fs from 'fs';
import cColors from './ConsoleColors';
import * as path from 'path';
import { VMTranslator } from './VMTranslator';


main();

async function main() {

    let vmFiles: string[] = [];

    if (process.argv.length > 0) {
        const _path = process.argv[process.argv.length - 1];
        const stat = fs.statSync(_path);
        const isValidFile = stat.isFile() && _path.endsWith('.vm');
        const isFolder = stat.isDirectory();
        if (!isValidFile && !isFolder) {
            console.error(cColors.FgRed, "ERROR: You must provide a folder or .vm file to be compiled", cColors.Reset);
            process.exit(1);
        }
        const _vmFiles = isValidFile ?
            [_path] :
            fs.readdirSync(_path).filter(x => x.endsWith('.vm')).map(x => path.join(_path, x));
        vmFiles.push(..._vmFiles);
    }

    console.log('Files to compile: ', vmFiles.length);

    for (const filePath of vmFiles) {
        const t = new VMTranslator(filePath, filePath.substr(0, filePath.length - 2).concat('.asm'));
        await t.translate();
    }

    console.log(cColors.FgGreen, "DONE", cColors.Reset);
}