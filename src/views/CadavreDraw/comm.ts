export type RequestType = 'button' | 'input' | '';

export interface CadavreRequest {
  id: Number;
  prompt: string;
  type: RequestType;
  input_default?: string;
  button: string;
}

export interface CadavreResponse {
  id: Number;
  value: string;
}
