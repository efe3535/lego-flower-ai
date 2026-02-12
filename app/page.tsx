"use client";

import { useEffect, useRef, useState } from "react";
import * as tmImage from "@teachablemachine/image";

type Prediction = {
  className: string;
  probability: number;
};

export default function Home() {
  const webcamRef = useRef<HTMLDivElement | null>(null);
  const [result, setResult] = useState("Model yükleniyor...");
  const [description, setDescription] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [webcam, setWebcam] = useState<tmImage.Webcam | null>(null);
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);

  const flowerDescriptions = {
    cicek1: {
      title: "1. Lego Çiçeği",
      description: "manyak çiçek. altında kesin altın maltın var. fazla şey sorma çünkü bilmiyom. 2. çiçeği bekliyoz. yağmur yapınca atcakmış."
    },
    cicek2: {
      title: "🌻 Lego Papatya",
      description: "Sarı merkezli beyaz papatya tespit edildi! Bu sevimli çiçek masumiyet ve doğalelığin simgesi. Lego ile doğanın güzelligini yakalamak harika!"
    }
  };

  const startWebcam = async (loadedModel: tmImage.CustomMobileNet, deviceId?: string) => {
    if (webcam) {
      webcam.stop();
      if (webcamRef.current) {
        webcamRef.current.innerHTML = "";
      }
    }

    const newWebcam = new tmImage.Webcam(600, 600, true, deviceId);
    await newWebcam.setup();
    await newWebcam.play();
    setWebcam(newWebcam);

    if (webcamRef.current) {
      webcamRef.current.appendChild(newWebcam.canvas);
    }

    const loop = async () => {
      newWebcam.update();
      const predictions = (await loadedModel.predict(newWebcam.canvas)) as Prediction[];

      const cicek1 = predictions.find((p) => p.className === "cicek");
      const cicek2 = predictions.find((p) => p.className === "cicek2");

      if (cicek1 && cicek1.probability > 0.85) {
        setResult(flowerDescriptions.cicek1.title);
        setDescription(flowerDescriptions.cicek1.description);
      } else if (cicek2 && cicek2.probability > 0.85) {
        setResult(flowerDescriptions.cicek2.title);
        setDescription(flowerDescriptions.cicek2.description);
      } else {
        setResult("❌ Çiçek Bulunamadı");
        setDescription("Lego çiçeğinizi kameraya gösterin. Sistem otomatik olarak tanıyacaktır.");
      }

      requestAnimationFrame(loop);
    };

    loop();
  };

  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Kameralar listelenirken hata:', error);
    }
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (model) {
      startWebcam(model, deviceId);
    }
  };

  useEffect(() => {
    const loadModel = async () => {
      const modelURL = "/model/model.json";
      const metadataURL = "/model/metadata.json";

      const loadedModel = await tmImage.load(modelURL, metadataURL);
      setModel(loadedModel);

      await getAvailableCameras();
      startWebcam(loadedModel, selectedCamera || undefined);
    };

    loadModel();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-white font-sans dark:bg-black">
      <main className="flex h-full w-full max-w-3xl flex-col items-center justify-center py-8 px-8 bg-white dark:bg-black">
        <div className="text-center space-y-4 w-full h-full flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-black dark:text-white">MechaWolves BAŞLIK FALAN KOYUCAZ</h1>

          {cameras.length > 1 && (
            <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg shadow-md border border-zinc-300 dark:border-zinc-700">
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
            </div>
          )}

          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl shadow-lg flex-1 flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
            <div className="border-2 border-black dark:border-white rounded-lg p-2 flex justify-center overflow-hidden max-w-fit mx-auto" ref={webcamRef}></div>
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
