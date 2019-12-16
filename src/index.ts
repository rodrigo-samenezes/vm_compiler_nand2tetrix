import * as fs from 'fs';
import cColors from './ConsoleColors';
import * as path from 'path';
import { VMTranslator } from './VMTranslator';


main();

async function main() {

    let vmFiles: string[] = [];
    let isValidFile: boolean, isFolder: boolean;
    let _path: string;
    if (process.argv.length > 0) {
        _path = process.argv[process.argv.length - 1];
        const stat = fs.statSync(_path);
        isValidFile = stat.isFile() && _path.endsWith('.vm');
        isFolder = stat.isDirectory();
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

    if (vmFiles.length > 0) {
        let outputFilePath: string;
        if (isFolder) {
            const folderName = _path
                                .split(path.sep)
                                .filter((_, i, arr) => i === (arr.length - 1));
            outputFilePath = path.join(_path, folderName + '.asm');
        }
        else {
            outputFilePath = vmFiles[0].substr(0, vmFiles[0].length - 3).concat('.asm');
        }
        const t = new VMTranslator(outputFilePath);
        if (vmFiles.length > 1) t.writeInit();
        for (const filePath of vmFiles) {
            await t.translate(filePath);
        }
        t.close();
    }

    console.log(cColors.FgGreen, "DONE", cColors.Reset);
}