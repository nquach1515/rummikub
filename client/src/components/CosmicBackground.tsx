import { useEffect, useRef } from 'react'

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    interface Star { x: number; y: number; r: number; vx: number; vy: number; alpha: number; pulse: number; speed: number; color: string }
    const stars: Star[] = []
    const colors = ['#8b5cf6', '#6366f1', '#3b82f6', '#a78bfa', '#c084fc', '#818cf8', '#e879f9', '#ffffff']

    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    // Nebula blobs
    interface Nebula { x: number; y: number; r: number; color: string; phase: number }
    const nebulae: Nebula[] = [
      { x: w * 0.2, y: h * 0.3, r: 250, color: '139, 92, 246', phase: 0 },
      { x: w * 0.8, y: h * 0.7, r: 300, color: '59, 130, 246', phase: 2 },
      { x: w * 0.5, y: h * 0.15, r: 200, color: '236, 72, 153', phase: 4 },
      { x: w * 0.7, y: h * 0.4, r: 180, color: '99, 102, 241', phase: 1 },
    ]

    function draw(time: number) {
      ctx!.clearRect(0, 0, w, h)

      // Background gradient
      const bg = ctx!.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8)
      bg.addColorStop(0, '#0a0a18')
      bg.addColorStop(1, '#04040a')
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, w, h)

      // Nebulae
      for (const n of nebulae) {
        const osc = Math.sin(time * 0.0003 + n.phase) * 0.3 + 0.7
        const grad = ctx!.createRadialGradient(
          n.x + Math.sin(time * 0.0002 + n.phase) * 30,
          n.y + Math.cos(time * 0.00015 + n.phase) * 20,
          0,
          n.x, n.y, n.r
        )
        grad.addColorStop(0, `rgba(${n.color}, ${0.06 * osc})`)
        grad.addColorStop(0.5, `rgba(${n.color}, ${0.02 * osc})`)
        grad.addColorStop(1, 'transparent')
        ctx!.fillStyle = grad
        ctx!.fillRect(0, 0, w, h)
      }

      // Stars
      for (const s of stars) {
        s.x += s.vx
        s.y += s.vy
        s.pulse += s.speed
        if (s.x < 0) s.x = w
        if (s.x > w) s.x = 0
        if (s.y < 0) s.y = h
        if (s.y > h) s.y = 0

        const a = s.alpha * (0.5 + 0.5 * Math.sin(s.pulse))
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fillStyle = s.color.replace(')', `, ${a})`).replace('rgb', 'rgba').replace('#', '')
        // Simple hex to rgba for fill
        ctx!.globalAlpha = a
        ctx!.fillStyle = s.color
        ctx!.fill()
        ctx!.globalAlpha = 1

        // Glow for larger stars
        if (s.r > 1) {
          ctx!.beginPath()
          ctx!.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
          ctx!.globalAlpha = a * 0.15
          ctx!.fillStyle = s.color
          ctx!.fill()
          ctx!.globalAlpha = 1
        }
      }

      // Occasional shooting star
      if (Math.random() < 0.002) {
        const sx = Math.random() * w
        const sy = Math.random() * h * 0.5
        const len = 80 + Math.random() * 120
        const grad2 = ctx!.createLinearGradient(sx, sy, sx + len, sy + len * 0.3)
        grad2.addColorStop(0, 'rgba(255, 255, 255, 0)')
        grad2.addColorStop(0.5, 'rgba(200, 180, 255, 0.6)')
        grad2.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx!.strokeStyle = grad2
        ctx!.lineWidth = 1.5
        ctx!.beginPath()
        ctx!.moveTo(sx, sy)
        ctx!.lineTo(sx + len, sy + len * 0.3)
        ctx!.stroke()
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    function resize() {
      w = window.innerWidth
      h = window.innerHeight
      canvas!.width = w
      canvas!.height = h
    }
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} id="particles" />
}
