const { App } = require("@slack/bolt");
const OpenAI = require("openai");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let userTasks = {
  A씨: "4월 보고서 작성 중",
  B씨: "프로젝트 자료 조사",
};

async function askGPT(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content.trim();
}

app.message(/(.+)/, async ({ message, say, client }) => {
  const userMessage = message.text;
  const botUserId = (await client.auth.test()).user_id;
  const isMentioned = userMessage.includes(`<@${botUserId}>`);

  if (!isMentioned) {
    return;
  }

  const cleanedMessage = userMessage.replace(`<@${botUserId}>`, "").trim();

  if (cleanedMessage.includes("태스크 뭐야")) {
    const user = extractUser(cleanedMessage);
    const task = userTasks[user];
    if (task) {
      await say(`${user}님의 현재 태스크는 "${task}" 입니다.`);
    } else {
      await say(`${user}님의 태스크가 등록되어 있지 않아요.`);
    }
  } else if (cleanedMessage.includes("태스크") && cleanedMessage.includes("로 바꿔줘")) {
    const match = cleanedMessage.match(/(\S+)\s+태스크를\s+['"](.+)['"]로 바꿔줘/);
    if (match) {
      const user = match[1];
      const task = match[2];
      userTasks[user] = task;
      await say(`${user}님의 태스크를 "${task}" 로 업데이트 했어요.`);
    } else {
      await say("형식이 올바르지 않습니다. 예: 김대리 태스크를 '자료 조사'로 바꿔줘");
    }
  } else if (cleanedMessage.includes("태스크 삭제")) {
    const match = cleanedMessage.match(/(\S+)\s+태스크 삭제/);
    if (match) {
      const user = match[1];
      if (userTasks[user]) {
        delete userTasks[user];
        await say(`${user}님의 태스크를 삭제했어요.`);
      } else {
        await say(`${user}님의 태스크가 등록되어 있지 않아요.`);
      }
    } else {
      await say("형식이 올바르지 않습니다. 예: 김대리 태스크 삭제");
    }
  } else if (cleanedMessage.includes("회의 언제")) {
    const gptResponse = await askGPT("팀 회의 시간을 추천해줘. 이번 주 안으로 가능한 시간 중에서.");
    await say(`추천 시간: ${gptResponse}`);
  } else {
    const gptResponse = await askGPT(cleanedMessage);
    await say(gptResponse);
  }
});

function extractUser(message) {
  const match = message.match(/(\S+)\s+지금 태스크/);
  return match ? match[1] : "알 수 없는 유저";
}

(async () => {
  await app.start();
  console.log("Slack 에이전트 실행 중");
})();
