export interface NotifierErrorParams {
  message: string;
  stage: string;
  status?: number;
  details?: Record<string, unknown>;
}

export class NotifierError extends Error {
  stage: string;
  status: number;
  details?: Record<string, unknown>;

  constructor({ message, stage, status = 500, details }: NotifierErrorParams) {
    super(message);
    this.name = "NotifierError";
    this.stage = stage;
    this.status = status;
    this.details = details;
  }
}
