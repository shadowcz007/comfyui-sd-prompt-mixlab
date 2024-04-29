import { llama } from './lib/completion.js'
import { app } from '../../../scripts/app.js'
import { api } from '../../../scripts/api.js'
let _MYALLNODES = {}

const systemPrompt = `You are a prompt creator, your task is to create prompts for the user input request, the prompts are image descriptions that include keywords for (an adjective, type of image, framing/composition, subject, subject appearance/action, environment, lighting situation, details of the shoot/illustration, visuals aesthetics and artists), brake keywords by comas, provide high quality, non-verboose, coherent, brief, concise, and not superfluous prompts, the subject from the input request must be included verbatim on the prompt,the prompt is english`

//判断是否重复
function hasRepeatingPhrases (str) {
  const phrases = str.split(',')
  console.log(phrases)
  for (let i = 0; i < phrases.length - 1; i++) {
    if (phrases[i].trim() === phrases[i + 1].trim()) {
      return true
    }
  }
  return false
}
// css
// Create a style element
const style = document.createElement('style')
// Define the CSS rule for scrollbar width
const cssRule = `

.runLLM{
  border:none;
  padding: 12px;
  color: var(--input-text);
  background-color: var(--comfy-input-bg);
  border-radius: 8px;
  border-color: var(--border-color);
  cursor: pointer;
}

.runLLM:hover{
  background-color: #2b2b2b;
  color: gray;
}

#llm {
  margin: 24px;
  outline: 1px solid;
  height: 60vh;
  overflow-y: scroll;
  padding: 12px;
}

.loading{
  border: 5px solid gray;
  animation: borderChange 3s infinite;
  pointer-events: all;
}

.mx_chat_status{
  font-size: 12px;
    max-width: 300px;
   
}

.mx_close {
  pointer-events: all;
  float: right;
  border: none;
  color: var(--input-text);
  background-color: var(--comfy-input-bg);
  border-color: var(--border-color);
  cursor: pointer;
}

#llamafile_stop_model_btn{
  pointer-events: all;
}

#mixlab_chatbot_by_llamafile_btn{
  font-size: 14px;
  height: 40px;
  border-width: 4px;
  border-radius: 8px;
}

#llm[contenteditable="false"] {
  animation: borderChange 3s infinite;
  border-top: 5px solid;
}

#llm button{
  color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 8px;
      border-color: var(--border-color);
      cursor: pointer;
}

#llm [contenteditable="false"]{
  display: inline;
  border: 1px solid gray;
  padding: 4px;
  margin: 4px;
  user-select: none;
  font-size: 12px; 
}

@keyframes borderChange {
  0% {
    border-color: red;
  }
  50% {
    border-color: blue;
  }
  100% {
    border-color: green;
  }
}

`
// Add the CSS rule to the style element
style.appendChild(document.createTextNode(cssRule))

// Append the style element to the document head
document.head.appendChild(style)

// rag提示工程
function createRagPrompt (userQuestion, contexts) {
  const context = contexts
    .map((c, i) => `[[citation:${i + 1}]] ${c['title'] + '.' + c['caption']}`)
    .join('\n\n')

  const _rag_query_text = `
You are a large language AI assistant built by Mixlab AI. You are given a user question, and please write clean, concise and accurate answer to the question. You will be given a set of related contexts to the question, each starting with a reference number like [[citation:x]], where x is a number. Please use the context and cite the context at the end of each sentence if applicable.

Your answer must be correct, accurate and written by an expert using an unbiased and professional tone. Please limit to 1024 tokens. Do not give any information that is not related to the question, and do not repeat. Say "information is missing on" followed by the related topic, if the given context do not provide sufficient information.

Please cite the contexts with the reference numbers, in the format [citation:x]. If a sentence comes from multiple contexts, please list all applicable citations, like [citation:3][citation:5]. Other than code and specific names and citations, your answer must be written in the same language as the question.

Here are the set of contexts:

${context}

Remember, don't blindly repeat the contexts verbatim. And here is the user question:

${userQuestion}

`
  return _rag_query_text
}

function convertImageUrlToBase64 (imageUrl) {
  return fetch(imageUrl)
    .then(response => response.blob())
    .then(blob => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () =>
          resolve(reader.result.replace(/data:image\/[^;]+;base64,/, ''))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    })
}

