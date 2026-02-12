"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as tmImage from "@teachablemachine/image";

type Prediction = {
  className: string;
  probability: number;
};

const flowerDescriptions = {
  cicek1: {
    title: "Veri 1",
    description: "1. veri açıklaması"
  },
  cicek2: {
    title: "Veri 2",
    description: "2. veri açıklaması"
  }
};

export default function Home() {
  const webcamRef = useRef<HTMLDivElement | null>(null);
  const webcamInstanceRef = useRef<tmImage.Webcam | null>(null);
  const [result, setResult] = useState("Model yükleniyor...");
  const [description, setDescription] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua);
  });

  const getShouldMirror = (deviceId?: string) => {
    if (!deviceId) return true;

    const camera = cameras.find((c) => c.deviceId === deviceId);
    const label = camera?.label?.toLowerCase() || "";

    if (label.includes("back") || label.includes("rear") || label.includes("environment")) {
      return false;
    }

    return true;
  };

  const startWebcam = useCallback(async (
    loadedModel: tmImage.CustomMobileNet,
    options?: { deviceId?: string; facingMode?: "user" | "environment" },
    mirror: boolean = true
  ) => {
    if (webcamInstanceRef.current) {
      webcamInstanceRef.current.stop();
      if (webcamRef.current) {
        webcamRef.current.innerHTML = "";
      }
    }

    const newWebcam = new tmImage.Webcam(600, 600, mirror);
    const videoConstraints =
      options?.deviceId
        ? { deviceId: { exact: options.deviceId } }
        : options?.facingMode
          ? { facingMode: options.facingMode }
          : undefined;

    await newWebcam.setup(videoConstraints);
    await newWebcam.play();
    webcamInstanceRef.current = newWebcam;

    if (webcamRef.current) {
      webcamRef.current.appendChild(newWebcam.canvas);
      if (newWebcam.canvas) {
        newWebcam.canvas.style.width = "100%";
        newWebcam.canvas.style.height = "auto";
      }
    }

    const loop = async () => {
      if (!webcamInstanceRef.current) return;

      webcamInstanceRef.current.update();
      const predictions = (await loadedModel.predict(webcamInstanceRef.current.canvas)) as Prediction[];

      const cicek1 = predictions.find((p) => p.className === "cicek");
      const cicek2 = predictions.find((p) => p.className === "cicek2");

      if (cicek1 && cicek1.probability > 0.85) {
        setResult(flowerDescriptions.cicek1.title);
        setDescription(flowerDescriptions.cicek1.description);
      } else if (cicek2 && cicek2.probability > 0.85) {
        setResult(flowerDescriptions.cicek2.title);
        setDescription(flowerDescriptions.cicek2.description);
      } else {
        setResult("❌ Veri Bulunamadı");
        setDescription("Veriyi kameraya gösterin. Sistem otomatik olarak tanıyacaktır.");
      }

      requestAnimationFrame(loop);
    };

    loop();
  }, []);

  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedCamera((prev) => prev || videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Kameralar listelenirken hata:', error);
    }
  }, []);

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (model) {
      startWebcam(model, { deviceId }, getShouldMirror(deviceId));
    }
  };

  useEffect(() => {
    const loadModel = async () => {
      const modelURL = "/model/model.json";
      const metadataURL = "/model/metadata.json";

      const loadedModel = await tmImage.load(modelURL, metadataURL);
      setModel(loadedModel);

      await getAvailableCameras();
      startWebcam(loadedModel);
    };

    loadModel();
  }, [getAvailableCameras, startWebcam]);

  const handleSwitchCamera = () => {
    if (!model) return;

    // iOS / iPadOS Safari: facingMode ile ön / arka kamera arasında geçiş
    if (isIOS) {
      startWebcam(model, { facingMode: "environment" }, false);
      return;
    }

    // Diğer tarayıcılar: deviceId ile geçiş
    if (cameras.length <= 1) return;

    setSelectedCamera((prev) => {
      if (!prev) {
        const firstId = cameras[0]?.deviceId;
        if (firstId) {
          startWebcam(model, { deviceId: firstId }, getShouldMirror(firstId));
        }
        return firstId || prev;
      }

      const currentIndex = cameras.findIndex((camera) => camera.deviceId === prev);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextId = cameras[nextIndex]?.deviceId;

      if (nextId) {
        startWebcam(model, { deviceId: nextId }, getShouldMirror(nextId));
      }

      return nextId || prev;
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-white font-sans dark:bg-black">

      <main className="flex h-full w-full max-w-3xl flex-col items-center justify-center py-8 px-8 bg-white dark:bg-black">

        <div className="text-center space-y-4 w-full h-full flex flex-col justify-center">

          <h1 className="text-2xl font-bold text-black dark:text-white">MechaWolves</h1>


          <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg shadow-md border border-zinc-300 dark:border-zinc-700 w-full">
            <label className="block text-sm font-semibold mb-3 text-black dark:text-white">📹 Kamera Seçin:</label>
            <select
              value={selectedCamera}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black dark:bg-zinc-800 dark:border-white dark:text-white dark:focus:ring-white dark:focus:border-white transition-all duration-200"
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `📷 Kamera ${index + 1}`}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSwitchCamera}
              className="mt-2 w-full px-4 py-3 border-2 border-black rounded-lg bg-black text-white text-sm font-semibold active:scale-[0.99] dark:bg-white dark:text-black transition-transform"
            >
              📱 Kamerayı Değiştir
            </button>
          </div>


          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl shadow-lg flex-1 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 w-full">
            <div
              className="border-2 border-black dark:border-white rounded-lg p-2 flex justify-center overflow-hidden w-full max-w-md sm:max-w-lg mx-auto"
              ref={webcamRef}
            ></div>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <p className="text-3xl font-bold text-black dark:text-white mb-2">{result}</p>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
          </div>

        </div>

      </main>

    </div>
  );
}
