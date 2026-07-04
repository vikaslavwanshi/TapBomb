import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // All textures generated procedurally — no asset files needed
    this.generateDragonHead();
    this.generateBodySegment();
    this.generateGlowParticle();
  }

  create() {
    this.scene.start('GameScene');
  }

  // ── Texture generators ────────────────────────────────────────────────────

  private generateDragonHead() {
    const S = 96;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    // Base head circle with gradient
    const headGrad = ctx.createRadialGradient(S * 0.42, S * 0.42, 2, S * 0.45, S * 0.45, S * 0.44);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.6, '#dddddd');
    headGrad.addColorStop(1, '#aaaaaa');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(S * 0.45, S * 0.5, S * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#cccccc';
    ctx.beginPath();
    ctx.ellipse(S * 0.82, S * 0.5, S * 0.2, S * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostril
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.arc(S * 0.88, S * 0.44, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S * 0.88, S * 0.56, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(S * 0.6, S * 0.35, 7, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(S * 0.62, S * 0.33, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Slit pupil
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.ellipse(S * 0.6, S * 0.35, 2, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Main horn
    ctx.fillStyle = '#ccaa55';
    ctx.beginPath();
    ctx.moveTo(S * 0.38, S * 0.14);
    ctx.lineTo(S * 0.3, S * 0.0);
    ctx.lineTo(S * 0.5, S * 0.18);
    ctx.closePath();
    ctx.fill();

    // Side horn
    ctx.fillStyle = '#bb9944';
    ctx.beginPath();
    ctx.moveTo(S * 0.56, S * 0.18);
    ctx.lineTo(S * 0.62, S * 0.05);
    ctx.lineTo(S * 0.68, S * 0.22);
    ctx.closePath();
    ctx.fill();

    // Jaw teeth
    ctx.fillStyle = '#eeeeee';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(S * (0.7 + i * 0.08), S * 0.6);
      ctx.lineTo(S * (0.74 + i * 0.08), S * 0.68);
      ctx.lineTo(S * (0.78 + i * 0.08), S * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    // Fin/spine along top
    ctx.fillStyle = '#ddbb66';
    const spinePoints = [
      [0.22, 0.28], [0.15, 0.18], [0.28, 0.3],
      [0.1, 0.35], [0.22, 0.38],
    ];
    spinePoints.forEach(([x, y], i) => {
      if (i % 2 === 0 && i + 1 < spinePoints.length) {
        const [nx, ny] = spinePoints[i + 1];
        ctx.beginPath();
        ctx.moveTo(S * x, S * y);
        ctx.lineTo(S * nx, S * ny);
        ctx.lineTo(S * (x + 0.08), S * (y + 0.06));
        ctx.closePath();
        ctx.fill();
      }
    });

    this.textures.addCanvas('dragon_head', canvas);
  }

  private generateBodySegment() {
    const S = 48;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    // Scale-like body segment with gradient
    const grad = ctx.createRadialGradient(S * 0.4, S * 0.4, 1, S * 0.5, S * 0.5, S * 0.46);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#dddddd');
    grad.addColorStop(1, '#999999');
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Slightly hexagonal shape to look like a scale
    ctx.ellipse(S / 2, S / 2, S * 0.44, S * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scale texture — a subtle arc
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(S / 2, S * 0.7, S * 0.3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(S / 2, S * 0.55, S * 0.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    this.textures.addCanvas('dragon_body', canvas);
  }

  private generateGlowParticle() {
    const S = 32;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    this.textures.addCanvas('glow_particle', canvas);
  }
}
