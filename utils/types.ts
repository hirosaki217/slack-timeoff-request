import { Block, KnownBlock, KnownEventFromType, SlackAction, ViewStateValue } from "@slack/bolt";

export type MessageType = KnownEventFromType<"message"> & {
  user: string;
  text: string;
  blocks: (Block | KnownBlock)[] | undefined
}

export type BlockType = {
  [key: string]: {
    [actionId: string]: ViewStateValue;
};
}

export type BodyType = SlackAction  & {
  user: {
    id: string;
    name: string;
    username: string;
    team_id: string;
  },
  actions: {
    value: string;
  }[];
  container: {
    message_ts: string;
    channel_id: string;
  };
  trigger_id?: string;
  message: MessageType;
};

export type DataMentionType = {
  [key: string]: {
    employees: string[];
    managers: string[];
};
}