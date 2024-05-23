import { App } from '@slack/bolt';
import { NextApiRequest, NextApiResponse } from 'next';
import { env } from 'utils/config';
import { appendSheetData } from 'utils/google-sheet';
import NextConnectReceiver from 'utils/NextConnectReceiver';
import { endActionQueue, pushActionQueue } from 'utils/queue';
import { formRequestTemplate } from 'utils/templates/form-request';
import { BlockType, BodyType } from 'utils/types';
import { convertToDate, convertToMentions, sendMessageRequest } from 'utils/utils';

const receiver = new NextConnectReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || 'invalid',
  // The `processBeforeResponse` option is required for all FaaS environments.
  // It allows Bolt methods (e.g. `app.message`) to handle a Slack request
  // before the Bolt framework responds to the request (e.g. `ack()`). This is
  // important because FaaS immediately terminate handlers after the response.
  processBeforeResponse: true,
});

// Initializes your app with your bot token and the AWS Lambda ready receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver,
  developerMode: false,
});


const CASES = ["Đi trễ", "Về sớm", "Nghỉ phép", "WFH"];
const DEPARTMENTS = [
  "Engineer",
  "PM",
  "Designer",
  "Business",
  "Marketing",
  "BackOffice",
  "BOD",
];



app.action("accept_click", async ({ body, ack }) => {
  await ack();
  const bd = body as BodyType;

  const {
    user,
    caseKey,
    branch,
    department,
    reason,
    timeRange,
    fromDate,
    toDate,
    mentionIds,
    mentionAcceptedIds,
    sentAt,
    position,
  } = JSON.parse(bd.actions[0].value);

  // nếu đã chấp nhận request rồi thì return
  if (mentionAcceptedIds.includes(bd.user.id)) return;

  // nếu không nằm trong danh sách mention thì thông báo
  if (!mentionIds.includes(bd.user.id)) {
    await app.client.chat.postEphemeral({
      channel: bd.channel!.id!,
      user: bd.user.id,
      text: `Cần người kiểm duyệt bộ phận ${department} thực hiện yêu cầu này`,
    });

    return;
  }

  // đang có người khác kiểm duyệt thì return
  if (!pushActionQueue(bd.container.message_ts)) return;

  mentionIds.splice(mentionIds.indexOf(bd.user.id), 1);
  mentionAcceptedIds.push(bd.user.id);

  const actions =
    mentionIds.length > 0
      ? {
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
              user,
              caseKey,
              department,
              branch,
              reason,
              timeRange,
              fromDate,
              toDate,
              mentionIds,
              mentionAcceptedIds,
              sentAt,
              position,
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
              user,
              caseKey,
              branch,
              department,
              reason,
              timeRange,
              fromDate,
              toDate,
              mentionIds,
              mentionAcceptedIds,
              sentAt,
              position,
            }),
          },
        ],
      }
      : undefined;

  const blocks = [bd.message.blocks![0]];

  if (actions)
    blocks.push(actions, {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Chờ ${convertToMentions(mentionIds)} xác nhận*`,
      },
    });
  else
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Đã chấp nhận yêu cầu*`,
      },
    });

  blocks.push({
    type: "divider",
  });

  await app.client.chat.update({
    channel: bd.container.channel_id,
    ts: bd.container.message_ts,
    text: "Request",
    blocks: blocks,
  });
  // vẫn còn người chờ duyệt
  if (mentionIds.length !== 0) return;
  const date = fromDate === toDate ? fromDate : `${fromDate} đến ${toDate}`;
  await app.client.chat.postMessage({
    channel: env.SLACK_CHANNEL_NOTI_TIMEOFF_ID,
    text: `
    Thông báo nhân sự ${user.name} *${caseKey.toLowerCase()}*
    \`\`\`
- Văn phòng:    ${branch}
- Bộ phận:      ${department}
- Trường hợp:   ${caseKey}
- Tên:          ${user.name} <@${user.id}>
- Thời gian:    ${timeRange}
- Ngày:         ${date}
    \`\`\` `,
  });

  await appendSheetData({
    sheetId: env.SHEET_ID,
    sheetName: env.SHEET_NAME,
    range: "!A2:K",
    data: [
      [
        user.id,
        user.name,
        branch,
        position,
        caseKey,
        department,
        timeRange,
        fromDate,
        toDate,
        "approve",
        reason,
        sentAt,
      ],
    ],
  });

  endActionQueue(bd.container.message_ts);
});

