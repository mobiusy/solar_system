import http.server
import socketserver
import mimetypes


# 确保 .js/.mjs 使用 JavaScript MIME 类型
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")


class JsMimeRequestHandler(http.server.SimpleHTTPRequestHandler):
    pass


def main():
    port = 4175
    with socketserver.TCPServer(("", port), JsMimeRequestHandler) as httpd:
        print(f"Serving HTTP on 0.0.0.0 port {port} (http://localhost:{port}/) ...")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
