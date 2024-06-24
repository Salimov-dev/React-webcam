import React, { useRef, useState, useEffect } from "react";
import "./App.css";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import Quagga from "quagga";

function App() {
  const [error, setError] = useState();
  const [isEnabled, setEnabled] = useState(false);
  const [facing, setFacing] = useState("user");
  const videoRef = useRef(null);
  const [barcodeScan, setBarcodeScan] = useState("No barcode scanned");
  const canvasRef = useRef(null);
  console.log("barcodeScan", barcodeScan);

  const makePhoto = () => {
    const photo = videoRef.current.getScreenshot();
    const link = document.createElement("a");
    link.download = "photo.png";
    link.href = photo;
    link.click();
  };

  useEffect(() => {
    const scanQRCode = () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.drawImage(
        videoRef.current.video,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setBarcodeScan(code.data);
        setEnabled(false); // Stop scanning once a QR code is found
      } else {
        requestAnimationFrame(scanQRCode);
      }
    };

    if (isEnabled) {
      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: videoRef.current.video,
            constraints: {
              facingMode: facing
            }
          },
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "upc_reader",
              "code_93_reader",
              "i2of5_reader"
            ]
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 4,
          frequency: 10,
          locate: true
        },
        (err) => {
          if (err) {
            console.error(err);
            setError(err.name);
            return;
          }
          Quagga.start();
          requestAnimationFrame(scanQRCode); // Start the QR code scanning loop
        }
      );

      Quagga.onProcessed((result) => {
        if (result) {
          console.log("Processed result:", result); // Log every processed result
          if (result.boxes) {
            result.boxes
              .filter((box) => box !== result.box)
              .forEach((box) => {
                Quagga.ImageDebug.drawPath(
                  box,
                  { x: 0, y: 1 },
                  videoRef.current.video,
                  { color: "green", lineWidth: 2 }
                );
              });
          }
          if (result.codeResult && result.codeResult.code) {
            Quagga.ImageDebug.drawPath(
              result.line,
              { x: "x", y: "y" },
              videoRef.current.video,
              { color: "red", lineWidth: 3 }
            );
          }
        }
      });

      Quagga.onDetected((data) => {
        console.log("Detected:", data); // Log the detected result
        if (data && data.codeResult && data.codeResult.code) {
          setBarcodeScan(data.codeResult.code);
          Quagga.stop();
        }
      });

      return () => {
        Quagga.stop();
      };
    }
  }, [isEnabled, facing]);

  return (
    <>
      {isEnabled && (
        <>
          <Webcam
            ref={videoRef}
            audio={false}
            mirrored={facing === "user" ? true : false}
            className={facing === "user" ? "mirror" : ""}
            videoConstraints={{
              facingMode: { exact: facing }
            }}
            onUserMediaError={(error) => setError(error.name)}
            onUserMedia={() => setError(null)}
            screenshotFormat="image/jpeg"
            screenshotQuality={1}
          />
          <canvas
            ref={canvasRef}
            style={{ display: "none" }}
            width="640"
            height="480"
          ></canvas>
        </>
      )}
      {error && <div className="error">{error}</div>}
      {isEnabled && <h1>{facing === "user" ? "Front Cam" : "Back Cam"}</h1>}
      <div className="controls">
        <button onClick={() => setEnabled(!isEnabled)}>
          {isEnabled ? "Off" : "ON"}
        </button>
        <button
          onClick={() => setFacing(facing === "user" ? "environment" : "user")}
        >
          facing
        </button>
        <button onClick={() => makePhoto()}>photo</button>
      </div>
      <div>
        <h2>Barcode Scan Result: {barcodeScan}</h2>
      </div>
    </>
  );
}

export default App;