app.action("reject_click", async ({ body, ack }) => {
  await ack();
  const bd = body as BodyType;

  const {
    user,
    caseKey,
    department,
    reason,
    timeRange,
    branch,
    fromDate,
    toDate,
    mentionIds,
    mentionAcceptedIds,
    sentAt,
    position,
  } = JSON.parse(bd.actions[0].value);

  if (mentionAcceptedIds.includes(body.user.id)) return;

  if (!mentionIds.includes(body.user.id)) {
    await app.client.chat.postEphemeral({
      channel: body.channel!.id!,
      user: body.user.id,
      text: `Cần người kiểm duyệt bộ phận ${department} thực hiện yêu cầu này`,

    });
    return;
  }

  if (!pushActionQueue(bd.container.message_ts)) return;

  await app.client.chat.update({
    channel: bd.container.channel_id,
    ts: bd.container.message_ts,
    text: "Request",
    blocks: [
      bd.message.blocks![0],
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Đã từ chối yêu cầu*`,
        },
      },
      {
        type: "divider",
      },
    ],
  });

  await appendSheetData({
    sheetId: env.SHEET_ID,
    sheetName: env.SHEET_NAME,
    range: "!A2:K",
    data: [
      [
        user.id,
        user.name,
        branch,
        position,
        caseKey,
        department,
        timeRange,
        fromDate,
        toDate,
        "reject",
        reason,
        sentAt,
      ],
    ],
  });

  await app.client.chat.postMessage({
    channel: user.id,
    text: `Đơn xin vắng mặt [${sentAt.split(',')[1].trim()}] của bạn bị từ chối, vui lòng liên hệ HR để nắm thông tin`,
  });

  endActionQueue(bd.container.message_ts);
});

app.message("#form", async ({ message, say }) => {
  
  if (message.channel_type !== "im") return;
  
  console.log(message);
  try {
    await say({
      text: "Ấn vào nút để mở modal",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Ấn vào nút để mở modal",
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Open Modal",
            },
            style: "primary",
            action_id: "open_modal_button",
          },
        },
      ],
      channel: message.channel,
    });
  } catch (error) {
    console.error(error);
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

});

app.message("#help", async ({ message, say }) => {
  if (message.channel_type !== "im") return;

  try {
    await say({
      text: "Trong form request vắng mặt sẽ có những trường thông tin sau:"
      +"\n1. Bộ phận: Chọn bộ phận của mình"
      +"\n2. Chức vụ: Chọn vị trí của mình (Nhân viên/ Quản lý)"
      +"\n3. Trường hợp vắng mặt: Nghỉ phép/ Đi muộn/ Về sớm/ WFH"
      +"\n4. Từ ngày: Chọn ngày xin phép đầu tiên"
      +"\n5. Đến ngày: Chọn ngày xin phép cuối cùng"
      +"\nLưu ý: Với trường hợp xin vắng mặt trong thời gian của 1 ngày làm việc, bạn điền thông tin như sau"
      +"\nVí dụ xin phép vắng mặt ngày 18/04/2024 -> Chọn Từ ngày 18/04/2024, Đến ngày 18/04/2024"
      +"\n6. Thời gian:"
      +"\n ● Trường hợp Nghỉ phép/WFH: buổi sáng ghi “9h - 12h” (tương tự vs buổi chiều “13h30 - 18h), nghỉ cả ngày ghi “9h - 18h”"
      +"\n ● Trường hợp Đi muộn/ Về sớm: Ghi thời gian xin đến muộn/ về sớm (ví dụ: Đi muộn lúc 9h30 -> ghi 9h30)"
      +"\n7. Lý do: Ghi cụ thể lý do xin vắng mặt",
      channel: message.channel,
    });
  } catch (error) {
    console.error(error);
  }
});

app.action("open_modal_button", async ({ ack, body, context, client }) => {
  await ack();
  const modal = formRequestTemplate({
    callback_id: "cb_form_id",
    cases: CASES,
    departments: DEPARTMENTS,
    messageId: (body as BodyType).container.message_ts,
  });
  try {
    await client.views.open({
      token: context.botToken,
      trigger_id: (body as BodyType).trigger_id!,
      view: modal,
    });
  } catch (error) {
    console.error(error);
  }
});

app.view(
  { callback_id: "cb_form_id", type: "view_submission" },
  async ({ ack, body, view, logger }) => {
    try {
      await ack({
        response_action: "clear",
      });
   
      const objValues: BlockType = view.state.values;
      const messageTs = view.blocks[view.blocks.length - 1]["block_id"];
      const payload = {
        branch: objValues["branch"]["static_select-action"]!["selected_option"]![
          "value"
          ],
        position:
          objValues["position"]["static_select-action"]!["selected_option"]![
          "value"
          ],
        caseKey:
          objValues["case"]["static_select-action"]!["selected_option"]!["value"],
        department:
          objValues["department"]["static_select-action"]!["selected_option"]![
          "value"
          ],
        timeRange: objValues["time-range"]["plain_text_input-action"].value!,
        reason: objValues["reason"]["plain_text_input-action"].value!,
        userId: body.user.id,
        messageId: messageTs!,
        fromDate: objValues["date_range_from"]["datepicker_range-actionId-0"].selected_date!.split("-")
        .reverse()
        .join("-"),
        toDate: objValues["date_range_to"]["datepicker_range-actionId-1"].selected_date!.split("-")
        .reverse()
        .join("-")
      };
  
      // validate
      if (convertToDate(payload.fromDate) > convertToDate(payload.toDate)) {
        await ack({
          response_action: "errors",
          errors: {
            date_range_from: "Ngày bắt đầu không thể lớn hơn ngày kết thúc",
          },
        });
        return;
      }

      logger.info("payload", payload);
      await sendMessageRequest(payload, app);
    } catch (error) {
      console.log(error);
    }
  }
);



// this is run just in case
const router = receiver.start();

router.get('/api', (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({
    test: true,
  });
})

export default router;
