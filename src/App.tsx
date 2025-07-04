import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface FacePosition {
  x: number;
  y: number;
}

function useFaceTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animationId: number;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        videoRef.current!.onloadedmetadata = () => {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d')!;

          function detectFace() {
            if (videoRef.current!.readyState === videoRef.current!.HAVE_ENOUGH_DATA) {
              canvas.width = videoRef.current!.videoWidth;
              canvas.height = videoRef.current!.videoHeight;
              ctx.drawImage(videoRef.current!, 0, 0);

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              let facePixels = [];

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
                  const pixel = Math.floor(i / 4);
                  const x = pixel % canvas.width;
                  const y = Math.floor(pixel / canvas.width);
                  facePixels.push({ x, y });
                }
              }

              if (facePixels.length > 100) {
                const avgX = facePixels.reduce((sum, p) => sum + p.x, 0) / facePixels.length;
                const avgY = facePixels.reduce((sum, p) => sum + p.y, 0) / facePixels.length;
                // Normalize to -1..1
                const faceX = (avgX / canvas.width - 0.5) * 2;
                const faceY = -(avgY / canvas.height - 0.5) * 2;
                setFacePosition({ x: faceX, y: faceY });
              }
            }
            animationId = requestAnimationFrame(detectFace);
          }
          detectFace();
        };
      } catch (e) {
        // Camera access denied or not available
      }
    }

    setup();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, []);

  return { facePosition, videoRef, canvasRef };
}

function TorusKnot({ facePosition }: { facePosition: FacePosition }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [horizontalSensitivity, setHorizontalSensitivity] = useState(0.5);
  const [verticalSensitivity, setVerticalSensitivity] = useState(0.5);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x = facePosition.y * verticalSensitivity * Math.PI;
      meshRef.current.rotation.y = facePosition.x * horizontalSensitivity * Math.PI;
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1, 0.4, 100, 16]} />
        <meshStandardMaterial color="#ff6b6b" metalness={0.7} roughness={0.2} />
      </mesh>
      <Html position={[-0.7, -2, 0]}>
        <div style={{ 
          background: 'rgba(0,0,0,0.5)', 
          padding: '10px', 
          borderRadius: '5px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Horizontal: {horizontalSensitivity.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.1" 
              value={horizontalSensitivity}
              onChange={(e) => setHorizontalSensitivity(parseFloat(e.target.value))}
              style={{ width: '200px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Vertical: {verticalSensitivity.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.1" 
              value={verticalSensitivity}
              onChange={(e) => setVerticalSensitivity(parseFloat(e.target.value))}
              style={{ width: '200px' }}
            />
          </div>
        </div>
      </Html>
    </>
  );
}

function StereoscopicView() {
  const { gl, size, scene } = useThree();
  const leftCamera = useRef<THREE.PerspectiveCamera>(null);
  const rightCamera = useRef<THREE.PerspectiveCamera>(null);
  const eyeSep = 0.06; // eye separation

  // Create cameras only once
  useEffect(() => {
    leftCamera.current = new THREE.PerspectiveCamera(60, (size.width / 2) / size.height, 0.1, 1000);
    rightCamera.current = new THREE.PerspectiveCamera(60, (size.width / 2) / size.height, 0.1, 1000);
  }, [size.width, size.height]);

  useFrame(() => {
    if (!leftCamera.current || !rightCamera.current) return;
    // Both cameras look at the origin, but are offset horizontally
    leftCamera.current.position.set(-eyeSep, 0, 5);
    rightCamera.current.position.set(eyeSep, 0, 5);
    leftCamera.current.lookAt(0, 0, 0);
    rightCamera.current.lookAt(0, 0, 0);
    leftCamera.current.aspect = (size.width / 2) / size.height;
    rightCamera.current.aspect = (size.width / 2) / size.height;
    leftCamera.current.updateProjectionMatrix();
    rightCamera.current.updateProjectionMatrix();

    // Render left eye
    gl.setScissorTest(true);
    gl.setScissor(0, 0, size.width / 2, size.height);
    gl.setViewport(0, 0, size.width / 2, size.height);
    gl.render(scene, leftCamera.current);

    // Render right eye
    gl.setScissor(size.width / 2, 0, size.width / 2, size.height);
    gl.setViewport(size.width / 2, 0, size.width / 2, size.height);
    gl.render(scene, rightCamera.current);

    gl.setScissorTest(false);
  }, 1); // run after all other frames

  return null;
}

export default function App() {
  const { facePosition, videoRef, canvasRef } = useFaceTracking();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <TorusKnot facePosition={facePosition} />
        <StereoscopicView />
      </Canvas>
    </div>
  );
}