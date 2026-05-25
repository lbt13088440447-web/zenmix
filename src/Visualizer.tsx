import React, { useEffect, useRef } from 'react';
import { engine } from './audio';

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const numParticles = 120;

    class Particle {
      x: number;
      y: number;
      z: number;
      baseSize: number;
      speed: number;
      angle: number;
      colorId: number;

      constructor() {
        this.x = (Math.random() - 0.5) * w * 2.5;
        this.y = (Math.random() - 0.5) * h * 2.5;
        this.z = Math.random() * 1200 + 100;
        this.baseSize = Math.random() * 1.2 + 0.5;
        this.speed = Math.random() * 0.4 + 0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.colorId = Math.floor(Math.random() * 3);
      }

      update(dataArray: Uint8Array) {
        this.z -= this.speed;
        if (this.z <= 0) {
          this.z = 1200;
          this.x = (Math.random() - 0.5) * w * 2.5;
          this.y = (Math.random() - 0.5) * h * 2.5;
        }
        this.angle += 0.005;
        this.x += Math.sin(this.angle) * 0.5;
        this.y += Math.cos(this.angle) * 0.5;
      }

      draw(ctx: CanvasRenderingContext2D, dataArray: Uint8Array) {
        const fov = 350;
        const scale = fov / (fov + this.z);
        const x2d = this.x * scale + w / 2;
        const y2d = this.y * scale + h / 2;

        const bin = Math.floor((this.z / 1200) * (dataArray.length / 4));
        const audioVal = dataArray[bin] / 255.0;

        const size = this.baseSize * scale * (1 + audioVal * 4);
        const alpha = Math.min(1, (1200 - this.z) / 400) * (0.15 + audioVal * 0.5);

        // Draw geometric circle
        ctx.beginPath();
        ctx.arc(x2d, y2d, size, 0, Math.PI * 2);

        // Theme colors (Indigo, Purple, Violet)
        if (this.colorId === 0) {
          ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`; // indigo-500
        } else if (this.colorId === 1) {
          ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`; // purple-400
        } else {
          ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`; // violet-500
        }
        
        ctx.fill();
        
        // draw subtle halo
        ctx.beginPath();
        const haloSize = size * 2.5;
        ctx.arc(x2d, y2d, haloSize, 0, Math.PI * 2);
        
        if (this.colorId === 0) ctx.fillStyle = `rgba(99, 102, 241, ${alpha * 0.1})`;
        else if (this.colorId === 1) ctx.fillStyle = `rgba(192, 132, 252, ${alpha * 0.1})`;
        else ctx.fillStyle = `rgba(139, 92, 246, ${alpha * 0.1})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < numParticles; i++) particles.push(new Particle());

    const dataArray = new Uint8Array(256);

    let reqId: number;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      
      if (engine.analyser && engine.isPlayingState) {
        engine.analyser.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      particles.forEach((p, i) => {
        p.update(dataArray);
        p.draw(ctx, dataArray);

        // Connect nearby particles to create a geometric mesh
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dz = p.z - p2.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          
          if (distSq < 40000) { // proximity threshold
            const fov = 350;
            const scale1 = fov / (fov + p.z);
            const x1 = p.x * scale1 + w / 2;
            const y1 = p.y * scale1 + h / 2;

            const scale2 = fov / (fov + p2.z);
            const x2 = p2.x * scale2 + w / 2;
            const y2 = p2.y * scale2 + h / 2;

            const alpha = Math.min(1, (1200 - Math.min(p.z, p2.z)) / 400) * 0.15;
            const linkAlpha = alpha * (1 - distSq / 40000); // fade out as they separate
            
            // Pulse connection on beat
            const bin = Math.floor((p.z / 1200) * (dataArray.length / 4));
            const audioVal = dataArray[bin] / 255.0;
            const finalAlpha = linkAlpha * (1 + audioVal * 2);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(167, 139, 250, ${finalAlpha * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      reqId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-60"
    />
  );
}
