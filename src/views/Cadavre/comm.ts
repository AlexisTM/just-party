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

// export type RequestType = RequestType.Button | RequestType.Input | RequestType.Output | '';
export enum RequestType {
  Button = 0,
  Input,
  Output,
  OutputButton,
  Idle,
}

export enum RequestId {
  Idle = 0,
  Username,
  VIPStart, // Everybody is in
  VIPRestart, // Replay new players
  VIPResultReplay,
  Subject,
  Verb,
  SubjectComplement,
  TimeComplement,
  Result,
  Update,
};

export interface BaseRequest {
  id: RequestId;
}

export interface CadavreUpdate extends BaseRequest {
  status: string; // To be written on the top right; Likely "Number of done / to be done"
}

export interface CadavreRequest extends BaseRequest {
  prompt: string;
  type: RequestType;
  input_default?: string;
  button: string;
  value: Array<ColoredResult>;
}

export interface CadavreResponse {
  id: RequestId;
  value: string;
}
