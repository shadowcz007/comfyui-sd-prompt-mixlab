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
    if(models.length>0){
       await runModel(models[0])
    }

  } else {
    Test()
  }
})()
