import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './Parser';
import { CodeWriter } from './CodeWriter';
import { VMCommandType } from './VMCommand';

export class VMTranslator {

    
    private codeWriter: CodeWriter

    constructor(private outputPath: string) {
        const outputFileStream = fs.createWriteStream(outputPath);
        this.codeWriter = new CodeWriter(outputFileStream);
    }   
    
    public async translate(inputPath: string): Promise<void> {
        const inputFileStream = fs.createReadStream(inputPath);
        const parser = new Parser(inputFileStream);
        const pathSplit = inputPath.split(path.sep);
        const moduleName = pathSplit[pathSplit.length - 1].split('.vm').filter((_, i, arr) => i < (arr.length - 1)).join('.vm');
        await parser.init();
        this.codeWriter.setModuleName(moduleName);
        while(parser.hasMoreCommands()) {
            parser.advance();
            const cmm = parser.getCommand();
            if (cmm.type === VMCommandType.C_PUSH || cmm.type === VMCommandType.C_POP){
                this.codeWriter.writePushPop(cmm.type, cmm.arg1, cmm.arg2);
            }
            else if (cmm.type === VMCommandType.C_ARITHMETIC) {
                this.codeWriter.writeArithmetic(cmm.arg1);
            }
            console.log(cmm);
        }
        this.codeWriter.close();
    }
}