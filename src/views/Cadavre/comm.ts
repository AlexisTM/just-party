export type RequestType = 'button' | 'input' | '';

export default interface CadavreRequest {
  id: Number;
  prompt: string;
  type: RequestType;
  input_default?: string;
  button: string;
}

export default interface CadavreResponse {
  id: Number;
  value?: string;
}
