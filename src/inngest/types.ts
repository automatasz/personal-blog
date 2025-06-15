import { EventSchemas } from "inngest";

type DemoEventSent = {
  name: "keyworder/image.describe";
  data: {
    fileId: string;
    userId: string;
  };
};

export const schemas = new EventSchemas().fromUnion<DemoEventSent>();