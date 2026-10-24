"""AI crowd counting on live beach cam frames.

Frames come from YouTube's public live thumbnail, which YouTube refreshes about every five minutes
while a stream is live. Two models look at each frame:

- DM-Count (MIT, cvlab-stonybrook/DM-Count via litert-community) estimates a crowd density map.
  It counts dense crowds well, where detectors give up, and the map is drawn as the heat overlay.
- YOLOX-S (Apache-2.0, Megvii) detects individual people. It does better than DM-Count on sparse
  scenes with a few people, and its boxes are drawn on the frame.

The reported count is the larger of the two. Both run on the CPU, and the model files (~120 MB in
total) are downloaded into backend/models/ the first time they're needed."""

import asyncio
import io
import os
import time
from pathlib import Path

import numpy as np
from PIL import Image

MODELS = Path(__file__).parent / "models"
YOLOX_URL = "https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_s.onnx"
DMCOUNT_URL = "https://huggingface.co/litert-community/DM-Count-Crowd-LiteRT/resolve/main/dmcount.tflite"
THREADS = os.cpu_count() or 4

YOLO_INPUT = 640
PERSON = 0
MIN_SCORE = 0.3
DM_INPUT = 512
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)
TOO_DARK = 45  # mean brightness (0-255) below which a frame is treated as night

# Rough crowd levels from the head count. Cams see very different amounts of beach, so these are
# a starting point to tune per cam once there's history to compare against.
LEVELS = [(15, "Quiet"), (80, "Moderate")]

_models = {}
_model_lock = asyncio.Lock()
_run_lock = asyncio.Lock()


def youtube_frame_url(embed_url):
    """Latest still of a YouTube live stream, or None for players we can't get frames from."""
    if "youtube" not in (embed_url or ""):
        return None
    video_id = embed_url.split("/embed/")[1].split("?")[0]
    return f"https://i.ytimg.com/vi/{video_id}/maxresdefault_live.jpg"


async def _download(client, url, path):
    if path.exists():
        return
    path.parent.mkdir(exist_ok=True)
    res = await client.get(url, follow_redirects=True, timeout=300)
    res.raise_for_status()
    path.write_bytes(res.content)


async def _load_models(client):
    async with _model_lock:
        if not _models:
            yolox_path, dm_path = MODELS / "yolox_s.onnx", MODELS / "dmcount.tflite"
            await asyncio.gather(_download(client, YOLOX_URL, yolox_path), _download(client, DMCOUNT_URL, dm_path))
            import onnxruntime
            from ai_edge_litert.interpreter import Interpreter

            options = onnxruntime.SessionOptions()
            options.intra_op_num_threads = THREADS
            _models["yolox"] = onnxruntime.InferenceSession(str(yolox_path), options, providers=["CPUExecutionProvider"])
            dm = Interpreter(model_path=str(dm_path), num_threads=THREADS)
            dm.allocate_tensors()
            _models["dmcount"] = dm
    return _models


def _tiles(width, height, cols, rows, overlap=0.0):
    tw, th = width / (cols - (cols - 1) * overlap), height / (rows - (rows - 1) * overlap)
    for r in range(rows):
        for c in range(cols):
            x, y = c * tw * (1 - overlap), r * th * (1 - overlap)
            yield round(x), round(y), round(min(width, x + tw)), round(min(height, y + th))


# --- YOLOX people detection ---

def _grids():
    grids, strides = [], []
    for stride in (8, 16, 32):
        size = YOLO_INPUT // stride
        ys, xs = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
        grids.append(np.stack((xs, ys), 2).reshape(-1, 2))
        strides.append(np.full((size * size, 1), stride))
    return np.concatenate(grids), np.concatenate(strides)


GRID, STRIDE = _grids()


def _yolo_tile(session, tile):
    """People in one RGB tile as [x1, y1, x2, y2, score] in tile pixels."""
    scale = min(YOLO_INPUT / tile.width, YOLO_INPUT / tile.height)
    resized = tile.resize((round(tile.width * scale), round(tile.height * scale)), Image.BILINEAR)
    canvas = np.full((YOLO_INPUT, YOLO_INPUT, 3), 114, dtype=np.float32)
    canvas[: resized.height, : resized.width] = np.asarray(resized, dtype=np.float32)[:, :, ::-1]  # YOLOX wants BGR
    out = session.run(None, {session.get_inputs()[0].name: canvas.transpose(2, 0, 1)[None]})[0][0]

    score = out[:, 4] * out[:, 5 + PERSON]
    keep = score > MIN_SCORE
    if not keep.any():
        return np.zeros((0, 5))
    xy = (out[keep, :2] + GRID[keep]) * STRIDE[keep]
    wh = np.exp(out[keep, 2:4]) * STRIDE[keep]
    boxes = np.concatenate([xy - wh / 2, xy + wh / 2], 1) / scale
    return np.concatenate([boxes, score[keep, None]], 1)


