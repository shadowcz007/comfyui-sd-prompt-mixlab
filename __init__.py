import os,sys
import platform
import subprocess
from server import PromptServer
import folder_paths
import requests
import psutil

python = sys.executable
global process
process=None

# from .search.Search import Bing
# from server import PromptServer

try:
    import aiohttp
    from aiohttp import web,ClientSession
except ImportError:
    print("Module 'aiohttp' not installed. Please install it via:")
    print("pip install aiohttp")
    print("or")
    print("pip install -r requirements.txt")
    sys.exit()


# 优先使用phi
def phi_sort(lst):
    return sorted(lst, key=lambda x: x.lower().count('phi'), reverse=True)

model_path=os.path.join(folder_paths.models_dir, "llamafile")

if not os.path.exists(model_path):
    os.mkdir(model_path)
    print(f"##  llamafile model not found， pls download from https://github.com/Mozilla-Ocho/llamafile")

def get_models():
    files = os.listdir(model_path)
    res=[]
    for file in files:
        if os.path.isfile(os.path.join(model_path, file)):
            res.append(file)

    res=phi_sort(res)
    return res

def run_llamafile(llamafile,file_name):
    global process
    if process:
        return 'http://127.0.0.1:8080'
    # Check the operating system
    operating_system = platform.system()
    mp=os.path.join(model_path,file_name)

    # Set the file name and command based on the operating system
    # file_name = "llava-v1.5-7b-q4.llamafile"
    #todo 修改为llama cmd 运行
    #   ./llamafile.exe -ngl 9999 -m openchat-3.5-0106.Q4_K_M.gguf --server --nobrowser
    
    command = f"{llamafile} -m {mp} --n-gpu-layers 999 --server --nobrowser"

    # Grant execution permission on macOS, Linux, or BSD
    if operating_system in ["Darwin", "Linux", "FreeBSD", "OpenBSD"]:
        if not os.access(mp, os.X_OK):
            os.chmod(mp, 0o755)

    # Run the llamafile
    process = subprocess.Popen(command, shell=True)

    return 'http://127.0.0.1:8080'

def stop_llamafile():
    global process
    if not process:
        return "No running process to kill"
    
    # Get the process ID of the running llamafile process
    process_id = process.pid
    os.system('taskkill /t /f /pid {}'.format(process_id))
  
    # Check if the process is still running
    if psutil.pid_exists(process_id):
        return "Failed to kill the process"

    process = None

    return "Process killed successfully"


def get_server_status():
    url = 'http://localhost:8080/health'
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for non-2xx response codes
        data = response.json()
        return data['status']
    except requests.exceptions.RequestException as e:
        return f'Error: {e}'
    except KeyError:
        return 'Error: Failed to retrieve server status'

# 创建路由表
routes = PromptServer.instance.routes


@routes.post('/llamafile')
async def llamafile_hander(request):
    data = await request.json()
    dirname=os.path.dirname(__file__)
    result={
        "data":""
    }
    if 'task' in data:
        if data['task']=='list':
            result={
                "data":get_models()
            }
        if data['task']=='run':
            model_name=get_models()[0]
            if 'model_name' in data:
                model_name=data['model_name']
            #todo 修改为llama cmd 运行
            #   ./llamafile.exe -ngl 9999 -m openchat-3.5-0106.Q4_K_M.gguf --server --nobrowser
            res=run_llamafile(os.path.join(dirname,'llamafile.exe'),model_name)
            if res:
                result={
                    "data":res,
                    "model_name":model_name
                }
        if data['task']=='stop':
            res=stop_llamafile()
            result={
                    "data":res
                }
                
        if data['task']=='health':
            result={
                    "data":get_server_status()
                }
            
    return web.json_response(result)


# @routes.post('/search/bing')
# async def search_hander(request):
#     data = await request.json()
#     result=Bing(data['keyword'])
#     return web.json_response(result)

NODE_CLASS_MAPPINGS = {
    
}

NODE_DISPLAY_NAME_MAPPINGS = {
   
}

WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
