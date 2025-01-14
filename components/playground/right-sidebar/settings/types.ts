export type ModelInfo = {
  name: string;
  context: string;
  lastUpdated: string;
  description?: string;
  pricing?: string;
};

export type ModelDataType = {
  [key: string]: ModelInfo;
};

