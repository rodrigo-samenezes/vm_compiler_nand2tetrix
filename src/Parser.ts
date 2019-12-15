import * as fs from 'fs';
import { VMCommand, VMCommandType } from './VMCommand';

export class Parser{

    private lines: string[];
    private curLine: number;
    public static readonly vmSymbols = {
        arithmetics: ['add', 'sub', 'neg', 'eq', 'gt', 'lt', 'and', 'or', 'not'],
        memory: ['push', 'call']
    }
    private static commandsWithSecondArg: VMCommandType[] = [
        VMCommandType.C_PUSH, VMCommandType.C_POP, VMCommandType.C_FUNCTION, VMCommandType.C_CALL
    ];

    constructor (private fileReadStream: fs.ReadStream) {
    }

    public async init(): Promise<void> {
        let txt: string = await new Promise<string> (resolve => {
            const streamData = [];
            this.fileReadStream.on('data', (data) => streamData.push(data));
            this.fileReadStream.on('end', () => resolve(Buffer.concat(streamData).toString()));
        });
        this.fileReadStream.close();
        txt = txt.split("\r").join("");
        let split = txt.split(/\/\/.*\n/); //remove coments
        this.lines = split.join("").split("\n").filter(x => !!x);
        this.curLine = -1;
        this.fileReadStream.close();
    }

    public hasMoreCommands(): boolean {
        return this.curLine < (this.lines.length - 1);
    }
    
    public advance(): void {
        if (this.hasMoreCommands())
            this.curLine++; 
    }

    public getCommand(): VMCommand {
        const line = this.lines[this.curLine];
        const symbols = line.split(' ').filter(x => x != '');
        const type = this.indentifyType(symbols[0]);
        const cmm: VMCommand =  {
            type
        };
        if (type != VMCommandType.C_RETURN) {
            cmm.arg1 = symbols[type === VMCommandType.C_ARITHMETIC ? 0 : 1];
            if (Parser.commandsWithSecondArg.indexOf(type) !== -1) {
                cmm.arg2 = Number(symbols[2]);
            }
        }
        return cmm;
    }

    private indentifyType(cmm: string): VMCommandType {
        if (Parser.vmSymbols.arithmetics.indexOf(cmm) !== -1) {
            return VMCommandType.C_ARITHMETIC;
        }
        else if (Parser.vmSymbols.memory.indexOf(cmm) !== -1) {
            const mapper = {
                push: VMCommandType.C_PUSH,
                pop: VMCommandType.C_POP,
            };
            return mapper[cmm];
        }
        else {
            throw new Error("Error: Command Type not valid");
        }
    }

}