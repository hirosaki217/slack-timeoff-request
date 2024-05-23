const ACTION_QUEUE: string[] = [];
const TIMEOUT_ID: {
    [key: string]: ReturnType<typeof setTimeout>;
    
} = {}

export const pushActionQueue = (messageTs: string) => {
  const indexAction = ACTION_QUEUE.indexOf(messageTs);
  if (indexAction !== -1) {
    console.warn(
      "Action này cần chờ 1 action khác thực hiện xong",
      ACTION_QUEUE[indexAction]
    );
    return false;
  }
  ACTION_QUEUE.push(messageTs);
  TIMEOUT_ID[messageTs] = setTimeout(() => {
    const indexAction = ACTION_QUEUE.indexOf(messageTs);
    if (indexAction !== -1) {
      ACTION_QUEUE.splice(indexAction, 1);
    }
  }, 5000);
  return true;
};

export const endActionQueue = (messageTs: string) => {
    try {
        clearTimeout(TIMEOUT_ID[messageTs]);
        delete TIMEOUT_ID[messageTs];
    } catch (error) {
        console.log("timeout is cleared");
    }
    setTimeout(() => {
        const indexAction = ACTION_QUEUE.indexOf(messageTs);
        if (indexAction !== -1) {
          ACTION_QUEUE.splice(indexAction, 1);
        }
      }, 3000);
};
