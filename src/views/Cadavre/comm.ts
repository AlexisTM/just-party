export type RequestType = 'button' | 'input' | 'output' | '';

export interface ColoredResult {
  subject: {
      class: string;
      value: string;
  };
  verb: {
      class: string;
      value: string;
  };
  complement: {
      class: string;
      value: string;
  };
  time_complement: {
      class: string;
      value: string;
  };
}

export interface CadavreRequest {
  id: Number;
  prompt: string;
  type: RequestType;
  input_default?: string;
  button: string;
  value: Array<ColoredResult>;
}

export interface CadavreResponse {
  id: Number;
  value: string;
}
