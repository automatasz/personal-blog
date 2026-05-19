import describeImage from "./describe-image";
import cleanupOrphans from "./cleanup-orphans";

export const functions = [describeImage, cleanupOrphans];

export { inngest } from "./client";
