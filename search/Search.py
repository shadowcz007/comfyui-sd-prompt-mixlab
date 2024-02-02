import subprocess,sys,os
import json
 
python_embeded = os.path.dirname(sys.executable)

shot_scraper=os.path.join(python_embeded,'Scripts/shot-scraper')



def Bing(keyword):

    # keyword="llamafile"

    url="https://www.bing.com/search?q={}".format(keyword)

    # 定义要运行的命令

    # 运行js
    command_js= "{} javascript \"{}\" --input {} --wait 5000 -o {}".format(shot_scraper,url,os.path.join(os.path.dirname(__file__),'search.js'),"data.json")
    print(command_js)
    # 截图
    # command_shot = "{} {} --wait {} -o {}".format(shot_scraper,url,3000,'example.png')

    # python_embeded/Scripts/shot-scraper https://www.bing.com/search?q=llamafile --wait 3000

    # 使用 subprocess.run() 函数运行命令
    result_js = subprocess.run(command_js, shell=True, capture_output=True )

    print("Standard Error:", result_js.stderr.decode('utf-8') )
    # 打开JSON文件
    with open('data.json') as file:
        # 读取文件内容
        data = json.load(file)

    return data
# result_shot = subprocess.run(command_shot, shell=True, capture_output=True )

# # 获取命令的返回值
# return_code = result.returncode

# # 获取命令的标准输出
# stdout = result.stdout

# # 获取命令的标准错误
# stderr = result.stderr.decode('utf-8')  # 将字节流解码为字符串

# # 打印结果
# print("Return Code:", return_code)
# print("Standard Output:", stdout)
# print("Standard Error:", stderr)