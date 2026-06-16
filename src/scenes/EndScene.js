import Phaser from "phaser";
import { adStart, onCtaPressed, onAudioVolumeChange } from "../networkPlugin";

export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  adNetworkSetup() {
    adStart();
    onAudioVolumeChange(this.scene);
  }

  create() {
    this.adNetworkSetup();

    // Play finished sound
    try { this.sound.play("audio_finished"); } catch (e) { /* audio not ready */ }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const scale = Math.min(width / 1080, height / 1920);

    // ── Dark overlay — sits on top of the still-visible Game scene ──
    // Starts fully transparent and fades in, giving the "game blurs into background" feel.
    this.filter = this.add.graphics().setDepth(1);
    this.filter.fillStyle(0x000000, 0.65);
    this.filter.fillRect(0, 0, width, height);
    this.filter.setAlpha(0);

    // ── Logo (hidden until animated in) ──
    this.logo = this.add.image(width / 2, height * 0.42, "ingame_logo")
      .setOrigin(0.5)
      .setDepth(2)
      .setScale(0)
      .setAlpha(0);

    // ── CTA button (hidden until animated in) ──
    this.cta = this.add.image(width / 2, height * 0.70, "playnow")
      .setOrigin(0.5)
      .setDepth(3)
      .setScale(0)
      .setAlpha(0)
      .setInteractive();

    // ── Sequence: overlay fades in → logo bounces in → CTA bounces in → CTA pulses ──
    this.tweens.add({
      targets: this.filter,
      alpha: 1,
      duration: 500,
      ease: "Quad.easeIn",
      onComplete: () => {
        // Logo bounce-in
        this.tweens.add({
          targets: this.logo,
          scale: 2.2 * scale,
          alpha: 1,
          duration: 650,
          ease: "Back.easeOut",
          easeParams: [1.4],
          onComplete: () => {
            // CTA bounce-in after logo settles
            this.tweens.add({
              targets: this.cta,
              scale: 0.50 * scale,
              alpha: 1,
              duration: 500,
              ease: "Back.easeOut",
              easeParams: [1.2],
              onComplete: () => this._startCtaPulse(scale)
            });
          }
        });
      }
    });

    // ── CTA click handling ──
    let debouncing = false;
    const handleClickAction = () => {
      if (debouncing) return;
      debouncing = true;
      setTimeout(() => { debouncing = false; }, 50);
      onCtaPressed();
    };

    this.cta.on("pointerdown", handleClickAction);
    this.input.on("pointerdown", handleClickAction);
    window.addEventListener("click", handleClickAction);

    this.events.once("shutdown", () => {
      window.removeEventListener("click", handleClickAction);
    });
  }

  _startCtaPulse(scale) {
    if (this.ctaTween) this.ctaTween.stop();
    this.ctaTween = this.tweens.add({
      targets: this.cta,
      scale: 0.55 * scale,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  relayout() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const scale = Math.min(width / 1080, height / 1920);

    if (this.filter) {
      this.filter.clear();
      this.filter.fillStyle(0x000000, 0.65);
      this.filter.fillRect(0, 0, width, height);
    }
    if (this.logo) {
      this.logo.setPosition(width / 2, height * 0.42).setScale(2.2 * scale);
    }
    if (this.cta) {
      if (this.ctaTween) this.ctaTween.stop();
      this.cta.setPosition(width / 2, height * 0.70).setScale(0.50 * scale);
      if (this.cta.alpha > 0) this._startCtaPulse(scale);
    }
  }
}
