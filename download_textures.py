import os
import urllib.request


def ensure_dir(path: str) -> None:
    # 创建纹理目录
    os.makedirs(path, exist_ok=True)


def download(url: str, dest_path: str) -> None:
    # 下载单个纹理文件
    try:
        print(f"下载: {url} -> {dest_path}")
        urllib.request.urlretrieve(url, dest_path)
    except Exception as e:
        print(f"下载失败: {url} 错误: {e}")


def main() -> None:
    textures = {
        "8k_sun.jpg": "https://www.solarsystemscope.com/textures/download/8k_sun.jpg",
        "8k_mercury.jpg": "https://www.solarsystemscope.com/textures/download/8k_mercury.jpg",
        "8k_venus_surface.jpg": "https://www.solarsystemscope.com/textures/download/8k_venus_surface.jpg",
        "8k_earth_daymap.jpg": "https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg",
        "8k_moon.jpg": "https://www.solarsystemscope.com/textures/download/8k_moon.jpg",
        "8k_mars.jpg": "https://www.solarsystemscope.com/textures/download/8k_mars.jpg",
        "8k_jupiter.jpg": "https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg",
        "8k_saturn.jpg": "https://www.solarsystemscope.com/textures/download/8k_saturn.jpg",
        "8k_uranus.jpg": "https://www.solarsystemscope.com/textures/download/8k_uranus.jpg",
        "8k_neptune.jpg": "https://www.solarsystemscope.com/textures/download/8k_neptune.jpg",
    }

    base_dir = os.path.dirname(os.path.abspath(__file__))
    tex_dir = os.path.join(base_dir, "textures")
    ensure_dir(tex_dir)

    for filename, url in textures.items():
        dest = os.path.join(tex_dir, filename)
        if os.path.exists(dest):
            print(f"已存在，跳过: {dest}")
            continue
        download(url, dest)


if __name__ == "__main__":
    main()
