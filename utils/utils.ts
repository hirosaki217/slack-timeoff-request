import { App } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

import { DataMentionType } from "./types";
import { env } from "./config";
import { getPrivateSheetData } from "./google-sheet";

export type PayloadType = {
  userId: string;
  caseKey: string;
  department: string;
  reason: string;
  timeRange: string;
  fromDate: string;
  toDate: string;
  position: string;
  messageId: string;
  branch: string;
};

export const findChannel = async (name: string, app: App) => {
  const result = await app.client.conversations.list();

  const channel = result?.channels?.find((channel) => channel.name === name);
  return channel?.id;
};

export const findChannelByUserName = async (name: string, app: App) => {
  const result = await app.client.users.list();

  const member = result?.members?.find((member) => member.name === name);
  return member?.id;
};

export const findUserById = async (id: string, app: App) => {
  const result = await app.client.users.list();

  const member = result?.members?.find((member) => member.id === id);

  return {
    id: member?.id,
    name: member?.real_name,
    username: member?.name,
    team_id: member?.team_id,
  };
};

export const sendMessageRequest = async (payload: PayloadType, app: App) => {
  const {
    userId,
    caseKey,
    branch,
    department,
    reason,
    timeRange,
    fromDate,
    toDate,
    position,
    messageId,
  } = payload;
  const userInfo = await findUserById(userId, app);
  const dpm = department.toLowerCase();
  const mentionIds = getMentionIds(await getDataMention(), dpm, position);
  const date = fromDate === toDate ? fromDate : `${fromDate} đến ${toDate}`;

  const text = `
  Có một đơn xin về thời gian làm việc cần anh chị phê duyệt [${convertToMentions(
    mentionIds
  )}]

  \`\`\`
  Văn phòng:     ${branch}
  Bộ phận:       ${department}
  Tên:           ${userInfo.name} (<@${userId}>)
  Nội dung:      ${caseKey}
  Lý do:         ${reason}
  Thời gian:     ${timeRange}
  Ngày:          ${date}
  \`\`\`
      `;
  const now = getDateTimeNowFormated();
  await app.client.chat.postMessage({
    channel: env.SLACK_CHANNEL_REVIEW_TIMEOFF_ID,
    text: "timeoff request",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: text,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Chấp nhận",
              emoji: true,
            },
            action_id: "accept_click",
            style: "primary",
            value: JSON.stringify({
              ...payload,
              mentionIds,
              mentionAcceptedIds: [],
              user: userInfo,
              sentAt: now,
            }),
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Từ chối",
              emoji: true,
            },
            style: "danger",
            action_id: "reject_click",
            value: JSON.stringify({
              ...payload,
              mentionIds,
              mentionAcceptedIds: [],
              user: userInfo,
              sentAt: now,
            }),
          },
        ],
      },
      {
        type: "divider",
      },
    ],
  });

  await app.client.chat.delete({
    channel: userInfo.id!,
    ts: messageId!,
  });

  await app.client.chat.postMessage({
    channel: userInfo.id!,
    ts: messageId!,
    text: "Đã gửi yêu cầu",
  });
};

export const convertToMentions = (ids: string[]) => {
  return ids.map((id) => `<@${id}>`).join(", ");
};

export const convertToDate = (date: string) => {
  return new Date(date.split("-").reverse().join("-"));
}

export const getMentionIds = (
  data: DataMentionType,
  department: string,
  position: string
) => {
  if (department === "bod") {
    return data["bod"].managers;
  }
  const { employees, managers } = data[department.toLowerCase()];

  const { employees: hrs } = data["hr"];
  return position === "Nhân viên"
    ? Array.from(new Set([...employees, ...hrs]))
    : Array.from(new Set([...managers, ...hrs]));
};

export const getDataMention = async () => {
  const data = await getPrivateSheetData({
    sheetId: env.SHEET_ID,
    sheetName: "confirm-request",
    range: "!A2:D",
  });
  const result: {
    [key: string]: {
      employees: string[];
      managers: string[];
    };
  } = {};

  data?.forEach((entry) => {
    const [id, , position, role] = entry;
    const lowerRole = role.toLowerCase();
    if (!result[lowerRole]) {
      result[lowerRole] = {
        employees: [],
        managers: [],
      };
    }

    if (position === "Nhân viên") {
      result[lowerRole].employees.push(id);
    } else if (position === "Quản lý") {
      result[lowerRole].managers.push(id);
    }
  });
  return result;
};

const getDateTimeNowFormated = () => {
  const now = new Date();

  return `${now.toLocaleTimeString()}, ${now.getDate()}-${
    now.getMonth() + 1
  }-${now.getFullYear()}`;
};
