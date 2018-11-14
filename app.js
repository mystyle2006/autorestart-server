const axios = require('axios');
const node_ssh = require('node-ssh');
const {
  SLACK_URL,
  SLACK_CHANNEL,
  PRIVATE_KEY_PATH,
  HOST,
  USERNAME,
  RESTART_COMMAND,
  TEST_URL,
  TIMEOUT_MS,
  INTERVAL_MS,
  MAX_RETRY_COUNT,
} = require('./config.json');

let retryCount = 0;

async function tryRequest() {
  return axios.get(TEST_URL, { timeout: TIMEOUT_MS });
}

async function tryRecover() {
  const ssh = new node_ssh();
  try {
    await ssh.connect({
      host: HOST,
      username: USERNAME,
      privateKey: PRIVATE_KEY_PATH
    });
    await ssh.execCommand(RESTART_COMMAND);
    await sendSlack('서버가 죽어서 재시작했습니다.');
  } catch (e) {
    await sendSlack('서버 살리기에 실패했습니다. ' + e.message);
  } finally {
    ssh.dispose();
  }
}

async function sendSlack(message) {
  return axios.post(SLACK_URL, { channel: SLACK_CHANNEL, text: message });
}

async function run() {
  try {
    const response = await tryRequest();
    console.log('서버 응답 코드: ' + response.status);
  } catch (e) {
    console.error(e, (retryCount + 1) + '번째 재시도: ');
    retryCount += 1;

    if (retryCount >= MAX_RETRY_COUNT) {
      await tryRecover();
    }
  }


  setTimeout(run, INTERVAL_MS);
}

run();
