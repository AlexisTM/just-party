export type RequestType = 'button' | 'input' | 'output' | '';

export interface CadavreRequest {
  id: Number;
  prompt: string;
  type: RequestType;
  input_default?: string;
  button: string;
  value: Array<string>;
}

export interface CadavreResponse {
  id: Number;
  value: string;
}
