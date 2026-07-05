import Phaser from 'phaser';
import type { PlayerState, ServerMessage, Orb, Fireball } from '@/types/game';
import { GAME_CONFIG } from '@/types/game';
import { gameStore } from '@/game/gameStore';
import {
  playExplosion,
  playEatOrb,
  playKill,
  playDeath,
  playFireball,
  playCut,
  unlockAudio,
} from '@/utils/sounds';

interface DragonSprites {
  head: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Image[];
  nameTag: Phaser.GameObjects.Text;
  killBadge: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Arc;
}

const SEND_RATE_MS = 50; // send direction to server at 20hz, not 60fps

export class GameScene extends Phaser.Scene {
  private players: Record<string, PlayerState> = {};
  private orbs: Record<string, Orb> = {};
  private fireballs: Record<string, Fireball> = {};
  private fireballSprites: Record<string, Phaser.GameObjects.Image> = {};
  private orbGraphics!: Phaser.GameObjects.Graphics;
  private orbsDirty = false;
  private sprites: Record<string, DragonSprites> = {};
  private joystickDir = { x: 0, y: 0 };
  private joystick: { base: Phaser.GameObjects.Arc; thumb: Phaser.GameObjects.Arc } | null = null;
  private joystickPointerId: number | null = null;
  private fireButton: Phaser.GameObjects.Container | null = null;
  private explosionEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private killFeedTexts: Phaser.GameObjects.Text[] = [];
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys & {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private sendTimer = 0;
  private lastFireSent = 0;
  private isTouchDevice = false;

  constructor() {
    super('GameScene');
  }

  get myId() { return gameStore.myId; }
  get socket() { return gameStore.socket; }

  create() {
    this.isTouchDevice = this.sys.game.device.input.touch;

    this.cameras.main.setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);
    this.physics.world.setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);

    this.drawGrid();

    // World border
    const border = this.add.graphics();
    border.lineStyle(4, 0x00ffff, 0.8);
    border.strokeRect(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);

    // Orb graphics layer (redrawn only when orbs change)
    this.orbGraphics = this.add.graphics().setDepth(2);

    // Explosion particles
    this.explosionEmitter = this.add.particles(0, 0, 'glow_particle', {
      speed: { min: 80, max: 320 },
      scale: { start: 1.0, end: 0 },
      lifespan: 700,
      blendMode: 'ADD',
      emitting: false,
    });

    // Controls
    this.setupKeyboard();
    this.setupJoystick();
    this.setupFireButton();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Unlock Web Audio on first gesture
    this.input.once('pointerdown', unlockAudio);

