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
        const rotationX = mouseRef.current.y * 30;
        const rotationY = mouseRef.current.x * 30;
        const offsetZ = Math.sin(Date.now() / 2000 + index) * 50;

        (cube as HTMLElement).style.transform = `perspective(1000px) rotateX(${rotationX + index * 15}deg) rotateY(${rotationY + index * 15}deg) translateZ(${offsetZ}px)`;
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
      {/* 3D Floating Cubes */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          data-cube
          className="absolute w-32 h-32 opacity-10 transition-transform duration-100"
          style={{
            left: `${20 + i * 15}%`,
            top: `${10 + (i % 3) * 20}%`,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${i * 30}deg) rotateY(${i * 45}deg)`,
          }}
        >
          {/* Cube faces */}
          {[...Array(6)].map((_, face) => (
            <div
              key={face}
              className="absolute w-full h-full border-2 border-coral/30 bg-gradient-to-br from-coral/5 to-indigo-950/5 backdrop-blur-sm"
              style={{
                transform: [
                  'translateZ(64px)',
                  'rotateY(180deg) translateZ(64px)',
                  'rotateY(90deg) translateZ(64px)',
                  'rotateY(-90deg) translateZ(64px)',
                  'rotateX(90deg) translateZ(64px)',
                  'rotateX(-90deg) translateZ(64px)',
                ][face],
              }}
            />
          ))}
        </div>
      ))}

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/5" />
    </div>
  );
}
