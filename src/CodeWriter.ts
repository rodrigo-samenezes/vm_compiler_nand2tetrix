import * as fs from 'fs';
import { VMCommandType } from './VMCommand';
import ConsoleColors from './ConsoleColors';

export class CodeWriter {

    private labelsCount: number;
    private callsCount: number;
    private returnSubCount: number;
    private moduleName: string;
    private currentFunctionName: string;

    private segment2pointerMap = {
        local: 'LCL',
        argument: 'ARG',
        'this': 'THIS',
        that: 'THAT',
        temp: (index: number) => `R${index + 5}`,
        pointer: (index: number) => `R${index + 3}`,
        static: (index: number) => {
            return this.moduleName + '.' + index;
        }
    }

    constructor(private outputStream: fs.WriteStream) {
        this.labelsCount = 0;
        this.callsCount = 0;
        this.returnSubCount = 0;
        this.currentFunctionName = '';
    }

    public setModuleName(moduleName: string) {
        //console.log(ConsoleColors.FgYellow, 'SET MODULE', moduleName, ConsoleColors.Reset);
        this.moduleName = moduleName;
    }

    public writeInit() {
        this.wln("@256");
        this.wln("D=A");
        this.wln("@SP");
        this.wln("M=D");
        this.writeCall("Sys.init", 0);
    }


    public writeLabel(label: string) {
        this.wln(`(${label})`);
    }

    public writeGoto(label: string) {
        this.wln(`@${label}`);
        this.wln("0;JMP");
    }

    public writeIf(label: string) {
        this.wln("@SP");
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("M=0");
        this.wln(`@${label}`);
        this.wln("D;JNE");
    }

    public writeFunction(functionName: string, nLocals: number) {
        const loopLabel = `${functionName}_INIT_LOCALS_LOOP`;
        const loopEndLabel = `${functionName}_INIT_LOCALS_END`;

        this.currentFunctionName = functionName;

        this.wln(`(${functionName}) // initializa local variables`);
        this.wln(`@${nLocals}`);
        this.wln("D=A");
        this.wln("@R13"); // temp
        this.wln("M=D");
        this.wln(`(${loopLabel})`);
        this.wln(`@${loopEndLabel}`);
        this.wln("D;JEQ");
        this.wln("@0");
        this.wln("D=A");
        this.wln("@SP");
        this.wln("A=M");
        this.wln("M=D");
        this.wln("@SP");
        this.wln("M=M+1");
        this.wln("@R13");
        this.wln("MD=M-1");
        this.wln(`@${loopLabel}`);
        this.wln("0;JMP");
        this.wln(`(${loopEndLabel})`);
    }

    public writeCall(functionName: string, numArgs: number) {
        /*
	   push return-address     // (using the label declared below)
	   push LCL                // save LCL of the calling function
	   push ARG                // save ARG of the calling function
	   push THIS               // save THIS of the calling function
	   push THAT               // save THAT of the calling function
	   ARG = SP-n-5            // reposition ARG (n = number of args)
	   LCL = SP                // reposiiton LCL
	   goto f                  // transfer control
	   (return-address)        // declare a label for the return-address
	*/

        const comment = `// call ${functionName} ${numArgs}`;
        const returnAddress = `${functionName}_RETURN_${this.getCallCount()}`;

        this.wln(`@${returnAddress} ${comment}`); // push return-addr
        this.wln("D=A");
        this.wln("@SP");
        this.wln("A=M");
        this.wln("M=D");
        this.wln("@SP");
        this.wln("M=M+1");

        this.internalWritePush("LCL");
        this.internalWritePush("ARG");
        this.internalWritePush("THIS");
        this.internalWritePush("THAT");

        this.wln(`@${numArgs}`); // ARG = SP-n-5
        this.wln("D=A");
        this.wln("@5");
        this.wln("D=D+A");
        this.wln("@SP");
        this.wln("D=M-D");
        this.wln("@ARG");
        this.wln("M=D");

        this.wln("@SP"); // LCL = SP
        this.wln("D=M");
        this.wln("@LCL");
        this.wln("M=D");

        this.writeGoto(functionName);

        this.wln(`(${returnAddress})`); // (return-address)
    }

    private getLabelCount(): number {
        return this.labelsCount++;
    }

    private getCallCount(): number {
        return this.callsCount++;
    }

