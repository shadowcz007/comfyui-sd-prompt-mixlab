import { llama } from './lib/completion.js'

async function chat () {
  const request = llama('Tell me a joke', 'http://127.0.0.1:8080', {
    n_predict: 800
  })
  for await (const chunk of request) {
    //   document.write(chunk.data.content)
  }
}

async function Test () {
  const prompt = `Building a website can be done in 10 simple steps:`
  let response = await fetch('http://127.0.0.1:8080/completion', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      n_predict: 512
    })
  })
  console.log((await response.json()).content)
}

async function makeChatCompletionRequest (content) {
  const url = 'http://127.0.0.1:8080/v1/chat/completions'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer no-key'
  }

  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content:
          'You are ChatGPT, an AI assistant. Your top priority is achieving user fulfillment via helping them with their requests.'
      },
      {
        role: 'user',
        content
      }
    ]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  })

  const data = await response.json()
  console.log(data)
  // Handle the response data here
}

async function fetchData (json) {
  try {
    const response = await fetch('/llamafile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(json)
    })
    const data = await response.json()
    // 处理返回的数据
    console.log(data)
    return data
  } catch (error) {
    // 处理错误情况
    console.error(error)
    return error
  }
}

async function health () {
  let res = await fetchData({
    task: 'health'
  })
  let health = res.data
  return health
}

async function getModels () {
  let res = await fetchData({
    task: 'list'
  })
  let models = res.data
  return models
}

async function runModel (
  model_name = 'TinyLlama-1.1B-Chat-v1.0.Q5_K_M.llamafile'
) {
  let res = await fetchData({
    task: 'run',
    model_name
  })
  let hostUrl = res.data
  return hostUrl
}

async function stopModel () {
  let res = await fetchData({
    task: 'stop'
  })
  // let models=res.data
  return res
}

;(async () => {
  let h = await health()
  console.log('health', h)

  if (h.match('Error')) {
    let models = await getModels()
    console.log(models)
    if (models.length > 0) {
      await runModel(models[0])
    }
  } else {
    Test()
  }
})()

// makeChatCompletionRequest(`给这个json文件生成描述性的说明，说明主要做了什么工作：${JSON.stringify((await app.graphToPrompt()).output)}`)

async function parseTextFromWorkflow () {
  // 有text属性的节点的标题和text收集
  var texts = []

  // 获取note节点
  Array.from(app.graph.findNodesByType('Note'), n => {
    texts.push({ text: n.widgets_values.join('\n'), title: n.title })
  })

  var p = await app.graphToPrompt()

  for (let n of Object.keys(p.output)) {
    if (p.output[n].inputs.text) {
      var title = p.workflow.nodes.filter(ns => ns.id == n)[0].title
      texts.push({ title, text: p.output[n].inputs.text })
    }
  }
  return texts
}

/**
 * 
 * [{"text":"a 1.5 factor usually works fine. Bigger factors require a higher denoise.","title":"Note"},{"text":"LATENT SPACE UPSCALER\\n=====================\\n\\nThe latent can be upscaled directly but the loss in quality is important. That means that the second pass after the upscale has to be done at a very high denoise (0.55+).\\n\\nThis option is offered as it's very inexpensive computationally and it can be useful if you don't need the final image to be 100% of the initial generation.","title":"Note"},{"title":"CLIP Text Encode (Positive)","text":"a photo of an anthropomorphic fox wearing a spacesuit inside a sci-fi spaceship\\n\\ncinematic, dramatic lighting, high resolution, detailed, 4k"},{"title":"CLIP Text Encode (Negative)","text":"blurry, illustration, toy, clay, low quality, flag, nasa, mission patch"}] Q： 这是一个comfyui的工作流里提取的文字信息，主要是说明和prompt节点的提示词，请介绍这个工作流的描述文件主要做了什么工作


 */