async function getSelectImageNode () {
  var nodes = app.canvas.selected_nodes
  var imageNode
  if (Object.keys(app.canvas.selected_nodes).length == 0) return
  for (var id in nodes) {
    if (nodes[id].imgs) {
      let base64 = await convertImageUrlToBase64(nodes[id].imgs[0].currentSrc)
      imageNode = { data: base64, id: 10 }
    }
  }
  return imageNode
}

async function search (keyword) {
  try {
    const response = await fetch('/search/bing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyword })
    })
    const data = await response.json()
    // 处理返回的数据
    console.log(data)
    return data
  } catch (error) {
    // 处理错误情况
    console.error(error)
    return []
  }
}

// 聊天模式
// https://github.com/ggerganov/llama.cpp/blob/master/grammars/list.gbnf
async function chat (userInput, imageNode, callback, controller) {
  let data = {
    n_predict: 512, //长度
    stop: ['</s>', 'Llama:', 'User:', 'Output:', '<|end|>'], //停止符
    grammar:
      'root ::= item+\n\n# Excludes various line break characters\nitem ::= "- " [^\\r\\n\\x0b\\x0c\\x85\\u2028\\u2029]+ "\\n"'
  }
  if (imageNode) {
    data = { ...data, image_data: [imageNode] }
  }

  let config = {}
  if (controller) {
    config = { controller }
  }
  let prompt = `${systemPrompt.trim()}\n\nUser: ${userInput.trim()}\nOutput:`
  const request = llama(prompt, 'http://127.0.0.1:8080', data, config)
  for await (const chunk of request) {
    if (callback) callback(chunk.data.content)
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

async function* completion (prompt, imageNode) {
  let data = {
    prompt,
    n_predict: 512,
    stream: true
  }
  if (imageNode) {
    data = { ...data, image_data: [imageNode] }
  }

  let controller = new AbortController()

  let response = await fetch('http://127.0.0.1:8080/completion', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      Connection: 'keep-alive',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    signal: controller.signal
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let content = ''
  let leftover = '' // Buffer for partially read lines

  try {
    let cont = true
    while (cont) {
      const result = await reader.read()
      if (result.done) {
        break
      }

      // Add any leftover data to the current chunk of data
      const text = leftover + decoder.decode(result.value)

      // Check if the last character is a line break
      const endsWithLineBreak = text.endsWith('\n')

      // Split the text into lines
      let lines = text.split('\n')

      // If the text doesn't end with a line break, then the last line is incomplete
      // Store it in leftover to be added to the next chunk of data
      if (!endsWithLineBreak) {
        leftover = lines.pop()
      } else {
        leftover = '' // Reset leftover if we have a line break at the end
      }

      // Parse all sse events and add them to result
      const regex = /^(\S+):\s(.*)$/gm
      for (const line of lines) {
        const match = regex.exec(line)
        if (match) {
          result[match[1]] = match[2]
          // since we know this is llama.cpp, let's just decode the json in data
          if (result.data) {
            result.data = JSON.parse(result.data)
            content += result.data.content

            // yield
            yield result

            // if we got a stop token from server, we will break here
            if (result.data.stop) {
              if (result.data.generation_settings) {
                // generation_settings = result.data.generation_settings;
              }
              cont = false
              break
            }
          }
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('llama error: ', e)
    }
    throw e
  } finally {
    controller.abort()
  }

  return content
  // return (await response.json()).content
}

async function completion_ (prompt, imageNode, callback) {
  let request = await completion(prompt, imageNode)
  for await (const chunk of request) {
    if (callback) callback(chunk.data.content)
  }
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
    // console.log(data)
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

async function initModel () {
  let data = {
    task: 'run'
  }

  if (localStorage.getItem('_mix_sd_prompt_model')) {
    data.model_name = localStorage.getItem('_mix_sd_prompt_model')
  }
  let res = await fetchData(data)
  let hostUrl = res.data

  localStorage.setItem('_mix_sd_prompt_model', res.model_name)

  return hostUrl
}

async function runModel (
  model_name = 'TinyLlama-1.1B-Chat-v1.0.Q5_K_M.llamafile'
) {
  let res = await fetchData({
    task: 'run',
    model_name
  })
  let hostUrl = res.data
  localStorage.setItem('_mix_sd_prompt_model', res.model_name)

  document.body
    .querySelector('#mixlab_chatbot_by_llamafile_btn')
    .setAttribute('title', res.model_name)

  return hostUrl
}

async function stopModel () {
  let res = await fetchData({
    task: 'stop'
  })
  // let models=res.data
  return res
}

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

let isScriptLoaded = {}

function loadExternalScript (url) {
  return new Promise((resolve, reject) => {
    if (isScriptLoaded[url]) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = url
    script.onload = () => {
      isScriptLoaded[url] = true
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}
// loadExternalScript('/extensions/comfyui-llamafile/lib/editorjs.umd.js')

// 创建图表
function createChart (allNodes, nodes) {
  //category
  let category = {}

  // 全部目录
  for (const name in allNodes) {
    category[allNodes[name].category] = {
      name: allNodes[name].category,
      path: allNodes[name].category,
      children: {},
      value: 0
    }
  }

  // 统计使用情况
  for (const node of nodes) {
    if (!allNodes[node.name]) {
      allNodes[node.name] = {
        category: ['Reroute', 'Note', 'PrimitiveNode'].includes(node.name)
          ? 'utils'
          : '-----'
      }
      // console.log(node.value)
    }
    if (!category[allNodes[node.name].category]) {
      category[allNodes[node.name].category] = {
        name: allNodes[node.name].category,
        path: allNodes[node.name].category,
        children: {},
        value: 0
      }
    }

    category[allNodes[node.name].category].value += node.value

    if (!category[allNodes[node.name].category].children[node.name]) {
      category[allNodes[node.name].category].children[node.name] = {
        name: node.name,
        path: `${allNodes[node.name].category}/${node.name}`,
        value: 0
      }
    }

    category[allNodes[node.name].category].children[node.name].value +=
      node.value
  }

  console.log('_MYALLNODES', category)

  // 处理成表格读取的数据
  category = Array.from(Object.values(category), c => {
    c.children = Object.values(c.children)
    return c
  })

  let data = {}
  // 对目录进一步计算一级目录 /分隔符
  for (const c of category) {
    let cc = c.name.split('/')
    if (cc.length > 1) {
      if (!data[cc[0]]) {
        data[cc[0]] = {
          name: cc[0],
          path: cc[0],
          children: [],
          value: 0
        }
      }
      data[cc[0]].children.push(c)
      data[cc[0]].value += c.value
    } else {
      if (!data[c.name]) {
        data[c.name] = {
          name: c.name,
          path: c.path,
          children: [],
          value: 0
        }
      }
      data[c.name].children = [...data[c.name].children, ...c.children]
      data[c.name].value += c.value
    }
  }

  data = Object.values(data)

  let div = document.querySelector('#mixlab_comfyui_llamafile')

  let chartDom = div.querySelector('.chart')
  if (!chartDom) {
    chartDom = document.createElement('div')
    chartDom.style = `height:80vh;width:650px`
    chartDom.className = 'chart'
    div.appendChild(chartDom)
  } else {
    chartDom.style.display = `block`
  }

  var myChart = echarts.init(chartDom)
  var option
  // console.log(nodes)
  option = {
    series: [
      {
        type: 'treemap',
        data: data
      }
    ]
  }
  option && myChart.setOption(option)
}

// 加载nodes数据
async function loadMyAllNodes () {
  var nodes = {}

  try {
    let myApps = await get_my_app()
    // console.log(myApps)

    // app 数据分析
    for (const app of myApps) {
      for (const node of app.data.nodes) {
        if (!nodes[node.type]) nodes[node.type] = { name: node.type, value: 0 }
        nodes[node.type].value++
      }
    }
  } catch (error) {}

  // 模板数据
  const templates = await loadTemplate()

  Array.from(templates, t => {
    let j = JSON.parse(t.data)
    for (let node of j.nodes) {
      if (!nodes[node.type]) nodes[node.type] = { name: node.type, value: 0 }
      nodes[node.type].value++
    }
  })
  nodes = Object.values(nodes).sort((a, b) => b.value - a.value)

  return nodes
}

async function loadCurrentNodes () {
  var nodes = {}

  for (const node of (await app.graphToPrompt()).workflow.nodes) {
    if (!nodes[node.type]) nodes[node.type] = { name: node.type, value: 0 }
    nodes[node.type].value++
  }

  nodes = Object.values(nodes).sort((a, b) => b.value - a.value)

  return nodes
}

function createCurrentNodeBtn () {
  let currentNodesBtn = document.createElement('button')
  currentNodesBtn.style = `color: var(--input-text);
  background-color: var(--comfy-input-bg);
  border-radius: 8px;
  border-color: var(--border-color);
  cursor: pointer;`
  currentNodesBtn.innerText = `Current Nodes`

  currentNodesBtn.addEventListener('click', async e => {
    e.preventDefault()
    // if (currentNodesBtn.getAttribute('data-display') === '1') {
    //   // 关闭
    //   let div = document.querySelector('#mixlab_comfyui_llamafile')
    //   let chartDom = div.querySelector('.chart')
    //   if (chartDom) {
    //     chartDom.style.display = `none`
    //   }
    //   currentNodesBtn.setAttribute('data-display', '0')
    // } else {
    //
    let nodes = await loadCurrentNodes()
    //已安装的所有节点

    createChart(_MYALLNODES, nodes)

    currentNodesBtn.setAttribute('data-display', '1')
    // }
  })
  return currentNodesBtn
}

function createAllNodeBtn () {
  let nodesBtn = document.createElement('button')
  nodesBtn.style = `color: var(--input-text);
  background-color: var(--comfy-input-bg);
  border-radius: 8px;
  border-color: var(--border-color);
  cursor: pointer;`
  nodesBtn.innerText = `All Nodes`
  nodesBtn.addEventListener('click', async e => {
    e.preventDefault()
    //
    let nodes = await loadMyAllNodes()
    //已安装的所有节点

    createChart(_MYALLNODES, nodes)

    nodesBtn.setAttribute('data-display', '1')
    // }
  })
  return nodesBtn
}

async function createChatbotPannel () {
  let mixlab_comfyui_llamafile = document.querySelector(
    '#mixlab_comfyui_llamafile'
  )

  if (!mixlab_comfyui_llamafile) {
    mixlab_comfyui_llamafile = document.createElement('div')
    mixlab_comfyui_llamafile.id = 'mixlab_comfyui_llamafile'

    mixlab_comfyui_llamafile.className = 'loading'

    document.body.appendChild(mixlab_comfyui_llamafile)

    // 顶部
    let headerBar = document.createElement('div')
    headerBar.style = `display: flex;
        width: calc(100% - 24px);
        justify-content: space-between;
        align-items: center;
        padding: 0 12px;
        height: 44px;`

    mixlab_comfyui_llamafile.appendChild(headerBar)

    // 顶部title
    let textB = document.createElement('p')
    textB.style.fontSize = '12px'
    textB.innerText = `SD Prompt ♾️Mixlab ?HELP`
    textB.setAttribute(
      'title',
      [
        'To complete the input, use "@" to invoke the completion mode',
        '@ 调用chat模式'
      ].join('\n')
    )

    headerBar.appendChild(textB)

    //右侧关闭区域
    let closeBtns = document.createElement('div')
    headerBar.appendChild(closeBtns)
    closeBtns.style = `    min-width: 200px;
    display: flex;
    flex-direction: row-reverse;
    justify-content: space-between;
    align-items: center;`

    // 关闭按钮
    let btnB = document.createElement('button')
    btnB.className = 'mx_close'

    btnB.addEventListener('click', () => {
      mixlab_comfyui_llamafile.style.display = 'none'
      // stopModel()
    })
    btnB.innerText = 'X'
    closeBtns.appendChild(btnB)

    //stop 模型服务
    let stopModelBtn = document.createElement('button')
    stopModelBtn.id = 'llamafile_stop_model_btn'
    stopModelBtn.style = `display:none;float: right; border: none; color: var(--input-text);
     background-color: var(--comfy-input-bg); border-color: var(--border-color);cursor: pointer;margin-right:12px`
    stopModelBtn.addEventListener('click', () => {
      mixlab_comfyui_llamafile.style.display = 'none'
      stopModelBtn.style.display = 'none'
      addNodeBtn.style.display = 'none'
      document.body.querySelector(
        '#mixlab_chatbot_by_llamafile_btn'
      ).style.borderBottom = 'none'

      if (document.body.querySelector('#llm'))
        document.body.querySelector('#llm').style.display = 'none'

        stopModel()

    })
    stopModelBtn.innerText = 'Unload Model'
    closeBtns.appendChild(stopModelBtn)

    //状态
    let statusDiv = document.createElement('div')
    statusDiv.className = 'mx_chat_status'
    closeBtns.appendChild(statusDiv)

    // 悬浮框拖动事件
    headerBar.addEventListener('mousedown', function (e) {
      var startX = e.clientX
      var startY = e.clientY
      var offsetX = mixlab_comfyui_llamafile.offsetLeft
      var offsetY = mixlab_comfyui_llamafile.offsetTop

      function moveBox (e) {
        var newX = e.clientX
        var newY = e.clientY
        var deltaX = newX - startX
        var deltaY = newY - startY
        mixlab_comfyui_llamafile.style.left = offsetX + deltaX + 'px'
        mixlab_comfyui_llamafile.style.top = offsetY + deltaY + 'px'
        localStorage.setItem(
          'mixlab_app_pannel',
          JSON.stringify({
            x: mixlab_comfyui_llamafile.style.left,
            y: mixlab_comfyui_llamafile.style.top
          })
        )
      }

      function stopMoving () {
        document.removeEventListener('mousemove', moveBox)
        document.removeEventListener('mouseup', stopMoving)
      }

      document.addEventListener('mousemove', moveBox)
      document.addEventListener('mouseup', stopMoving)
    })

    // 功能区域
    let content = document.createElement('div')
    content.className = 'content'
    content.style.width = '100%'
    mixlab_comfyui_llamafile.appendChild(content)

    // 模型选择
    let modelsBtn = document.createElement('div')
    modelsBtn.className = 'models'
    modelsBtn.style.width = '100%'
    content.appendChild(modelsBtn)

    // node分析的功能
    //  const currentNodesBtn = createCurrentNodeBtn()
    //  content.appendChild(currentNodesBtn)
    //  let allNodesBtn = createAllNodeBtn()
    //  content.appendChild(allNodesBtn)

    let localLLMBtn = document.createElement('button')
    localLLMBtn.className = 'runLLM'
    localLLMBtn.innerText = `Load Model`
    content.appendChild(localLLMBtn)

    let addNodeBtn = document.createElement('button')
    addNodeBtn.style = `color: var(--input-text);
     background-color: var(--comfy-input-bg);
     border-radius: 8px;
     border-color: var(--border-color);
     position: absolute;
     right: 24px;
     top: 56px;
     cursor: pointer;display:none`
    addNodeBtn.innerText = `Add Node`
    content.appendChild(addNodeBtn)

    // 添加node
    addNodeBtn.addEventListener('click', e => {
      e.preventDefault()
      var node = LiteGraph.createNode('TextInput_')

      // 获取文本
      let llm = document.querySelector('#llm')
      let texts = document.createElement('div')
      texts.innerHTML = llm.innerHTML
      Array.from(texts.querySelectorAll('[contenteditable=false]'), c =>
        c.remove()
      )
      node.widgets[0].value =
        window.getSelection().toString() || texts.textContent

      var last_node = app.graph.getNodeById(app.graph.last_node_id)
      if (last_node) {
        node.pos = [
          last_node.pos[0] + last_node.size[0] + 24,
          last_node.pos[1] - 48
        ]
      }

      app.canvas.graph.add(node, false)
      app.canvas.centerOnNode(node)
    })

    // 使用ai助手
    localLLMBtn.addEventListener('click', async e => {
      e.preventDefault()
      // addNodeBtn.style.display = 'block'
      let div = document.querySelector('#mixlab_comfyui_llamafile')
      let chartDom = div.querySelector('.chart')
      if (chartDom) {
        chartDom.style.display = `none`
      }
      let llm = document.body.querySelector('#llm')

      if (!llm) {
        llm = document.createElement('div')
        llm.id = 'llm'
        llm.style.display = 'none'
        llm.setAttribute('contenteditable', true)
        content.appendChild(llm)
        llm.addEventListener('input', async e => {
          e.preventDefault()
          if (e.data == '@' || e.data == '#') {
            // 出现提示
            if (llm.querySelector('.ask')) return

            llm.innerText = llm.innerText.replace(e.data, '')

            // 自动续写
            let texts = document.createElement('div')
            texts.innerHTML = llm.innerHTML
            Array.from(texts.querySelectorAll('[contenteditable=false]'), c =>
              c.remove()
            )
            llm.setAttribute('contenteditable', 'false')
            console.log(texts.textContent)

            let textContent = texts.textContent.trim()

            // 是否需要调用rag：
            // if (
            //   textContent.startsWith('Q:') ||
            //   textContent.startsWith('Q：') ||
            //   textContent.startsWith('q：') ||
            //   textContent.startsWith('q:')
            // ) {
            //   let ks = textContent.slice(2)
            //   if (ks) {
            //     const contexts = await search(ks)
            //     if (contexts && contexts.length > 0) {
            //       textContent = createRagPrompt(ks, contexts)
            //     }
            //   }
            // }

            if (e.data == '#') {
              // await completion_(textContent, await getSelectImageNode(), t => {
              //   llm.innerHTML += t.replace(/\n/g, '<br>')
              // })
            } else if (e.data == '@') {
              let controller = new AbortController()
              let ends = []

              llm.innerHTML += '<br>'

              await chat(
                textContent,
                await getSelectImageNode(),
                t => {
                  t = t.replace(/\n/g, '<br>')
                  llm.innerHTML += t
                  //有回车则终止
                  console.log(t.trim() == '<br>', t)

                  ends.push(t.trim())
                  // if (ends.length > 50) ends.shift()

                  if (hasRepeatingPhrases(ends.join(' '))) t = '<br>'

                  if (t.trim() == '<br>') {
                    llm.setAttribute('contenteditable', 'true')

                    addNodeBtn.style.display = 'block'
                    controller.abort()
                  }
                },
                controller
              )
            }

            // llm.appendChild(b)
            llm.setAttribute('contenteditable', 'true')

            addNodeBtn.style.display = 'block'
          }
          console.log(llm.textContent)
        })
      }
      llm.setAttribute('contenteditable', 'true')
      llm.innerText = ''
      llm.focus()
      // 加载中
      document.body.querySelector('.mx_chat_status').innerText = `Loading`

      modelsBtn.innerHTML = ''
      let h = await health()

      if (h.match('Error')) {
        // localLLMBtn.innerText = h;
        document.body.querySelector('.mx_chat_status').innerText = 'unavailable'
        console.log(h)

        localLLMBtn.style.display = 'block'
        // llm.style.display = 'none'

        let models = await getModels()
        console.log(models)
        // llm.innerHTML += models
        if (models.length > 0) {
          localLLMBtn.innerText = 'refresh models'

          Array.from(models, m => {
            let b = document.createElement('button')
            b.innerText = m
            b.setAttribute('contenteditable', 'false')
            b.style = `color: var(--input-text);
     background-color: var(--comfy-input-bg);
     border-radius: 8px;
     border-color: var(--border-color);
     cursor: pointer;    padding: 12px;
     margin: 8px;`
            b.addEventListener('click', async e => {
              e.preventDefault()

              document.body.querySelector(
                '.mx_chat_status'
              ).innerText = `Loading`
              modelsBtn.innerHTML = ''
              // llm.setAttribute('contenteditable', 'false')
              // llm.innerText = ''
              await runModel(m)

              updateStatus()
            })
            modelsBtn.appendChild(b)
          })
        } else {
          // 状态
          localLLMBtn.innerText = `pls download models >`
        }
      } else {
        // 状态
        document.body.querySelector('.mx_chat_status').innerText = `Status:${h}`
        // Test()
        document.body.querySelector('#llamafile_stop_model_btn').style.display =
          'block'

        llm.setAttribute('contenteditable', 'true')
        llm.style.display = 'block'

        document.body.querySelector(
          '#mixlab_chatbot_by_llamafile_btn'
        ).style.borderBottom = '1px solid red'

        // let runLLM = document.body.querySelector('button.runLLM')
        localLLMBtn.style.display = 'none'
      }
    })
  } else {
    mixlab_comfyui_llamafile.querySelector('.runLLM').innerText = 'Load Model'

    if (!mixlab_comfyui_llamafile.classList.contains('loading'))
      mixlab_comfyui_llamafile.classList.add('loading')
  }

  // 开关
  if (mixlab_comfyui_llamafile.style.display == 'flex') {
    mixlab_comfyui_llamafile.style.display = 'none'
    // stopModel()
  } else {
    let pos = JSON.parse(
      localStorage.getItem('mixlab_app_pannel') ||
        JSON.stringify({ x: 0, y: 0 })
    )

    mixlab_comfyui_llamafile.style = `
    flex-direction: column;
    align-items: end;
    display:flex;
    position: absolute; 
    top: ${pos.y}; left: ${pos.x}; width: 650px; 
    color: var(--descrip-text);
    background-color: var(--comfy-menu-bg);
    padding: 10px; 
    border: 1px solid black;z-index: 999999999;padding-top: 0;`
    let h = await health()
    if (h === 'ok') {
      if (window._checkHealth) {
        clearInterval(window._checkHealth)
        window._checkHealth = null
      }

      document.body.querySelector('.mx_chat_status').innerText = `Status:${h}`
      let llm = document.body.querySelector('#llm')
      if (llm) {
        llm.setAttribute('contenteditable', 'true')
        llm.style.display = 'block'
      }

      // Test()
      document.body.querySelector('#llamafile_stop_model_btn').style.display =
        'block'

      document.body.querySelector(
        '#mixlab_chatbot_by_llamafile_btn'
      ).style.borderBottom = '1px solid red'

      let runLLM = document.body.querySelector('button.runLLM')
      runLLM.style.display = 'none'
    } else {
      let runLLM = document.body.querySelector('button.runLLM')
      runLLM.style.display = 'block'
    }
  }

  //health 检测
  checkHealth()

  return mixlab_comfyui_llamafile
}

async function checkHealth () {
  let s = document.body.querySelector('.mx_chat_status')
  let pannel = document.body.querySelector('#mixlab_comfyui_llamafile')
  if (pannel && !pannel.classList.contains('loading'))
    pannel.classList.add('loading')

  let runLLM = document.body.querySelector('button.runLLM')

  let h = await health()
  if (h === 'ok') {
    if (window._checkHealth) {
      clearInterval(window._checkHealth)
      window._checkHealth = null
    }

    if (pannel) pannel.classList.remove('loading')

    if (s) s.innerText = `Status:${h}`

    let llm = document.body.querySelector('#llm')
    if (!llm) {
      if (runLLM) runLLM.click()
    } else {
      console.log('#显示对话框', llm)
      llm.setAttribute('contenteditable', 'true')
      llm.style.display = 'block'
    }

    // Test()
    if (document.body.querySelector('#llamafile_stop_model_btn'))
      document.body.querySelector('#llamafile_stop_model_btn').style.display =
        'block'

    document.body.querySelector(
      '#mixlab_chatbot_by_llamafile_btn'
    ).style.borderBottom = '1px solid red'
    document.body
      .querySelector('#mixlab_chatbot_by_llamafile_btn')
      .setAttribute('title', localStorage.getItem('_mix_sd_prompt_model'))

    if (runLLM) runLLM.style.display = 'none'
  } else {
    if (s) s.innerText = 'unavailable'
    // console.log(h)
    if (pannel) pannel.classList.remove('loading')
    // document.body.querySelector('#llamafile_stop_model_btn').style.display =
    //   'block'

    if (runLLM) runLLM.style.display = 'block'

    let llm = document.body.querySelector('#llm')

    document.body.querySelector(
      '#mixlab_chatbot_by_llamafile_btn'
    ).style.borderBottom = 'none'

    // if (llm) llm.style.display = 'none'
  }
}

function updateStatus () {
  if (window._checkHealth) {
    clearInterval(window._checkHealth)
    window._checkHealth = null
  }
  window._checkHealth = setInterval(checkHealth, 1000)
}

// 菜单入口
async function createMenu () {
  const menu = document.querySelector('.comfy-menu')
  const separator = document.createElement('div')
  separator.style = `margin: 20px 0px;
  width: 100%;
  height: 1px;
  background: var(--border-color);
  `
  menu.append(separator)

  const appsButton = document.createElement('button')
  appsButton.id = 'mixlab_chatbot_by_llamafile_btn'
  appsButton.textContent = 'SDPrompt♾️Mixlab'

  // appsButton.onclick = () =>
  appsButton.onclick = async () => {
    // let s=await health();
    // if(s==='ok'){
    //   appsButton.style.borderBottom='1px solid red'
    // }else{
    //   appsButton.style.borderBottom='none'
    // }
    createChatbotPannel()
  }
  menu.append(appsButton)
}

function get_url () {
  let api_host = `${window.location.hostname}:${window.location.port}`
  let api_base = ''
  let url = `${window.location.protocol}//${api_host}${api_base}`
  return url
}

async function getAllNodes () {
  let url = get_url()
  const res = await fetch(`${url}/object_info`)
  return await res.json()
}

async function get_my_app (filename = null, category = '') {
  let url = get_url()
  const res = await fetch(`${url}/mixlab/workflow`, {
    method: 'POST',
    body: JSON.stringify({
      task: 'my_app',
      filename,
      category,
      admin: true
    })
  })
  let result = await res.json()
  let data = []
  try {
    for (const res of result.data) {
      let { app, workflow } = res.data
      if (app.filename)
        data.push({
          ...app,
          data: workflow,
          date: res.date
        })
    }
  } catch (error) {}
  return data
}

const loadTemplate = async () => {
  const id = 'Comfy.NodeTemplates'
  const file = 'comfy.templates.json'

  let templates = []
  if (app.storageLocation === 'server') {
    if (app.isNewUserSession) {
      // New user so migrate existing templates
      const json = localStorage.getItem(id)
      if (json) {
        templates = JSON.parse(json)
      }
      await api.storeUserData(file, json, { stringify: false })
    } else {
      const res = await api.getUserData(file)
      if (res.status === 200) {
        try {
          templates = await res.json()
        } catch (error) {}
      } else if (res.status !== 404) {
        console.error(res.status + ' ' + res.statusText)
      }
    }
  } else {
    const json = localStorage.getItem(id)
    if (json) {
      templates = JSON.parse(json)
    }
  }

  return templates ?? []
}

app.registerExtension({
  name: 'Comfy.llamafile.main',
  init () {
    // 初始化加载模型
    initModel().then(() => {
      checkHealth()
    })

    LGraphCanvas.prototype.text2text = async function (node) {
      console.log(node)
      let widget = node.widgets.filter(
        w => w.name === 'text' && typeof w.value == 'string'
      )[0]
      if (widget) {
        let controller = new AbortController()
        let ends = []
        let userInput = widget.value
        widget.value += '\n'
        await chat(
          userInput,
          await getSelectImageNode(),
          t => {
            widget.value += t
            //有回车则终止
            t = t.replace(/\n/g, '<br>')
            ends.push(t.trim())
            if (hasRepeatingPhrases(ends.join(' '))) t = '<br>'
            if (t.trim() == '<br>') {
              controller.abort()
            }
          },
          controller
        )
      }
    }

    const getNodeMenuOptions = LGraphCanvas.prototype.getNodeMenuOptions // store the existing method
    LGraphCanvas.prototype.getNodeMenuOptions = function (node) {
      // replace it
      const options = getNodeMenuOptions.apply(this, arguments) // start by calling the stored one
      node.setDirtyCanvas(true, true) // force a redraw of (foreground, background)

      let opts = []

      if (node.widgets) {
        let text_widget = node.widgets.filter(
          w => w.name === 'text' && typeof w.value == 'string'
        )

        if (text_widget && text_widget.length == 1) {
          opts = [
            {
              content: 'Text-to-Text ♾️Mixlab', // with a name
              callback: () => {
                LGraphCanvas.prototype.text2text(node)
              } // and the callback
            }
            // {
            //   content: 'Fix node v2', // with a name
            //   callback: () => {
            //     LGraphCanvas.prototype.fixTheNode(node)
            //   }
            // }
          ]
        }
      }

      return [...opts, null, ...options] // and return the options
    }
  },
  setup () {
    createMenu()
    loadExternalScript('/extensions/comfyui-llamafile/lib/echarts.min.js')
    getAllNodes().then(n => (_MYALLNODES = n))
  },
  async loadedGraphNode (node, app) {}
})