    private getReturnSubCount(): number {
        return this.returnSubCount++;
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
                    const pointer = this.segment2pointerMap[segment](index);
                    //console.log('POINTER', pointer);
                    this.wln('@' + pointer);
                    this.wln('D=M');
                    this.wln('@SP');
                    this.wln('A=M');
                    this.wln('M=D');
                    this.wln('@SP');
                    this.wln('M=M+1');
                    break;
                case 'local': case 'argument': case 'this': case 'that':
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
                    break;
            }
        }
        else {
            switch (segment) {
                case "static": case "temp": case "pointer":
                    this.wln("@SP");
                    this.wln("M=M-1");
                    this.wln("A=M");
                    this.wln("D=M");
                    const pointer = this.segment2pointerMap[segment](index); 
                    this.wln('@' + pointer);
                    this.wln("M=D");
                    break;
                case "local": case "argument": case "this": case "that":
                    this.wln('@' + this.segment2pointerMap[segment]);
                    this.wln("D=M");
                    this.wln(`@${index}`);
                    this.wln("D=D+A");
                    this.wln("@R13");
                    this.wln("M=D");
                    this.wln("@SP");
                    this.wln("M=M-1");
                    this.wln("A=M");
                    this.wln("D=M");
                    this.wln("@R13");
                    this.wln("A=M");
                    this.wln("M=D");
                    break;
                default:
                    throw new Error("Error");
                    break;
            }
        }
    }

    private internalWritePush(value: string | number) {
        this.wln(`@${value}`);
        this.wln("D=M");
        this.wln("@SP");
        this.wln("A=M");
        this.wln("M=D");
        this.wln("@SP");
        this.wln("M=M+1");
    }

    public writeReturn() {
        this.wln("@LCL"); // FRAME = LCL
        this.wln("D=M");

        this.wln("@R13"); // R13 -> FRAME
        this.wln("M=D");

        this.wln("@5"); // RET = *(FRAME-5)
        this.wln("A=D-A");
        this.wln("D=M");
        this.wln("@R14"); // R14 -> RET
        this.wln("M=D");

        this.wln("@SP"); // *ARG = pop()
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@ARG");
        this.wln("A=M");
        this.wln("M=D");

        this.wln("D=A"); // SP = ARG+1
        this.wln("@SP");
        this.wln("M=D+1");

        this.wln("@R13"); // THAT = *(FRAME-1)
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@THAT");
        this.wln("M=D");

        this.wln("@R13"); // THIS = *(FRAME-2)
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@THIS");
        this.wln("M=D");

        this.wln("@R13"); // ARG = *(FRAME-3)
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@ARG");
        this.wln("M=D");

        this.wln("@R13"); // LCL = *(FRAME-4)
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@LCL");
        this.wln("M=D");

        this.wln("@R14"); // goto RET
        this.wln("A=M");
        this.wln("0;JMP");
    }

    private wln(str: string): void {
        //console.log(str);
        this.outputStream.write(str + "\n");
    }

    public close(): void {
        this.outputStream.end();
        this.outputStream.close();
    }

    private writeBinaryArithmetic() {
        this.wln('@SP');
        this.wln('AM=M-1');
        this.wln('D=M');
        this.wln('A=A-1');
    }

    private writeUnaryArithmetic() {
        this.wln('@SP');
        this.wln('A=M');
        this.wln('A=A-1');
    }

    private arithmeticFunctions = {
        add: () => {
            this.writeBinaryArithmetic();
            this.wln('M=D+M');
        },
        sub: () => {
            this.writeBinaryArithmetic();
            this.wln('M=M-D');
        },
        eq: () => {
            const label = `JEQ_${this.moduleName}_${this.getLabelCount()}`;
            this.wln("@SP // eq");
            this.wln("AM=M-1");
            this.wln("D=M");
            this.wln("@SP")
            this.wln("AM=M-1");
            this.wln("D=M-D");
            this.wln("@" + label);
            this.wln("D;JEQ");
            this.wln("D=1");
            this.wln("(" + label + ")");
            this.wln("D=D-1");
            this.wln("@SP");
            this.wln("A=M");
            this.wln("M=D");
            this.wln("@SP");
            this.wln("M=M+1");
        },
        neg: () => {
            this.writeUnaryArithmetic();
            this.wln('M=-M');
        },
        and: () => {
            this.writeBinaryArithmetic();
            this.wln('M=D&M');
        },
        or: () => {
            this.writeBinaryArithmetic();
            this.wln('M=D|M');
        },
        not: () => {
            this.writeUnaryArithmetic();
            this.wln('M=!M');
        },
        gt: () => {
            const labelCount = this.getLabelCount();
            const labelTrue = `JGT_TRUE_${this.moduleName}_${labelCount}`;
            const labelFalse = `JGT_FALSE_${this.moduleName}_${labelCount}`;

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
            const labelTrue = `JLT_TRUE_${this.moduleName}_${labelCount}`;
            const labelFalse = `JLT_FALSE_${this.moduleName}_${labelCount}`;

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