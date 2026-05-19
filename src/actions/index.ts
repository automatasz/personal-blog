import { getBatch } from "./getBatch";
import { checkEventComplete } from "./checkEventComplete";
import { getBatches } from "./getBatches";
import { postFileIds } from "./postFileIds";
import { getStats } from "./getStats";
import { updateDescription, regenerateDescription } from "./updateDescription";
import { getAppSettings, updateAppSettings } from "./appSettings";

export const server = {
  getBatch,
  checkEventComplete,
  getBatches,
  postFileIds,
  getStats,
  updateDescription,
  regenerateDescription,
  getAppSettings,
  updateAppSettings,
};
