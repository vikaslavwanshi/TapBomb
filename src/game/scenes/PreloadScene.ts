import Phaser from 'phaser';

// All textures are generated procedurally on canvas — no asset files needed.
// Everything is drawn TOP-DOWN (matching the game camera) in whites/grays/bone
// tones so Phaser tinting gives each player's color while keeping shading and
// specular highlights. Art was iterated visually in a node-canvas workbench.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.textures.addCanvas('dragon_head', this.drawHead(false));
    this.textures.addCanvas('dragon_head_open', this.drawHead(true));
    this.textures.addCanvas('dragon_body', this.drawBody());
    this.textures.addCanvas('dragon_wing', this.drawWing());
    this.textures.addCanvas('dragon_leg', this.drawLeg());
    this.generateGlowParticle();
    this.generateFlameParticle();
  }

  create() {
    this.scene.start('GameScene');
  }

  // ── Top-down dragon head, facing +x, symmetric about y = 0.5 ──────────────

  private drawHead(open: boolean): HTMLCanvasElement {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const P = (x: number, y: number): [number, number] => [x * S, y * S];
    const mirror = (fn: (m: number) => void) => { fn(1); fn(-1); };

    // Horns: thick, ridged, rooted at the back corners of the skull
    mirror((m) => {
      const y = (v: number) => 0.5 + m * v;
      const grad = ctx.createLinearGradient(...P(0.42, y(0.2)), ...P(0.05, y(0.34)));
      grad.addColorStop(0, '#f2ecd9');
      grad.addColorStop(1, '#a89f86');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(...P(0.46, y(0.13)));
      ctx.quadraticCurveTo(...P(0.3, y(0.2)), ...P(0.1, y(0.4)));
      ctx.quadraticCurveTo(...P(0.07, y(0.44)), ...P(0.05, y(0.5)));
      ctx.quadraticCurveTo(...P(0.13, y(0.42)), ...P(0.28, y(0.3)));
      ctx.quadraticCurveTo(...P(0.38, y(0.22)), ...P(0.48, y(0.2)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,84,66,0.5)';
      ctx.lineWidth = S * 0.008;
      for (const t of [0.3, 0.45, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(...P(0.46 - t * 0.34, y(0.13 + t * 0.24)));
        ctx.lineTo(...P(0.46 - t * 0.3, y(0.2 + t * 0.24)));
        ctx.stroke();
      }
    });

    // Skull silhouette: angular predator skull — jaw hinge, brow flares over
    // the eyes, concave taper into a narrow snout with a slight nostril flare
    const jawGap = open ? 0.05 : 0;
    const skullGrad = ctx.createLinearGradient(0, S * 0.2, 0, S * 0.8);
    skullGrad.addColorStop(0, '#7f7f7f');
    skullGrad.addColorStop(0.32, '#e2e2e2');
    skullGrad.addColorStop(0.5, '#fafafa');
    skullGrad.addColorStop(0.68, '#e2e2e2');
    skullGrad.addColorStop(1, '#7f7f7f');
    ctx.fillStyle = skullGrad;
    ctx.beginPath();
    ctx.moveTo(...P(0.2, 0.36));
    ctx.lineTo(...P(0.34, 0.26));
    ctx.quadraticCurveTo(...P(0.45, 0.2), ...P(0.55, 0.24));
    ctx.lineTo(...P(0.62, 0.32));
    ctx.quadraticCurveTo(...P(0.76, 0.38), ...P(0.86, 0.42 - jawGap));
    ctx.quadraticCurveTo(...P(0.9, 0.42 - jawGap), ...P(0.955, 0.455 - jawGap));
    ctx.quadraticCurveTo(...P(0.98, 0.475 - jawGap), ...P(0.98, 0.5 - jawGap));
    if (open) {
      ctx.lineTo(...P(0.6, 0.5));
      ctx.lineTo(...P(0.985, 0.5 + jawGap));
    }
    ctx.quadraticCurveTo(...P(0.98, 0.525 + jawGap), ...P(0.955, 0.545 + jawGap));
    ctx.quadraticCurveTo(...P(0.9, 0.58 + jawGap), ...P(0.86, 0.58 + jawGap));
    ctx.quadraticCurveTo(...P(0.76, 0.62), ...P(0.62, 0.68));
    ctx.lineTo(...P(0.55, 0.76));
    ctx.quadraticCurveTo(...P(0.45, 0.8), ...P(0.34, 0.74));
    ctx.lineTo(...P(0.2, 0.64));
    ctx.quadraticCurveTo(...P(0.14, 0.5), ...P(0.2, 0.36));
    ctx.closePath();
    ctx.fill();

    // Cheek shading to carve the skull shape
    mirror((m) => {
      const y = (v: number) => 0.5 + m * v;
      ctx.fillStyle = 'rgba(60,60,60,0.22)';
      ctx.beginPath();
      ctx.moveTo(...P(0.34, y(0.24)));
      ctx.quadraticCurveTo(...P(0.46, y(0.28)), ...P(0.58, y(0.3)));
      ctx.quadraticCurveTo(...P(0.44, y(0.34)), ...P(0.32, y(0.3)));
      ctx.closePath();
      ctx.fill();
    });

    if (open) {
      // Mouth interior — dark V with fire building in the throat
      ctx.fillStyle = '#43100c';
      ctx.beginPath();
      ctx.moveTo(...P(0.97, 0.5 - jawGap * 0.85));
      ctx.lineTo(...P(0.58, 0.5));
      ctx.lineTo(...P(0.97, 0.5 + jawGap * 0.85));
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(...P(0.64, 0.5), 1, ...P(0.64, 0.5), S * 0.09);
      glow.addColorStop(0, 'rgba(255,190,60,0.95)');
      glow.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(...P(0.64, 0.5), S * 0.09, 0, Math.PI * 2);
      ctx.fill();
      // Teeth rows on both parted jaw edges
      ctx.fillStyle = '#fcfcf4';
      mirror((m) => {
        for (let i = 0; i < 5; i++) {
          const tx = 0.64 + i * 0.065;
          const edgeY = 0.5 + m * jawGap * ((tx - 0.58) / 0.39) * 0.85;
          ctx.beginPath();
          ctx.moveTo(...P(tx, edgeY));
          ctx.lineTo(...P(tx + 0.016, 0.5 + m * 0.004));
          ctx.lineTo(...P(tx + 0.032, edgeY));
          ctx.closePath();
          ctx.fill();
        }
      });
    } else {
      // Closed jawline with interlocking fangs
      ctx.strokeStyle = 'rgba(35,35,35,0.55)';
      ctx.lineWidth = S * 0.012;
      ctx.beginPath();
      ctx.moveTo(...P(0.97, 0.5));
      ctx.quadraticCurveTo(...P(0.74, 0.52), ...P(0.56, 0.5));
      ctx.stroke();
      ctx.fillStyle = '#fcfcf4';
      for (const [tx, up] of [[0.72, 1], [0.8, -1], [0.88, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo(...P(tx, 0.505 * (up === 1 ? 1 : 0.985)));
        ctx.lineTo(...P(tx + 0.014, 0.5 + up * 0.045));
        ctx.lineTo(...P(tx + 0.028, 0.5));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Eyes: angry wedges tucked under the brow flares
    mirror((m) => {
      const y = (v: number) => 0.5 + m * v;
      ctx.fillStyle = '#101010';
      ctx.beginPath();
      ctx.moveTo(...P(0.44, y(0.21)));
      ctx.quadraticCurveTo(...P(0.55, y(0.24)), ...P(0.63, y(0.3)));
      ctx.quadraticCurveTo(...P(0.53, y(0.3)), ...P(0.45, y(0.26)));
      ctx.closePath();
      ctx.fill();
      const eyeGrad = ctx.createRadialGradient(...P(0.53, y(0.26)), 1, ...P(0.53, y(0.26)), S * 0.045);
      eyeGrad.addColorStop(0, '#ffd75e');
      eyeGrad.addColorStop(0.6, '#ff9d00');
      eyeGrad.addColorStop(1, '#b34700');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.moveTo(...P(0.465, y(0.235)));
      ctx.quadraticCurveTo(...P(0.55, y(0.255)), ...P(0.615, y(0.293)));
      ctx.quadraticCurveTo(...P(0.53, y(0.288)), ...P(0.468, y(0.252)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0c0c0c';
      ctx.lineWidth = S * 0.012;
      ctx.beginPath();
      ctx.moveTo(...P(0.535, y(0.238)));
      ctx.lineTo(...P(0.545, y(0.288)));
      ctx.stroke();
    });

    // Nostrils
    mirror((m) => {
      ctx.fillStyle = '#2f2f2f';
      ctx.beginPath();
      ctx.ellipse(...P(0.925, 0.5 + m * (0.032 + jawGap)), S * 0.016, S * 0.009, m * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crest spikes down the centerline of the skull
    ctx.fillStyle = '#d9d2bd';
    for (const [cx, h] of [[0.26, 0.05], [0.35, 0.06], [0.44, 0.05], [0.52, 0.035]] as const) {
      ctx.beginPath();
      ctx.moveTo(...P(cx - 0.028, 0.5));
      ctx.lineTo(...P(cx + 0.01, 0.5 - h));
      ctx.lineTo(...P(cx + 0.04, 0.5));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(80,80,80,0.4)';
    ctx.lineWidth = S * 0.014;
    ctx.beginPath();
    ctx.moveTo(...P(0.22, 0.5));
    ctx.lineTo(...P(0.58, 0.5));
    ctx.stroke();

    // Specular sheen along both brow flares
    mirror((m) => {
      const y = (v: number) => 0.5 + m * v;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = S * 0.022;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(...P(0.3, y(0.24)));
      ctx.quadraticCurveTo(...P(0.5, y(0.17)), ...P(0.68, y(0.26)));
      ctx.stroke();
    });

    return canvas;
  }

  // ── Body segment (top view): glossy scale plate with side spikes ──────────

  private drawBody(): HTMLCanvasElement {
    const S = 48;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#c9c2b0';
    for (const m of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(S * 0.52, S * (0.5 + m * 0.34));
      ctx.lineTo(S * 0.46, S * (0.5 + m * 0.48));
      ctx.lineTo(S * 0.6, S * (0.5 + m * 0.36));
      ctx.closePath();
      ctx.fill();
    }

    const grad = ctx.createLinearGradient(0, S * 0.1, 0, S * 0.9);
    grad.addColorStop(0, '#828282');
    grad.addColorStop(0.35, '#e6e6e6');
    grad.addColorStop(0.5, '#fafafa');
    grad.addColorStop(0.65, '#e6e6e6');
    grad.addColorStop(1, '#828282');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(S / 2, S / 2, S * 0.44, S * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal spine plate down the centerline
    ctx.fillStyle = '#d6cfba';
    ctx.beginPath();
    ctx.moveTo(S * 0.26, S * 0.5);
    ctx.lineTo(S * 0.5, S * 0.4);
    ctx.lineTo(S * 0.74, S * 0.5);
    ctx.lineTo(S * 0.5, S * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Scale arcs on the flanks
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    for (const m of [1, -1]) {
      ctx.beginPath();
      ctx.arc(S / 2, S * (0.5 + m * 0.42), S * 0.3, Math.PI * (m === 1 ? 1.15 : 0.15), Math.PI * (m === 1 ? 1.85 : 0.85));
      ctx.stroke();
    }

    // Sheen
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(S * 0.42, S * 0.34, S * 0.15, S * 0.05, -0.2, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  // ── Wing (top view): shoulder at mid-left, extends right. In game the right
  //    wing is rotated to sweep back-right; the left wing is the same texture
  //    flipped on Y.

  private drawWing(): HTMLCanvasElement {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    const shoulder: [number, number] = [S * 0.06, S * 0.5];
    const tips: [number, number][] = [
      [S * 0.97, S * 0.3],
      [S * 0.88, S * 0.56],
      [S * 0.66, S * 0.78],
    ];

    const membrane = ctx.createLinearGradient(shoulder[0], shoulder[1] - S * 0.2, S * 0.9, S * 0.6);
    membrane.addColorStop(0, 'rgba(230,230,230,0.97)');
    membrane.addColorStop(0.55, 'rgba(180,180,180,0.92)');
    membrane.addColorStop(1, 'rgba(125,125,125,0.88)');
    ctx.fillStyle = membrane;
    ctx.beginPath();
    ctx.moveTo(...shoulder);
    ctx.quadraticCurveTo(S * 0.5, S * 0.12, ...tips[0]);
    ctx.quadraticCurveTo(S * 0.86, S * 0.44, ...tips[1]);
    ctx.quadraticCurveTo(S * 0.72, S * 0.66, ...tips[2]);
    ctx.quadraticCurveTo(S * 0.34, S * 0.74, shoulder[0] + S * 0.04, shoulder[1] + S * 0.12);
    ctx.closePath();
    ctx.fill();

    // Bones: thick arm along the leading edge, fingers radiating from the bend
    ctx.strokeStyle = '#696969';
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.05;
    ctx.beginPath();
    ctx.moveTo(...shoulder);
    ctx.quadraticCurveTo(S * 0.45, S * 0.13, ...tips[0]);
    ctx.stroke();
    ctx.lineWidth = S * 0.024;
    const knuckle: [number, number] = [S * 0.4, S * 0.28];
    for (const tip of tips.slice(1)) {
      ctx.beginPath();
      ctx.moveTo(...knuckle);
      ctx.quadraticCurveTo((knuckle[0] + tip[0]) / 2 + S * 0.04, (knuckle[1] + tip[1]) / 2 - S * 0.04, ...tip);
      ctx.stroke();
    }
    // Wing claw at the bend
    ctx.fillStyle = '#efe9d8';
    ctx.beginPath();
    ctx.moveTo(S * 0.42, S * 0.22);
    ctx.lineTo(S * 0.5, S * 0.1);
    ctx.lineTo(S * 0.48, S * 0.26);
    ctx.closePath();
    ctx.fill();

    // Sheen along the membrane
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = S * 0.05;
    ctx.beginPath();
    ctx.moveTo(S * 0.2, S * 0.4);
    ctx.quadraticCurveTo(S * 0.5, S * 0.28, S * 0.8, S * 0.4);
    ctx.stroke();

    return canvas;
  }

  // ── Leg (top view): compact haunch + forward-splayed claws ─────────────────

  private drawLeg(): HTMLCanvasElement {
    const S = 48;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(S * 0.36, S * 0.3, 2, S * 0.4, S * 0.36, S * 0.34);
    grad.addColorStop(0, '#e8e8e8');
    grad.addColorStop(1, '#8e8e8e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(S * 0.4, S * 0.36, S * 0.3, S * 0.24, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#9c9c9c';
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.16;
    ctx.beginPath();
    ctx.moveTo(S * 0.52, S * 0.5);
    ctx.quadraticCurveTo(S * 0.62, S * 0.62, S * 0.6, S * 0.76);
    ctx.stroke();

    ctx.fillStyle = '#efe9d8';
    for (const dx of [-0.12, 0.02, 0.16]) {
      ctx.beginPath();
      ctx.moveTo(S * (0.56 + dx * 0.4), S * 0.76);
      ctx.lineTo(S * (0.6 + dx), S * 0.97);
      ctx.lineTo(S * (0.66 + dx * 0.5), S * 0.78);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(S * 0.34, S * 0.28, S * 0.12, S * 0.06, 0.5, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
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

  // Pre-colored flame — used for breath, fireballs, and fizzles

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
