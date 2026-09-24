import { Stmt } from './ast';
import { Environment } from './environment';

export type RuntimeValue =
  | number
  | string
  | boolean
  | null
  | RuntimeValue[]
  | ClosureValue
  | NativeFunctionValue;

export interface ClosureValue {
  type: 'closure';
  name: string | null;
  params: string[];
  body: Stmt[];
  closure: Environment;
}

export interface NativeFunctionValue {
  type: 'native';
  name: string;
  arity: number;
  call: (args: RuntimeValue[]) => RuntimeValue;
}

export function isClosure(value: RuntimeValue): value is ClosureValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && (value as ClosureValue).type === 'closure';
}

export function isNativeFunction(value: RuntimeValue): value is NativeFunctionValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && (value as NativeFunctionValue).type === 'native';
}

export function isCallable(value: RuntimeValue): value is ClosureValue | NativeFunctionValue {
  return isClosure(value) || isNativeFunction(value);
}
