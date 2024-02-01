import { llama } from './lib/completion.js'
import { app } from '../../../scripts/app.js'
import { api } from '../../../scripts/api.js'
let _MYALLNODES = {}

// css
// Create a style element
const style = document.createElement('style')
// Define the CSS rule for scrollbar width
const cssRule = `
#llm {
  margin: 24px;
}

#llm[contenteditable="false"] {
  animation: borderChange 3s infinite;
  border-top: 5px solid;
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

async function completion (prompt) {
  let response = await fetch('http://127.0.0.1:8080/completion', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      n_predict: 512
    })
  })
  return (await response.json()).content
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

// 分析模板里存储的nodes
async function createNodesCharts () {
  const menu = document.querySelector('.comfy-menu')
  const separator = document.createElement('div')
  separator.style = `margin: 20px 0px;
  width: 100%;
  height: 1px;
  background: var(--border-color);
  `
  menu.append(separator)

  const appsButton = document.createElement('button')
  appsButton.textContent = 'Nodes Map'

  appsButton.onclick = () => {
    let div = document.querySelector('#mixlab_comfyui_llamafile')
    if (!div) {
      div = document.createElement('div')
      div.id = 'mixlab_comfyui_llamafile'
      document.body.appendChild(div)

      let btn = document.createElement('div')
      btn.style = `display: flex;
     width: calc(100% - 24px);
     justify-content: space-between;
     align-items: center;
     padding: 0 12px;
     height: 44px;`
      div.appendChild(btn)
      let btnB = document.createElement('button')
      let textB = document.createElement('p')
      btn.appendChild(textB)
      btn.appendChild(btnB)
      textB.style.fontSize = '12px'
      textB.innerText = `Nodes Map ♾️Mixlab`

      btnB.style = `float: right; border: none; color: var(--input-text);
     background-color: var(--comfy-input-bg); border-color: var(--border-color);cursor: pointer;`
      btnB.addEventListener('click', () => {
        div.style.display = 'none'
      })
      btnB.innerText = 'X'

      let content = document.createElement('div')
      content.className = 'content'
      content.style.width = '100%'
      div.appendChild(content)

      // node分析的功能
      let nodesBtn = document.createElement('button')
      nodesBtn.style = `color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 8px;
      border-color: var(--border-color);
      cursor: pointer;`
      nodesBtn.innerText = `All Nodes`

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
      content.appendChild(currentNodesBtn)

      nodesBtn.addEventListener('click', async e => {
        e.preventDefault()
        // if (nodesBtn.getAttribute('data-display') === '1') {
        //   // 关闭
        //   let div = document.querySelector('#mixlab_comfyui_llamafile')
        //   let chartDom = div.querySelector('.chart')
        //   if (chartDom) {
        //     chartDom.style.display = `none`
        //   }
        //   nodesBtn.setAttribute('data-display', '0')
        // } else {
        //
        let nodes = await loadMyAllNodes()
        //已安装的所有节点

        createChart(_MYALLNODES, nodes)

        nodesBtn.setAttribute('data-display', '1')
        // }
      })
      content.appendChild(nodesBtn)

      let localLLMBtn = document.createElement('button')
      localLLMBtn.style = `color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 8px;
      border-color: var(--border-color);
      cursor: pointer;`
      localLLMBtn.innerText = `Local AI assistant`
      content.appendChild(localLLMBtn)

      let addNodeBtn = document.createElement('button')
      addNodeBtn.style = `color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 8px;
      border-color: var(--border-color);
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
        node.widgets[0].value = texts.textContent

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
        addNodeBtn.style.display = 'block'
        let div = document.querySelector('#mixlab_comfyui_llamafile')
        let chartDom = div.querySelector('.chart')
        if (chartDom) {
          chartDom.style.display = `none`
        }
        let llm = document.querySelector('#llm')

        if (!llm) {
          llm = document.createElement('div')
          llm.id = 'llm'
          llm.setAttribute('contenteditable', true)
          content.appendChild(llm)
          llm.addEventListener('input', async e => {
            e.preventDefault()
            if (e.data == '@') {
              // 出现提示
              if (llm.querySelector('.ask')) return

              llm.innerText = llm.innerText.replace(e.data, '')

              let b = document.createElement('button')
              b.className = 'ask'
              b.innerText = 'Add'
              b.setAttribute('contenteditable', 'false')
              b.addEventListener('click', async e => {
                e.preventDefault()
                Array.from(llm.querySelectorAll('[contenteditable=false]'), c =>
                  c.remove()
                )
                // let text = await completion(llm.textContent)
                // llm.innerHTML += text
              })

              // 自动续写
              let texts = document.createElement('div')
              texts.innerHTML = llm.innerHTML
              Array.from(texts.querySelectorAll('[contenteditable=false]'), c =>
                c.remove()
              )
              llm.setAttribute('contenteditable', 'false')
              console.log(texts.textContent)
              llm.innerHTML += `${await completion(texts.textContent)}`

              // llm.appendChild(b)
              llm.setAttribute('contenteditable', 'true')
            }
            console.log(llm.textContent)
          })
        }
        llm.setAttribute('contenteditable', 'true')
        // 加载中
        llm.innerHTML = `<p contenteditable="false">Loading</p><br>`

        let h = await health()
        console.log('health', h)

        if (h.match('Error')) {
          let models = await getModels()
          console.log(models)
          // llm.innerHTML += models
          if (models.length > 0) {
            Array.from(models, m => {
              let b = document.createElement('button')
              b.innerText = m
              b.setAttribute('contenteditable', 'false')
              b.addEventListener('click', e => {
                e.preventDefault()
                runModel(m)
                llm.innerHTML = `<p contenteditable="false">Status:Loading</p><br>`
              })
              llm.appendChild(b)
            })
          } else {
            // 状态
            llm.innerHTML = `<p contenteditable="false">pls download models</p><br>`
          }
        } else {
          // 状态
          llm.innerHTML = `<p contenteditable="false">Status:${h}</p><br>`
          // Test()
        }
      })

      // 悬浮框拖动事件
      btn.addEventListener('mousedown', function (e) {
        var startX = e.clientX
        var startY = e.clientY
        var offsetX = div.offsetLeft
        var offsetY = div.offsetTop

        function moveBox (e) {
          var newX = e.clientX
          var newY = e.clientY
          var deltaX = newX - startX
          var deltaY = newY - startY
          div.style.left = offsetX + deltaX + 'px'
          div.style.top = offsetY + deltaY + 'px'
          localStorage.setItem(
            'mixlab_app_pannel',
            JSON.stringify({ x: div.style.left, y: div.style.top })
          )
        }

        function stopMoving () {
          document.removeEventListener('mousemove', moveBox)
          document.removeEventListener('mouseup', stopMoving)
        }

        document.addEventListener('mousemove', moveBox)
        document.addEventListener('mouseup', stopMoving)
      })
    }
    if (div.style.display == 'flex') {
      div.style.display = 'none'
    } else {
      let pos = JSON.parse(
        localStorage.getItem('mixlab_app_pannel') ||
          JSON.stringify({ x: 0, y: 0 })
      )

      div.style = `
      flex-direction: column;
      align-items: end;
      display:flex;
      position: absolute; 
      top: ${pos.y}; left: ${pos.x}; width: 650px; 
      color: var(--descrip-text);
      background-color: var(--comfy-menu-bg);
      padding: 10px; 
      border: 1px solid black;z-index: 999999999;padding-top: 0;`
    }
  }
  menu.append(appsButton)

  // ;(async () => {
  //   let h = await health()
  //   console.log('health', h)

  //   if (h.match('Error')) {
  //     let models = await getModels()
  //     console.log(models)
  //     if (models.length > 0) {
  //       await runModel(models[0])
  //     }
  //   } else {
  //     Test()
  //   }
  // })()
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
  init () {},
  setup () {
    createNodesCharts()
    loadExternalScript('/extensions/comfyui-llamafile/lib/echarts.min.js')
    getAllNodes().then(n => (_MYALLNODES = n))
  },
  async loadedGraphNode (node, app) {}
})
