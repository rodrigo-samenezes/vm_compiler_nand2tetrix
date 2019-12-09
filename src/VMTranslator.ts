import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './Parser';
import { CodeWriter } from './CodeWriter';
import { VMCommandType } from './VMCommand';

export class VMTranslator {

    private parser: Parser;
    private codeWriter: CodeWriter

    constructor(private input: string, private output: string) {
        const inputFileStream = fs.createReadStream(input);
        const outputFileStream = fs.createWriteStream(output);
        this.parser = new Parser(inputFileStream);
        const pathSplit = input.split(path.sep);
        const moduleName = pathSplit[pathSplit.length - 1].split('.vm').filter((_, i, arr) => i < (arr.length - 1)).join('.vm');
        this.codeWriter = new CodeWriter(outputFileStream, moduleName);
    }   

    public async translate(): Promise<void> {
        await this.parser.init();
        while(this.parser.hasMoreCommands()) {
            this.parser.advance();
            const cmm = this.parser.getCommand();
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