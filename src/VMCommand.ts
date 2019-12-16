export enum VMCommandType {
    C_ARITHMETIC, C_PUSH, C_POP, C_LABEL, C_GOTO,
    C_IF, C_FUNCTION, C_RETURN, C_CALL
}

export interface VMCommand {
    type: VMCommandType;
    arg1?: string;
    arg2?: number;
    literal: string;
}