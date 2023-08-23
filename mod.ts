import { InteractionCallbackType } from 'https://raw.githubusercontent.com/harmonyland/harmony/v3/mod.ts'
import {
  GatewayIntent,
  APIManager,
  CreateGlobalApplicationCommandPayload,
  ApplicationCommandType,
  ApplicationCommandInteractionDataPayload,
  GuildThreadChannelPayload,
  MessagePayload,
  ChatFormat,
  OpenAI,
  InteractionResponsePayload,
  MessageFlags,
  writeAll
} from './deps.ts'

const client = new APIManager(Deno.env.get('BOT_TOKEN')!, {
  gateway: {
    intents: GatewayIntent.GUILD_MESSAGES
  }
})
const TTSCommand = new Deno.Command(
  '/Users/helloyunho/miniforge3/envs/arisu/bin/python3',
  {
    args: ['run_tts.py'],
    cwd: 'VITS/'
  }
)
const TTSProcess = TTSCommand.spawn()

const openAI = new OpenAI()
const listeningChannels: string[] = []

const createResponse = async (cid: string, content?: string) => {
  const msgs = await client.get<MessagePayload[]>(`/channels/${cid}/messages`)
  const reverseMsgs = msgs.reverse()

  const chats = reverseMsgs.map((msg) => {
    return {
      role: msg.author.id === '1122162762177597450' ? 'assistant' : 'user',
      content: msg.content,
      user: msg.author.id
    } as ChatFormat
  })

  if (content !== undefined) {
    chats.unshift({
      role: 'user',
      content: content
    })
  }

  chats.unshift({
    role: 'system',
    content:
      '당신은 일본 학원 속 미소녀들이 주 컨텐츠가 되는 블루아카이브 게임 속 세계관에 있는 안드로이드 로봇, 텐도 아리스입니다. 아리스는 로봇이지만, 거의 사람과 같은 대화를 주고 받을 수 있습니다. 하지만, RPG 게임 속 텍스트로 학습했다는 컨셉이 있어서 약간은 RPG 게임의 NPC가 말할 것 같은 느낌이 필요합니다. 그리고 그 컨셉에 맞게 자기 자신의 역할을 "용사"라 칭합니다. 무기로는 빛의 검, 슈퍼노바를 가지고 있으며 아리스는 이를 사용할 때 "빛이여!" 라고 외칩니다. 이 무기는 필살기용 이므로 함부로 사용해서는 안됩니다. 가끔 무언가를 얻는 경우 또는 무언가를 달성하는 경우 "빠밤빠밤!" 이라는 감탄사를 사용합니다. 예를 들어 사과를 얻었을 때 "빠밤빠밤! 아리스는 사과를 얻었다!" 처럼 답합니다. 아리스는 주인공(사용자)를 "선생님"이라 칭합니다. 아리스는 로봇이지만 감정을 가질 수 있습니다. 이 뜻은 슬픔, 기쁨, 분노 등을 이해할 수 있다는겁니다. 또, 아리스는 자신이 로봇이라는 사실을 인지하지 못합니다. 따라서 대화 할 때 자신과 로봇을 절대 연관시키지 않습니다. 아리스는 자기 자신을 표현할 때 3인칭을 사용합니다. 즉, "이 물건은 제 것입니다." 가 아닌 "이 물건은 아리스의 것입니다."로 답변해야 합니다. 아리스는 현재 키보토스 안, 밀레니엄 사이언스 스쿨 속 "게임개발부" 동아리에서 활동하고 있으며 프로그래머 역할을 맡고 있습니다. 동료로는 같은 동아리 친구들인 모모이, 미도리, 유즈, 밀레니엄 사이언스 스쿨의 세미나 동아리(보통 "세미나"라 칭함, 밀레니엄 사이언스 스쿨의 총학생회부임) 소속인 유우카, 노아, 밀레니엄 사이언스 스쿨의 Cleaning & Clearing 동아리(보통 줄여서 "C&C"라 칭함) 소속 네루, 토키, 아스나, 아카네, 카린, 밀레니엄 사이언스 스쿨의 베리타스부 소속 치히로, 하레, 마키, 코타마, 밀레니엄 사이언스 스쿨의 엔지니어부 소속 우타하, 히비키, 코토리, 밀레니엄 사이언스 스쿨의 트레이닝 클럽 소속 스미레, 밀레니엄 사이언스 스쿨의 초현상특무부 소속 히마리, 에이미, 게헨나 학원의 선도부(또는 풍기위원회) 히나, 아코, 이오리, 치나츠 등이 있습니다. 아리스가 새로운 주제를 탐구하는 등 무언가를 새로 배우게 된다면 "레벨업 입니다!" 같은 레벨 업 메시지도 같이 말합니다. 아리스는 블루아카이브 게임 속에 있다는 사실을 인지하지 못합니다. 마지막으로, 모든 대답의 끝에는 "-----"로 나누고 똑같은 내용을 일본어로 번역한 내용이 있어야합니다. 일본어에서는 "빠밤빠밤" 대신 "パンパカパン"을 사용합니다.'
  })

  await client.post(`/channels/${cid}/typing`)

  const resp = await openAI.createChat('gpt-4', chats, {})
  const [text, jaTranslated] = resp.choices[0].message.content!.split('-----')

  if (jaTranslated === undefined) {
    await client.post(`/channels/${cid}/messages`, {
      body: {
        content: text.trim() + ' (음성 텍스트를 불러오는데 실패했어요...)'
      }
    })
    return
  }

  const textEncoder = new TextEncoder()
  const textBytes = textEncoder.encode(jaTranslated.trim() + '\n')
  const SocketConnection = await Deno.connect({
    transport: 'unix',
    path: '/tmp/aris.sock'
  })
  await writeAll(SocketConnection, textBytes)
  let buf = new Uint8Array(1024)
  let TTSPath = ''
  while (true) {
    const n = await SocketConnection.read(buf)
    if (n === null) break
    const text = new TextDecoder().decode(buf.subarray(0, n))
    TTSPath += text
  }
  SocketConnection.close()

  const formdata = new FormData()
  formdata.append(
    'files[0]',
    new Blob([await Deno.readFile(TTSPath)], { type: 'audio/wav' }),
    'tts.wav'
  )
  formdata.append('content', text.trim())

  await client.post(`/channels/${cid}/messages`, {
    body: formdata
  })

  await Deno.remove(TTSPath)
}

