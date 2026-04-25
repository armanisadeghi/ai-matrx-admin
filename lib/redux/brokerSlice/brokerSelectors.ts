/**
 * Combined broker selectors (moved from index.ts so consumers can import
 * without pulling the full brokerSlice barrel).
 */
import { coreSelectors } from "./selectors/core";
import {
  optionsSelectors,
  tableSelectors,
  textSelectors,
  dynamicSelectors,
  numberSelectors,
  booleanSelectors,
  dateSelectors,
} from "./selectors";

export const brokerSelectors = {
  ...coreSelectors,
  ...optionsSelectors,
  ...tableSelectors,
  ...textSelectors,
  ...dynamicSelectors,
  ...numberSelectors,
  ...booleanSelectors,
  ...dateSelectors,
};
