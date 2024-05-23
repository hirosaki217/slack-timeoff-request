import { View } from "@slack/bolt"

 
export const formRequestTemplate = ({ callback_id, cases, departments, messageId }: 
    { callback_id: string, cases: string[], departments: string[], messageId: string}): View => {
    return {
        type: 'modal',
        "callback_id": callback_id,
        "title": {
            "type": "plain_text",
            "text": "Form",
            "emoji": true
        },
        "submit": {
            "type": "plain_text",
            "text": "Submit",
            "emoji": true,
        },
        "close": {
            "type": "plain_text",
            "text": "Cancel",
            "emoji": true
        },
        "blocks": [
            {
                "type": "divider"
            },
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Thông tin",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "branch",
                "element": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Văn phòng",
                        "emoji": true
                    },
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": `TP.HCM`,
                                "emoji": true
                            },
                            "value": "TP.HCM"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": `Hà Nội`,
                                "emoji": true
                            },
                            "value": 'Hà Nội'
                        }
                    ],
                    "action_id": "static_select-action"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Văn phòng",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "department",
                "element": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Chọn bộ phận",
                        "emoji": true
                    },
                    "options": departments.map(d => ({
                        "text": {
                            "type": "plain_text",
                            "text": `${d}`,
                            "emoji": true
                        },
                        "value": d
                    })),
                    "action_id": "static_select-action"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Bộ phận",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "position",
                "element": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Chức vụ",
                        "emoji": true
                    },
                    "initial_option": {
                        "text": {
                            "type": "plain_text",
                            "text": "Nhân viên",
                            "emoji": true
                        },
                        "value": "Nhân viên"
                    },
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Nhân viên",
                                "emoji": true
                            },
                            "value": "Nhân viên"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Quản lý",
                                "emoji": true
                            },
                            "value": "Quản lý"
                        },
                    ],
                    "action_id": "static_select-action"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Chức vụ",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "case",
                "element": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Chọn trường hợp vắng mặt",
                        "emoji": true
                    },
                    "action_id": "static_select-action",
                    "options": cases.map((c) => ({
                        "text": {
                            "type": "plain_text",
                            "text": c,
                            "emoji": true
                        },
                        "value": c
                    })),
                },
                "label": {
                    "type": "plain_text",
                    "text": "Trường hợp",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "date_range_from",
                "element": {
                    "type": "datepicker",
                    "initial_date": new Date().toISOString().slice(0, 10),
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select a date",
                        "emoji": true
                    },
                    "action_id": "datepicker_range-actionId-0"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Từ ngày",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "date_range_to",
                "element": {
                    "type": "datepicker",
                    "initial_date": new Date().toISOString().slice(0, 10),
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select a date",
                        "emoji": true
                    },
                    "action_id": "datepicker_range-actionId-1"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Đến ngày",
                    "emoji": true
                }
            },
            
            {
                "type": "input",
                "block_id": "time-range",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "plain_text_input-action",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Nhập thời gian",
                        "emoji": true
                    }
                },
                "label": {
                    "type": "plain_text",
                    "text": "Thời gian",
                    "emoji": true
                }
            },
            
            {
                "type": "input",
                "block_id": "reason",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "plain_text_input-action",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Nhập lý do",
                        "emoji": true
                    }
                },
                "label": {
                    "type": "plain_text",
                    "text": "Lý do",
                    "emoji": true
                }
            },
            //message id to delete message
            {
                "type": "section",
                "text": {
                    type: "mrkdwn",
                    text: " ",
                },
                "block_id": messageId,
            }
        ]
    }
}