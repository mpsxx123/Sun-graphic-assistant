from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import requests
import tempfile
import os
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)  # 允许所有跨域

# 首页友好提示
@app.route('/')
def index():
    return '<h2>✅ 微信图片代理服务器已启动！</h2>'
CORS(app)  # 允许所有跨域

temp_dir = tempfile.gettempdir()

@app.route('/proxy_wx_img')
def proxy_wx_img():
    url = request.args.get('url')
    if not url or not url.startswith('http'):
        return jsonify({'error': 'Invalid url'}), 400
    try:
        # 下载图片到临时文件
        resp = requests.get(url, stream=True, timeout=10)
        resp.raise_for_status()
        # 获取文件扩展名
        ext = os.path.splitext(urlparse(url).path)[-1] or '.jpg'
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=temp_dir) as tmp:
            for chunk in resp.iter_content(1024):
                tmp.write(chunk)
            tmp_path = tmp.name
        # 返回图片文件
        return send_file(tmp_path, mimetype=resp.headers.get('Content-Type', 'image/jpeg'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # 定期清理临时文件（可选：这里只是简单演示，生产环境建议用定时任务清理）
        for f in os.listdir(temp_dir):
            if f.startswith('tmp') and (f.endswith('.jpg') or f.endswith('.png') or f.endswith('.jpeg')):
                try:
                    os.remove(os.path.join(temp_dir, f))
                except Exception:
                    pass

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