def _nms(dets, iou=0.45):
    order = dets[:, 4].argsort()[::-1]
    area = (dets[:, 2] - dets[:, 0]) * (dets[:, 3] - dets[:, 1])
    keep = []
    while order.size:
        i, rest = order[0], order[1:]
        keep.append(i)
        w = np.clip(np.minimum(dets[i, 2], dets[rest, 2]) - np.maximum(dets[i, 0], dets[rest, 0]), 0, None)
        h = np.clip(np.minimum(dets[i, 3], dets[rest, 3]) - np.maximum(dets[i, 1], dets[rest, 1]), 0, None)
        overlap = w * h / (area[i] + area[rest] - w * h + 1e-9)
        order = rest[overlap < iou]
    return dets[keep]


def detect_people(session, image):
    """A whole-frame pass for close people plus overlapping zoomed-in tiles for distant ones."""
    found = [_yolo_tile(session, image)]
    for x1, y1, x2, y2 in _tiles(image.width, image.height, 3, 2, overlap=0.15):
        dets = _yolo_tile(session, image.crop((x1, y1, x2, y2)))
        dets[:, [0, 2]] += x1
        dets[:, [1, 3]] += y1
        found.append(dets)
    dets = np.concatenate(found)
    return _nms(dets) if len(dets) else dets


# --- DM-Count density ---

def density_map(interpreter, image, cols=3, rows=2):
    """Crowd density over the frame, (rows*64) x (cols*64); its sum is the estimated count.
    Tiles keep distant people large enough for the model to see."""
    inp, out = interpreter.get_input_details()[0], interpreter.get_output_details()[0]
    size = DM_INPUT // 8
    density = np.zeros((rows * size, cols * size), np.float32)
    for i, (x1, y1, x2, y2) in enumerate(_tiles(image.width, image.height, cols, rows)):
        tile = image.crop((x1, y1, x2, y2)).resize((DM_INPUT, DM_INPUT), Image.BILINEAR)
        x = (np.asarray(tile, np.float32) / 255 - MEAN) / STD
        interpreter.set_tensor(inp["index"], x.transpose(2, 0, 1)[None].copy())
        interpreter.invoke()
        r, c = divmod(i, cols)
        density[r * size:(r + 1) * size, c * size:(c + 1) * size] = interpreter.get_tensor(out["index"])[0, 0]
    return density


def _shrink(density, rows=36, cols=64):
    """Down-sample the density map for the overlay, scaled so the busiest cell is 1."""
    h, w = density.shape
    small = density[: h - h % rows, : w - w % cols].reshape(rows, h // rows, cols, w // cols).sum((1, 3))
    peak = small.max()
    return np.round(small / peak, 3).tolist() if peak > 0 else small.tolist()


def level_for(count):
    for limit, label in LEVELS:
        if count < limit:
            return label
    return "Busy"


def analyze(models, image):
    if np.asarray(image.convert("L"), np.float32).mean() < TOO_DARK:
        return {"dark": True, "count": None, "level": None, "people": [], "density": None, "detected": 0, "estimated": 0}
    dets = detect_people(models["yolox"], image)
    density = density_map(models["dmcount"], image)
    estimated = float(density.sum())
    count = max(len(dets), round(estimated))
    w, h = image.size
    people = [
        [round(x1 / w, 4), round(y1 / h, 4), round((x2 - x1) / w, 4), round((y2 - y1) / h, 4), round(float(s), 2)]
        for x1, y1, x2, y2, s in dets
    ]
    return {
        "dark": False,
        "count": count,
        "level": level_for(count),
        "detected": len(dets),
        "estimated": round(estimated),
        "people": people,
        "density": _shrink(density),
    }


async def analyze_frame(client, frame_url):
    """Fetches the latest frame and runs both models. Returns the result and the JPEG bytes."""
    models = await _load_models(client)
    res = await client.get(frame_url, params={"t": int(time.time() // 60)}, timeout=20)
    res.raise_for_status()
    image = Image.open(io.BytesIO(res.content)).convert("RGB")
    async with _run_lock:  # one frame at a time; the models aren't shared safely across threads
        started = time.time()
        result = await asyncio.to_thread(analyze, models, image)
    result.update({
        "width": image.width,
        "height": image.height,
        "seconds": round(time.time() - started, 1),
        "models": ["DM-Count (density)", "YOLOX-S (people)"],
    })
    return result, res.content
