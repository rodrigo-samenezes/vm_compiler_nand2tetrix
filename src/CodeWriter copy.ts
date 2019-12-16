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
        this: 'THIS',
        that: 'THAT',
        temp: (index: number) => `R${index + 5}`,
        pointer: (index: number) => `R${index + 3}`,
        static: (index: number) => `${this.moduleName}.${index}`,
    }

    constructor(private outputStream: fs.WriteStream) {
        this.labelsCount = 0;
        this.callsCount = 0;
        this.returnSubCount = 0;
        this.writeInit();
    }

    public setModuleName(moduleName: string) {
        console.log(ConsoleColors.FgYellow, 'SET MODULE', moduleName, ConsoleColors.Reset);
        this.moduleName = moduleName;
    }

    public writeInit() {
        this.wln("@256");
        this.wln("D=A");
        this.wln("@SP");
        this.wln("M=D");
        this.writeCall("Sys.init", 0);
        this.writeSubRoutineReturn();
        this.writeSubArithmeticLt();
        this.writeSubArithmeticGt();
        this.writeSubArithmeticEq();
        this.writeSubFrame();
    }

    private writeSubFrame() {
        this.wln("($FRAME$)");
        this.wln("@R15");
        this.wln("M=D");
    
        this.internalWritePush("LCL");
        this.internalWritePush("ARG");
        this.internalWritePush("THIS");
        this.internalWritePush("THAT");
    
        this.wln("@R15");
        this.wln("A=M");
        this.wln("0;JMP");
    }

    private writeSubRoutineReturn() {
        this.wln("($RETURN$)")
        this.wln("@R15")
        this.wln("M=D")

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
    
        this.wln("@R15");
        this.wln("A=M");
        this.wln("0;JMP");
    }
    
    private writeSubArithmeticEq() {
    
        this.wln("($EQ$)");
        this.wln("@R15");
        this.wln("M=D");
    
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
    
        this.wln("@R15");
        this.wln("A=M");
        this.wln("0;JMP");
    }
    
    private writeSubArithmeticGt() {
        this.wln("($GT$)");
        this.wln("@R15");
        this.wln("M=D");
    
        const labelCount = this.getLabelCount();
        const labelTrue = `JGT_TRUE_${this.moduleName}_${labelCount}`;
        const labelFalse = `JGT_FALSE_${this.moduleName}_${labelCount}`;
    
        this.wln("@SP // gt");
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@SP");
        this.wln("AM=M-1");
        this.wln("D=M-D");
        this.wln("@" + labelTrue);
        this.wln("D;JGT");
        this.wln("D=0");
        this.wln("@" + labelFalse);
        this.wln("0;JMP");
        this.wln("(" + labelTrue + ")");
        this.wln("D=-1");
        this.wln("(" + labelFalse + ")");
        this.wln("@SP");
        this.wln("A=M");
        this.wln("M=D");
        this.wln("@SP");
        this.wln("M=M+1");
    
        this.wln("@R15");
        this.wln("A=M");
        this.wln("0;JMP");
    }
    
    private writeSubArithmeticLt() {
    
        this.wln("($LT$)")
        this.wln("@R15")
        this.wln("M=D")
    
        const labelCount = this.getLabelCount();
        const labelTrue = `JLT_TRUE_${this.moduleName}_${labelCount}`;
        const labelFalse = `JLT_FALSE_${this.moduleName}_${labelCount}`;
    
        this.wln("@SP // lt");
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("@SP");
        this.wln("AM=M-1");
        this.wln("D=M-D");
        this.wln("@" + labelTrue + "");
        this.wln("D;JLT");
        this.wln("D=0");
        this.wln("@" + labelFalse + "");
        this.wln("0;JMP");
        this.wln("(" + labelTrue + ")");
        this.wln("D=-1");
        this.wln("(" + labelFalse + ")");
        this.wln("@SP");
        this.wln("A=M");
        this.wln("M=D");
        this.wln("@SP");
        this.wln("M=M+1");
    
        this.wln("@R15");
        this.wln("A=M");
        this.wln("0;JMP");
    }

    public writeLabel(label: string) {
        this.wln(`(${this.currentFunctionName}$${label})`);
    }

    public writeGoto(label: string) {
        this.wln(`@${this.currentFunctionName}$${label}`);
        this.wln("0;JMP");
    }

    public writeIf(label: string) {
        this.wln("@SP");
        this.wln("AM=M-1");
        this.wln("D=M");
        this.wln("M=0");
        this.wln(`@(${this.currentFunctionName}$${label})`);
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

        const returnFrame = `$RET${this.getReturnSubCount()}`;
        this.wln(`@${returnFrame}`);
        this.wln("D=A");
        this.wln("@$FRAME$");
        this.wln("0;JMP");
        this.wln(`(${returnFrame})`);

        this.wln(`@${numArgs}`) // ARG = SP-n-5
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

        //code.WriteGoto(funcName)
        this.wln(`@${functionName}`);
        this.wln("0;JMP");

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
        const returnAddress = `$RET${this.getReturnSubCount()}`;
        this.wln(`@${returnAddress}`);
        this.wln("D=A");
        this.wln("@$RETURN$");
        this.wln("0;JMP");
        this.wln(`(${returnAddress})`);
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
            const labelTrue = `JGT_TRUE_${this.moduleName}_${labelCount}`;
            const labelFalse = `JGT_FALSE_${this.moduleName}_${labelCount}`;

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