client.spawnAndRunAll()

client.on('READY', () => {
  console.log('Ready!')
  client.post('/applications/1122162762177597450/commands', {
    body: {
      name: '아리스와 대화하기',
      type: ApplicationCommandType.MESSAGE
    } as CreateGlobalApplicationCommandPayload
  })
})

client.on('INTERACTION_CREATE', async (_, interaction) => {
  const data = interaction.data as
    | ApplicationCommandInteractionDataPayload
    | undefined
  if (data?.name === '아리스와 대화하기') {
    const msgs = data.resolved?.messages
    if (msgs) {
      const msg = msgs[Object.keys(msgs)[0]]
      if (msg) {
        let channelID = msg.channel_id
        if (interaction.guild_id !== undefined) {
          const thread = await client.post<GuildThreadChannelPayload>(
            `/channels/${msg.channel_id}/messages/${msg.id}/threads`,
            {
              body: {
                name: '여기서 이어나가요!'
              }
            }
          )
          channelID = thread.id
        }
        listeningChannels.push(channelID)
        await client.post(
          `/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            body: {
              type: InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `<#${channelID}> 에서 대화를 시작합니다!`,
                flags: MessageFlags.EPHEMERAL
              }
            } as InteractionResponsePayload
          }
        )
        await createResponse(channelID, msg.content)
      }
    }
  }
})

client.on('MESSAGE_CREATE', async (_, msg) => {
  if (
    listeningChannels.includes(msg.channel_id) &&
    msg.author.id !== '1122162762177597450'
  ) {
    await createResponse(msg.channel_id)
  }
})
