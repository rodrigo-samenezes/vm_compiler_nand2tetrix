import * as fs from 'fs';
import { VMCommandType } from './VMCommand';

export class CodeWriter {

    private labelsCount: number;
    private moduleName: string

    private segment2pointerMap = {
        local: 'LCL',
        argument: 'ARG',
        this: 'THIS',
        that: 'THAT',
        temp: (index: number) => `R${index + 5}`,
        pointer: (index: number) => `R${index + 3}`,
        static: (index: number) => `${this.moduleName}.${index}`,
    }

    constructor(private outputStream: fs.WriteStream) {
        /*
        this.wln('@256');
        this.wln('D=A');
        this.wln('@SP');
        this.wln('M=D');
        */
        this.labelsCount = 0;
    }

    public setModuleName(moduleName: string) {
        this.moduleName = moduleName;
    }

    private getLabelCount(): number {
        return this.labelsCount++;
    }

    public writeArithmetic(command: string): void {
        this.wln('@SP');
        this.wln('A=M-1');
        this.wln('D=M');
        this.wln('A=A-1');
        this.arithmeticFunctions[command]();
    }

    public writePushPop(command: VMCommandType.C_PUSH | VMCommandType.C_POP, segment: string, index: number): void {
        if (command === VMCommandType.C_PUSH) {
            switch (segment) {
                case 'constant':
                    this.wln('@' + index.toString());
                    this.wln('D=A');
                    this.wln('@SP');
                    this.wln('A=M');
                    this.wln('M=D');
                    this.wln('@SP');
                    this.wln('M=M+1');
                    break;
                case 'static': case 'temp': case 'pointer':
                    this.wln('@' + this.segment2pointerMap[segment](index));
                    this.wln('D=M');
                    this.wln('@SP');
                    this.wln('A=M');
                    this.wln('M=D');
                    this.wln('@SP');
                    this.wln('M=M+1');
                case 'local' || 'argument' || 'this' || 'that':
                    this.wln('@' + this.segment2pointerMap[segment]);
                    this.wln('D=M');
                    this.wln('@' + index.toString());
                    this.wln('A=D+A');
                    this.wln('D=M');
                    this.wln('@SP');
                    this.wln('A=M');
                    this.wln('M=D');
                    this.wln('@SP');
                    this.wln('M=M+1');
            }
        }
    }

    private wln(str: string): void {
        console.log(str);
        this.outputStream.write(str + "\n");
    }

    public close(): void {
        this.outputStream.end();
        this.outputStream.close();
    }

    private arithmeticFunctions = {
        add: () => {
            this.wln('@SP');
            this.wln('A=M-1');
            this.wln('D=M');
            this.wln('A=A-1');
            this.wln('M=M+D');
            this.wln('@SP');
            this.wln('M=M-1');
        },
        sub: () => {
            this.wln('@SP');
            this.wln('A=M-1');
            this.wln('D=M');
            this.wln('A=A-1');
            this.wln('M=M-D');
            this.wln('@SP');
            this.wln('M=M-1');
        },
        eq: () => {
            this.wln("@SP");
            this.wln("A=M");
            this.wln("A=A-1");
            this.wln("M=!M");
        },
        neg: () => {
            this.wln("@SP");
            this.wln("A=M");
            this.wln("A=A-1");
            this.wln("M=-M");
        },
        and: () => {
            this.wln("@SP // and");
            this.wln("AM=M-1");
            this.wln("D=M");
            this.wln("A=A-1");
            this.wln("M=D&M");
        },
        or: () => {
            this.wln("@SP // or");
            this.wln("AM=M-1");
            this.wln("D=M");
            this.wln("A=A-1");
            this.wln("M=D|M");
        },
        not: () => {
            this.wln("@SP");
            this.wln("A=M");
            this.wln("A=A-1");
            this.wln("M=!M");
        },
        gt: () => {
            const labelCount = this.getLabelCount();
            const labelTrue =`JGT_TRUE_${this.moduleName}_${labelCount}`;
            const labelFalse =`JGT_FALSE_${this.moduleName}_${labelCount}`;
            
            this.wln('@SP');
            this.wln('AM=M-1');
            this.wln('D=M');
            this.wln('@SP');
            this.wln('AM=M-1');
            this.wln('D=M-D');
            this.wln('@' + labelTrue);
            this.wln('D;JGT');
            this.wln('D=0');
            this.wln('@' + labelFalse);
            this.wln('0;JMP');
            this.wln(`(${labelTrue})`);
            this.wln('D=-1');
            this.wln(`(${labelFalse})`);
            this.wln('@SP');
            this.wln('A=M');
            this.wln('M=D');
            this.wln('@SP');
            this.wln('M=M+1');
        },
        lt: () => {
            const labelCount = this.getLabelCount();
            const labelTrue =`JGT_TRUE_${this.moduleName}_${labelCount}`;
            const labelFalse =`JGT_FALSE_${this.moduleName}_${labelCount}`;
        
            this.wln('@SP');
            this.wln('AM=M-1');
            this.wln('D=M');
            this.wln('@SP');
            this.wln('AM=M-1');
            this.wln('D=M-D');
            this.wln('@' + labelTrue);
            this.wln('D;JLT');
            this.wln('D=0');
            this.wln('@' + labelFalse);
            this.wln('0;JMP');
            this.wln(`(${labelTrue})`);
            this.wln('D=-1');
            this.wln(`(${labelFalse})`);
            this.wln('@SP');
            this.wln('A=M');
            this.wln('M=D');
            this.wln('@SP');
            this.wln('M=M+1');
        }
    }
}