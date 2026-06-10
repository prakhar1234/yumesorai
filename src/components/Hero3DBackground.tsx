'use client';

import { useEffect, useRef } from 'react';

export function Hero3DBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const cubes = containerRef.current?.querySelectorAll('[data-cube]');
    if (!cubes) return;

    let animationId: number;
    const animate = () => {
      cubes.forEach((cube, index) => {
        const time = Date.now();
        const rotationX = mouseRef.current.y * 30;
        const rotationY = mouseRef.current.x * 30;

        // Flying to infinity effect - continuous Z-axis movement
        const cycleTime = 8000; // 8 second cycle
        const progress = ((time + index * 1000) % cycleTime) / cycleTime;

        // Cubes fly towards camera then reset
        const flyingZ = (progress * 1000) - 500;
        const offsetZ = Math.sin(time / 2500 + index) * 150;
        const floatY = Math.sin(time / 3000 + index) * 40;
        const floatX = Math.cos(time / 3500 + index) * 50;

        // Scale effect - larger when closer
        const scale = 1 + (progress * 0.3);

        (cube as HTMLElement).style.transform = `perspective(800px) rotateX(${rotationX + index * 12}deg) rotateY(${rotationY + index * 20}deg) translateZ(${flyingZ + offsetZ}px) translateY(${floatY}px) translateX(${floatX}px) scale(${scale})`;
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        perspective: '1000px',
      }}
    >
      {/* Floating Dots - Flying to Infinity */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          data-cube
          className="absolute w-3 h-3 rounded-full bg-coral opacity-20 transition-transform duration-100"
          style={{
            left: `${(i * 8.3) % 100}%`,
            top: `${(10 + (i % 4) * 18 + (i % 2) * 8) % 90}%`,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${i * 30}deg) rotateY(${i * 45}deg)`,
          }}
        />
      ))}

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/5" />
    </div>
  );
}
