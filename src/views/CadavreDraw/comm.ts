export type RequestType = 'button' | 'input' | 'draw' | 'show_drawing' | '';

export interface Image {
  width: number,
  height: number,
  data: Uint8Array;
}

export interface CadavreRequest {
  id: number;
  prompt: string;
  type: RequestType;
  input_default?: string;
  button: string;
  image?: Image;
}

export interface CadavreResponse {
  id: number;
  value: string;
  image?: Image;
}
