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

    public writeInit() {
        this.codeWriter.writeInit();
    }

    public async translate(inputPath: string): Promise<void> {
        const inputFileStream = fs.createReadStream(inputPath);
        const parser = new Parser(inputFileStream);
        const pathSplit = inputPath.split(path.sep);
        const moduleName = pathSplit[pathSplit.length - 1].split('.vm').filter((_, i, arr) => i < (arr.length - 1)).join('.vm');
        await parser.init();
        this.codeWriter.setModuleName(moduleName);
        while (parser.hasMoreCommands()) {
            parser.advance();
            const cmm = parser.getCommand();
            console.log(moduleName, cmm);
            switch (cmm.type) {
                case VMCommandType.C_PUSH: case VMCommandType.C_POP:
                    this.codeWriter.writePushPop(cmm.type, cmm.arg1, cmm.arg2);
                    break;
                case VMCommandType.C_ARITHMETIC:
                    this.codeWriter.writeArithmetic(cmm.arg1);
                    break;
                case VMCommandType.C_LABEL:
                    this.codeWriter.writeLabel(cmm.arg1);
                    break;
                case VMCommandType.C_GOTO:
                    this.codeWriter.writeGoto(cmm.arg1);
                    break;
                case VMCommandType.C_IF:
                    this.codeWriter.writeIf(cmm.arg1);
                    break;
                case VMCommandType.C_RETURN:
                    this.codeWriter.writeReturn();
                    break;
                case VMCommandType.C_CALL:
                    this.codeWriter.writeCall(cmm.arg1, cmm.arg2);
                    break;
                case VMCommandType.C_FUNCTION:
                    this.codeWriter.writeFunction(cmm.arg1, cmm.arg2);
                    break;
            }
        }
    }

    public close() {
        this.codeWriter.close();
    }
}