    // Socket listener — assigned fresh here so it always points to latest handler
    if (this.socket) {
      this.socket.onmessage = (ev: MessageEvent) =>
        this.handleServerMessage(JSON.parse(ev.data as string) as ServerMessage);
    }
  }

  update(_time: number, delta: number) {
    // Resolve desired heading (keyboard beats joystick beats mouse-hold)
    const dir = this.resolveDirection();

    // Send heading to server at SEND_RATE_MS intervals (not every frame)
    this.sendTimer += delta;
    if (this.sendTimer >= SEND_RATE_MS) {
      this.sendTimer = 0;
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'move', direction: dir }));
      }
    }

    // Space breathes fire
    if (this.keys.space.isDown) this.tryFire();

    const me = this.players[this.myId];
    if (me?.alive) {
      this.cameras.main.centerOn(me.head.x, me.head.y);
    }

    if (this.orbsDirty) {
      this.drawOrbs();
      this.orbsDirty = false;
    }

    this.syncSprites();
    this.syncFireballs();
  }

  private tryFire() {
    const me = this.players[this.myId];
    if (!me?.alive) return;
    const now = Date.now();
    if (now - this.lastFireSent < GAME_CONFIG.fireCooldownMs) return;
    this.lastFireSent = now;
    this.socket?.send(JSON.stringify({ type: 'fire' }));
  }

  private drawOrbs() {
    this.orbGraphics.clear();
    for (const orb of Object.values(this.orbs)) {
      const radius = orb.value === 1 ? 6 : orb.value === 2 ? 9 : 13;
      const color = orb.value === 1 ? 0x44ffaa : orb.value === 2 ? 0xffdd44 : 0xff6622;
      const alpha = orb.value === 1 ? 0.75 : orb.value === 2 ? 0.85 : 1;

      // Glow halo
      this.orbGraphics.fillStyle(color, alpha * 0.25);
      this.orbGraphics.fillCircle(orb.x, orb.y, radius * 2.2);

      // Core
      this.orbGraphics.fillStyle(color, alpha);
      this.orbGraphics.fillCircle(orb.x, orb.y, radius);

      // Shine dot
      this.orbGraphics.fillStyle(0xffffff, 0.6);
      this.orbGraphics.fillCircle(orb.x - radius * 0.28, orb.y - radius * 0.28, radius * 0.28);
    }
  }

  // ── Direction resolution ──────────────────────────────────────────────────

  private resolveDirection(): { x: number; y: number } {
    const kx = (this.keys.d.isDown || this.keys.right.isDown ? 1 : 0)
             - (this.keys.a.isDown || this.keys.left.isDown ? 1 : 0);
    const ky = (this.keys.s.isDown || this.keys.down.isDown ? 1 : 0)
             - (this.keys.w.isDown || this.keys.up.isDown ? 1 : 0);

    if (kx !== 0 || ky !== 0) {
      const len = Math.sqrt(kx * kx + ky * ky);
      return { x: kx / len, y: ky / len };
    }

    // Joystick (touch) or mouse aim
    if (this.joystickDir.x !== 0 || this.joystickDir.y !== 0) return this.joystickDir;

    // Mouse aim: move toward cursor when left-button held
    if (this.input.activePointer.isDown && this.joystickPointerId === null) {
      const me = this.players[this.myId];
      if (me?.alive) {
        const worldPt = this.cameras.main.getWorldPoint(
          this.input.activePointer.x,
          this.input.activePointer.y,
        );
        const dx = worldPt.x - me.head.x;
        const dy = worldPt.y - me.head.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 20) return { x: dx / len, y: dy / len };
      }
    }

    return { x: 0, y: 0 };
  }

  // ── Server message handler ────────────────────────────────────────────────

  private handleServerMessage(msg: ServerMessage) {
    if (msg.type === 'welcome') {
      gameStore.myId = msg.id;
      this.players = msg.players;
      this.orbs = msg.orbs;
      this.orbsDirty = true;
    }
    if (msg.type === 'state') {
      this.players = msg.players;
      this.fireballs = msg.fireballs;
    }
    if (msg.type === 'orb_eaten') {
      delete this.orbs[msg.orbId];
      this.orbs[msg.newOrb.id] = msg.newOrb;
      this.orbsDirty = true;
      if (msg.eaterId === this.myId) playEatOrb(msg.newOrb.value);
    }
    if (msg.type === 'orbs_added') {
      for (const orb of msg.orbs) this.orbs[orb.id] = orb;
      this.orbsDirty = true;
    }
    if (msg.type === 'fireball') {
      playFireball(msg.fireball.ownerId === this.myId ? 1 : 0.5);
    }
    if (msg.type === 'cut') {
      this.playCutEffect(msg.at.x, msg.at.y, this.players[msg.victim]?.color ?? 0xff8800);
      if (msg.victim === this.myId || msg.attacker === this.myId) playCut();
      this.showCutFeed(msg.attacker, msg.victim, msg.segmentsLost);
    }
    if (msg.type === 'explode') {
      this.playExplosion(msg.at.x, msg.at.y, this.players[msg.victim]?.color ?? 0xff4400);
      this.destroySprite(msg.victim);
      if (msg.victim === this.myId) playDeath();
      else playExplosion(0.6);
    }
    if (msg.type === 'killed') {
      gameStore.killedCallback?.(msg.killer, msg.victim);
      this.showKillFeed(msg.killer, msg.victim);
      if (msg.killer === this.myId) playKill();
      // Flash our own glow on a kill scored
      if (msg.killer === this.myId) {
        const sp = this.sprites[this.myId];
        if (sp) {
          this.tweens.add({
            targets: sp.glow,
            alpha: { from: 1, to: 0.35 },
            scaleX: { from: 2, to: 1 },
            scaleY: { from: 2, to: 1 },
            duration: 400,
            ease: 'Power3',
          });
        }
      }
    }
    if (msg.type === 'chat') {
      gameStore.chatCallback?.(msg.msg);
    }
  }

  // ── Sprite sync ──────────────────────────────────────────────────────────

  private syncSprites() {
    for (const [id, player] of Object.entries(this.players)) {
      if (!player.alive) { this.destroySprite(id); continue; }
      if (!this.sprites[id]) this.createSprite(id, player);
      this.updateSprite(id, player);
    }
    for (const id of Object.keys(this.sprites)) {
      if (!this.players[id]) this.destroySprite(id);
    }
  }

  private createSprite(id: string, player: PlayerState) {
    const tint = player.color;
    const isMe = id === this.myId;

    // Glow ring behind the head (visible for self, subtle for others)
    const glow = this.add.circle(player.head.x, player.head.y, player.size + 10, tint, isMe ? 0.35 : 0.15)
      .setDepth(8);

    const head = this.add.image(player.head.x, player.head.y, 'dragon_head')
      .setTint(tint).setDepth(10);

    const body = player.segments.map((seg) =>
      this.add.image(seg.x, seg.y, 'dragon_body').setTint(tint).setDepth(5)
    );

    const nameTag = this.add.text(player.head.x, player.head.y - player.size - 14, player.name, {
      fontSize: '13px',
      color: isMe ? '#00ffff' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    const killBadge = this.add.text(
      player.head.x + player.size, player.head.y - player.size,
      `×${player.kills}`,
      { fontSize: '11px', color: '#ffd700', stroke: '#000', strokeThickness: 2 }
    ).setDepth(20);

    // Pulse animation for own dragon
    if (isMe) {
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.35, to: 0.6 },
        scaleX: { from: 1, to: 1.15 },
        scaleY: { from: 1, to: 1.15 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.sprites[id] = { head, body, nameTag, killBadge, glow };
  }

  private updateSprite(id: string, player: PlayerState) {
    const sp = this.sprites[id];
    if (!sp) return;

    const scale = player.size / GAME_CONFIG.initialSize;
    const headAngle = Phaser.Math.RadToDeg(player.angle);

    sp.head.setPosition(player.head.x, player.head.y).setScale(scale).setAngle(headAngle);
    sp.glow.setPosition(player.head.x, player.head.y).setRadius(player.size * scale + 10);

    while (sp.body.length < player.segments.length) {
      sp.body.push(this.add.image(0, 0, 'dragon_body').setTint(player.color).setDepth(5));
    }
    while (sp.body.length > player.segments.length) {
      sp.body.pop()?.destroy();
    }

    player.segments.forEach((seg, i) => {
      sp.body[i]?.setPosition(seg.x, seg.y).setScale(Math.max(0.3, scale * (1 - i * 0.008)));
    });

    sp.nameTag.setPosition(player.head.x, player.head.y - player.size * scale - 14);
    sp.killBadge
      .setPosition(player.head.x + player.size * scale, player.head.y - player.size * scale)
      .setText(`×${player.kills}`);
  }

  // ── Fireball rendering ───────────────────────────────────────────────────

  private syncFireballs() {
    for (const [id, fb] of Object.entries(this.fireballs)) {
      let sprite = this.fireballSprites[id];
      if (!sprite) {
        sprite = this.add.image(fb.x, fb.y, 'glow_particle')
          .setTint(0xff6600)
          .setScale(1.6)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(15);
        this.fireballSprites[id] = sprite;
      }
      sprite.setPosition(fb.x, fb.y);
      sprite.setRotation(fb.angle);
      // Flicker for a fiery feel
      sprite.setScale(1.4 + Math.random() * 0.5);
    }
    for (const id of Object.keys(this.fireballSprites)) {
      if (!this.fireballs[id]) {
        this.fireballSprites[id].destroy();
        delete this.fireballSprites[id];
      }
    }
  }

  private playCutEffect(x: number, y: number, color: number) {
    if (this.explosionEmitter) {
      const emitter = this.explosionEmitter as Phaser.GameObjects.Particles.ParticleEmitter & {
        setParticleTint?: (t: number) => void;
      };
      emitter.setParticleTint?.(color);
      this.explosionEmitter.explode(15, x, y);
    }
    const ring = this.add.circle(x, y, 6, 0xffaa00, 0.9).setDepth(30);
    this.tweens.add({
      targets: ring,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 250,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  private showCutFeed(attackerId: string, victimId: string, segmentsLost: number) {
    const attackerName = this.players[attackerId]?.name ?? '?';
    const victimName = this.players[victimId]?.name ?? '?';
    const txt = this.add.text(
      this.cameras.main.width - 20,
      20 + this.killFeedTexts.length * 24,
      `🔥 ${attackerName} cut ${victimName} (-${segmentsLost})`,
      { fontSize: '13px', color: '#ffaa44', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.killFeedTexts.push(txt);
    this.time.delayedCall(3000, () => {
      txt.destroy();
      this.killFeedTexts = this.killFeedTexts.filter((t) => t !== txt);
    });
  }

  private destroySprite(id: string) {
    const sp = this.sprites[id];
    if (!sp) return;
    sp.glow.destroy();
    sp.head.destroy();
    sp.body.forEach((b) => b.destroy());
    sp.nameTag.destroy();
    sp.killBadge.destroy();
    delete this.sprites[id];
  }

  // ── Explosion ────────────────────────────────────────────────────────────

  private playExplosion(x: number, y: number, color: number) {
    if (!this.explosionEmitter) return;

    // Phaser 3.60+ ParticleEmitter — setParticleTint is available at runtime
    const emitter = this.explosionEmitter as Phaser.GameObjects.Particles.ParticleEmitter & {
      setParticleTint?: (t: number) => void;
    };
    emitter.setParticleTint?.(color);
    this.explosionEmitter.explode(40, x, y);

    const ring = this.add.circle(x, y, 10, color, 0.9).setDepth(30);
    this.tweens.add({
      targets: ring,
      scaleX: 8, scaleY: 8, alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    const me = this.players[this.myId];
    if (me?.head) {
      const dist = Phaser.Math.Distance.Between(x, y, me.head.x, me.head.y);
      if (dist < 400) this.cameras.main.shake(250, 0.012 * (1 - dist / 400));
    }
  }

  private showKillFeed(killerId: string, victimId: string) {
    const killerName = this.players[killerId]?.name ?? '?';
    const victimName = this.players[victimId]?.name ?? '?';
    const txt = this.add.text(
      this.cameras.main.width - 20,
      20 + this.killFeedTexts.length * 24,
      `💥 ${killerName} → ${victimName}`,
      { fontSize: '13px', color: '#ff6666', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.killFeedTexts.push(txt);
    this.time.delayedCall(3000, () => {
      txt.destroy();
      this.killFeedTexts = this.killFeedTexts.filter((t) => t !== txt);
    });
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────

  private setupKeyboard() {
    this.keys = {
      ...this.input.keyboard!.createCursorKeys(),
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    // Keep Space from scrolling the page
    this.input.keyboard!.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ── Joystick (touch) ─────────────────────────────────────────────────────

  private setupJoystick() {
    if (!this.isTouchDevice) return;
    const bx = this.scale.width / 2, by = this.scale.height - 100;
    const base = this.add.circle(bx, by, 50, 0x334466, 0.5).setScrollFactor(0).setDepth(50).setInteractive();
    const thumb = this.add.circle(bx, by, 22, 0x00ccff, 0.8).setScrollFactor(0).setDepth(51);
    this.joystick = { base, thumb };
  }

  private setupFireButton() {
    if (!this.isTouchDevice) return;
    const bx = this.scale.width - 80, by = this.scale.height - 100;
    const ring = this.add.circle(0, 0, 42, 0xff4400, 0.35).setStrokeStyle(3, 0xff6600, 0.9);
    const icon = this.add.text(0, 0, '🔥', { fontSize: '30px' }).setOrigin(0.5);
    this.fireButton = this.add.container(bx, by, [ring, icon])
      .setScrollFactor(0)
      .setDepth(50);
  }

  private isOnFireButton(x: number, y: number): boolean {
    if (!this.fireButton) return false;
    return Phaser.Math.Distance.Between(x, y, this.fireButton.x, this.fireButton.y) < 60;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    const jx = this.scale.width / 2, jy = this.scale.height - 100;
    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, jx, jy);

    if (this.isTouchDevice && dist < 80 && this.joystickPointerId === null) {
      this.joystickPointerId = pointer.id;
      return;
    }

    // Fire button (touch devices)
    if (this.isTouchDevice && this.isOnFireButton(pointer.x, pointer.y)) {
      this.tryFire();
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.joystickPointerId || !this.joystick) return;
    const jx = this.scale.width / 2, jy = this.scale.height - 100;
    const dx = pointer.x - jx;
    const dy = pointer.y - jy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const maxR = 44;
    const cx = len > maxR ? (dx / len) * maxR : dx;
    const cy = len > maxR ? (dy / len) * maxR : dy;
    this.joystick.thumb.setPosition(jx + cx, jy + cy);
    this.joystickDir = len > 6 ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.joystickDir = { x: 0, y: 0 };
      if (this.joystick) this.joystick.thumb.setPosition(this.scale.width / 2, this.scale.height - 100);
    }
  }

  // ── Background ────────────────────────────────────────────────────────────

  private drawGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a2a4a, 0.4);
    for (let x = 0; x <= GAME_CONFIG.worldWidth; x += 100) g.lineBetween(x, 0, x, GAME_CONFIG.worldHeight);
    for (let y = 0; y <= GAME_CONFIG.worldHeight; y += 100) g.lineBetween(0, y, GAME_CONFIG.worldWidth, y);
  }

  // ── Public API called from React ─────────────────────────────────────────

  sendChat(text: string) {
    this.socket?.send(JSON.stringify({ type: 'chat', text }));
  }

  respawn() {
    this.socket?.send(JSON.stringify({ type: 'respawn' }));
  }
}
