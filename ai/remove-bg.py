from flask import Flask, request, send_file
from rembg import remove
import io

app = Flask(__name__)

@app.route("/remove", methods=["POST"])
def remove_bg():
    if "image" not in request.files:
        return "No image uploaded", 400

    file = request.files["image"]
    input_data = file.read()

    output = remove(input_data)

    return send_file(
        io.BytesIO(output),
        mimetype="image/png"
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)