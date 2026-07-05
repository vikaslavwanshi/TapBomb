import Phaser from 'phaser';

// All textures are generated procedurally on canvas — no asset files needed.
// Dragon parts are drawn in whites/grays/bone tones so Phaser tinting gives
// each player's color while keeping the shading and specular highlights.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.textures.addCanvas('dragon_head', this.drawHead(false));
    this.textures.addCanvas('dragon_head_open', this.drawHead(true));
    this.generateBodySegment();
    this.generateWing();
    this.generateLeg();
    this.generateGlowParticle();
    this.generateFlameParticle();
  }

  create() {
    this.scene.start('GameScene');
  }

  // ── Dragon head (facing +x) — closed or roaring with open jaw ─────────────

  private drawHead(open: boolean): HTMLCanvasElement {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const P = (x: number, y: number): [number, number] => [x * S, y * S];

    // Neck frill spikes at the back of the skull
    ctx.fillStyle = '#b9b2a2';
    for (const [sx, sy, len] of [[0.2, 0.32, 0.16], [0.14, 0.44, 0.2], [0.16, 0.58, 0.17]]) {
      ctx.beginPath();
      ctx.moveTo(...P(sx + 0.1, sy));
      ctx.lineTo(...P(sx - len, sy + 0.02));
      ctx.lineTo(...P(sx + 0.1, sy + 0.1));
      ctx.closePath();
      ctx.fill();
    }

    // Swept-back horns
    const horn = (x0: number, y0: number, tipX: number, tipY: number, w: number, shade: string) => {
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(...P(x0, y0));
      ctx.quadraticCurveTo(...P((x0 + tipX) / 2, tipY - 0.08), ...P(tipX, tipY));
      ctx.quadraticCurveTo(...P((x0 + tipX) / 2, tipY + 0.02), ...P(x0 + w, y0 + 0.06));
      ctx.closePath();
      ctx.fill();
    };
    horn(0.38, 0.3, 0.04, 0.08, 0.14, '#e8e2d2');
    horn(0.5, 0.28, 0.24, 0.02, 0.1, '#d5cebb');

    // Skull — radial gradient for a shiny scaled look
    const skullGrad = ctx.createRadialGradient(S * 0.32, S * 0.4, 3, S * 0.36, S * 0.5, S * 0.32);
    skullGrad.addColorStop(0, '#ffffff');
    skullGrad.addColorStop(0.45, '#e6e6e6');
    skullGrad.addColorStop(1, '#8f8f8f');
    ctx.fillStyle = skullGrad;
    ctx.beginPath();
    ctx.ellipse(S * 0.36, S * 0.5, S * 0.27, S * 0.23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper jaw / snout — tapered, tilts up when roaring
    const upTilt = open ? -0.1 : 0;
    const upperGrad = ctx.createLinearGradient(S * 0.4, S * 0.3, S * 0.95, S * 0.5);
    upperGrad.addColorStop(0, '#efefef');
    upperGrad.addColorStop(1, '#b5b5b5');
    ctx.fillStyle = upperGrad;
    ctx.beginPath();
    ctx.moveTo(...P(0.42, 0.34));
    ctx.quadraticCurveTo(...P(0.75, 0.3 + upTilt), ...P(0.96, 0.4 + upTilt));
    ctx.lineTo(...P(0.94, 0.47 + upTilt));
    ctx.quadraticCurveTo(...P(0.7, 0.5 + upTilt * 0.5), ...P(0.46, 0.52));
    ctx.closePath();
    ctx.fill();

    // Lower jaw — drops when roaring
    const lowDrop = open ? 0.16 : 0;
    ctx.fillStyle = '#a8a8a8';
    ctx.beginPath();
    ctx.moveTo(...P(0.44, 0.56));
    ctx.quadraticCurveTo(...P(0.7, 0.56 + lowDrop), ...P(0.9, 0.55 + lowDrop));
    ctx.lineTo(...P(0.88, 0.62 + lowDrop));
    ctx.quadraticCurveTo(...P(0.62, 0.66 + lowDrop * 0.7), ...P(0.42, 0.64));
    ctx.closePath();
    ctx.fill();

    if (open) {
      // Mouth interior
      ctx.fillStyle = '#5a1410';
      ctx.beginPath();
      ctx.moveTo(...P(0.46, 0.5));
      ctx.lineTo(...P(0.93, 0.4 + upTilt));
      ctx.lineTo(...P(0.89, 0.56 + lowDrop));
      ctx.closePath();
      ctx.fill();
      // Inner glow of building fire
      const fireGrad = ctx.createRadialGradient(S * 0.55, S * 0.52, 1, S * 0.55, S * 0.52, S * 0.16);
      fireGrad.addColorStop(0, 'rgba(255,200,60,0.95)');
      fireGrad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(S * 0.55, S * 0.52, S * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Teeth — along upper jaw edge (and lower when roaring)
    ctx.fillStyle = '#f8f8f2';
    for (let i = 0; i < 4; i++) {
      const tx = 0.56 + i * 0.09;
      const ty = open ? 0.46 + upTilt + i * 0.005 : 0.5;
      ctx.beginPath();
      ctx.moveTo(...P(tx, ty));
      ctx.lineTo(...P(tx + 0.02, ty + 0.06));
      ctx.lineTo(...P(tx + 0.045, ty));
      ctx.closePath();
      ctx.fill();
    }
    if (open) {
      for (let i = 0; i < 3; i++) {
        const tx = 0.58 + i * 0.09;
        const ty = 0.56 + lowDrop;
        ctx.beginPath();
        ctx.moveTo(...P(tx, ty));
        ctx.lineTo(...P(tx + 0.02, ty - 0.055));
        ctx.lineTo(...P(tx + 0.045, ty));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Brow ridge + fierce slanted eye
    ctx.strokeStyle = '#6f6f6f';
    ctx.lineWidth = S * 0.028;
    ctx.beginPath();
    ctx.moveTo(...P(0.36, 0.34));
    ctx.lineTo(...P(0.52, 0.38));
    ctx.stroke();
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.ellipse(S * 0.45, S * 0.42, S * 0.055, S * 0.035, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.ellipse(S * 0.455, S * 0.42, S * 0.032, S * 0.022, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.ellipse(S * 0.457, S * 0.42, S * 0.008, S * 0.02, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Nostril
    ctx.fillStyle = '#5c5c5c';
    ctx.beginPath();
    ctx.ellipse(S * 0.87, S * (0.43 + upTilt), S * 0.016, S * 0.011, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Specular shine across the skull top — the "shiny" scales
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = S * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(...P(0.24, 0.36));
    ctx.quadraticCurveTo(...P(0.42, 0.28), ...P(0.62, 0.33));
    ctx.stroke();

    return canvas;
  }

  // ── Body segment — glossy scale with a dorsal spike ────────────────────────

  private generateBodySegment() {
    const S = 48;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    // Dorsal spike
    ctx.fillStyle = '#c9c2b0';
    ctx.beginPath();
    ctx.moveTo(S * 0.38, S * 0.2);
    ctx.lineTo(S * 0.5, S * 0.0);
    ctx.lineTo(S * 0.62, S * 0.2);
    ctx.closePath();
    ctx.fill();

    // Scale body with a strong specular gradient
    const grad = ctx.createRadialGradient(S * 0.38, S * 0.36, 1, S * 0.5, S * 0.52, S * 0.46);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#ececec');
    grad.addColorStop(0.75, '#bdbdbd');
    grad.addColorStop(1, '#878787');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(S / 2, S * 0.55, S * 0.44, S * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Overlapping scale arcs
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(S / 2, S * 0.75, S * 0.3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(S / 2, S * 0.6, S * 0.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Glint
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(S * 0.38, S * 0.38, S * 0.1, S * 0.05, -0.5, 0, Math.PI * 2);
    ctx.fill();

    this.textures.addCanvas('dragon_body', canvas);
  }

  // ── Bat-style wing — shoulder at left-center, extends right ───────────────

  private generateWing() {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const shoulder: [number, number] = [S * 0.08, S * 0.55];

    // Membrane — spans three finger tips with scalloped trailing edge
    const tips: [number, number][] = [
      [S * 0.95, S * 0.18],
      [S * 0.88, S * 0.5],
      [S * 0.68, S * 0.78],
    ];
    const membrane = ctx.createLinearGradient(shoulder[0], shoulder[1], S * 0.9, S * 0.3);
    membrane.addColorStop(0, 'rgba(210,210,210,0.95)');
    membrane.addColorStop(1, 'rgba(150,150,150,0.8)');
    ctx.fillStyle = membrane;
    ctx.beginPath();
    ctx.moveTo(...shoulder);
    ctx.quadraticCurveTo(S * 0.5, S * 0.05, ...tips[0]);
    ctx.quadraticCurveTo(S * 0.82, S * 0.36, ...tips[1]);
    ctx.quadraticCurveTo(S * 0.72, S * 0.62, ...tips[2]);
    ctx.quadraticCurveTo(S * 0.4, S * 0.78, ...shoulder);
    ctx.closePath();
    ctx.fill();

    // Wing bones — leading arm plus fingers to each tip
    ctx.strokeStyle = '#7a7a7a';
    ctx.lineWidth = S * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(...shoulder);
    ctx.quadraticCurveTo(S * 0.45, S * 0.1, ...tips[0]);
    ctx.stroke();
    ctx.lineWidth = S * 0.022;
    for (const tip of tips.slice(1)) {
      ctx.beginPath();
      ctx.moveTo(...shoulder);
      ctx.quadraticCurveTo(S * 0.5, (shoulder[1] + tip[1]) / 2 - S * 0.08, ...tip);
      ctx.stroke();
    }

    // Membrane sheen
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = S * 0.05;
    ctx.beginPath();
    ctx.moveTo(S * 0.2, S * 0.42);
    ctx.quadraticCurveTo(S * 0.5, S * 0.22, S * 0.8, S * 0.28);
    ctx.stroke();

    this.textures.addCanvas('dragon_wing', canvas);
  }

  // ── Small clawed leg — hip at top, claws at bottom ─────────────────────────

  private generateLeg() {
    const S = 40;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    // Thigh + shin
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.28;
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.12);
    ctx.quadraticCurveTo(S * 0.3, S * 0.45, S * 0.48, S * 0.72);
    ctx.stroke();

    // Foot
    ctx.lineWidth = S * 0.18;
    ctx.beginPath();
    ctx.moveTo(S * 0.48, S * 0.72);
    ctx.lineTo(S * 0.62, S * 0.82);
    ctx.stroke();

    // Claws
    ctx.fillStyle = '#e8e2d2';
    for (const dx of [-0.06, 0.08, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(S * (0.55 + dx), S * 0.8);
      ctx.lineTo(S * (0.6 + dx), S * 0.98);
      ctx.lineTo(S * (0.66 + dx), S * 0.82);
      ctx.closePath();
      ctx.fill();
    }

    this.textures.addCanvas('dragon_leg', canvas);
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

  // ── Flame particle — pre-colored, used for breath, fireballs, fizzles ──────

  private generateFlameParticle() {
    const S = 32;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,255,220,1)');
    grad.addColorStop(0.3, 'rgba(255,200,60,0.95)');
    grad.addColorStop(0.65, 'rgba(255,110,20,0.8)');
    grad.addColorStop(1, 'rgba(200,30,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    this.textures.addCanvas('flame_particle', canvas);
  }
}
