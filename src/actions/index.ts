import { getBatch } from "./getBatch";
import { checkEventComplete } from "./checkEventComplete";
import { getBatches } from "./getBatches";
import { postFileIds } from "./postFileIds";
import { getStats } from "./getStats";
import { updateDescription, regenerateDescription } from "./updateDescription";

export const server = {
  getBatch,
  checkEventComplete,
  getBatches,
  postFileIds,
  getStats,
  updateDescription,
  regenerateDescription,
};
