import Phaser from "phaser";
import { Base64Manager } from "../utils/Base64Manager.js";
import { LoadBase64Audio } from "../utils/LoadBase64Audio.js";
import { adReady } from "../networkPlugin";

// Audio
import { BGM1MP3 } from '../../media/Audio_BGM1.mp3.js';
import { CorrectAnWerMP3 } from '../../media/Audio_Correct Answer.mp3.js';
import { WrongAnWerMP3 } from '../../media/Audio_Wrong Answer.mp3.js';
import { FiniHedMP3 } from '../../media/Audio_Finished.mp3.js';
import { BGMMP3 } from '../../media/Audio_BGM.mp3.js';
import { carWAV } from '../../media/Audio_car.wav.js';
import { bloodMP3 } from '../../media/Audio_blood.mp3.js';

// Environment
import { bgWEBP } from '../../media/Sprites_Environment_bg.webp.js';
import { carPNG } from '../../media/Sprites_Environment_car.png.js';
import { floatingFloorPNG } from '../../media/Sprites_Environment_floating-floor.png.js';
import { floorPNG } from '../../media/Sprites_Environment_floor.png.js';

// Hero
import { heroPNG } from '../../media/Sprites_Hero_hero.png.js';
import { heroJSON } from '../../media/Sprites_Hero_hero.json.js';
import { heroPNG as heroStaticPNG } from '../../media/Sprites_hero-static_hero.png.js';
import { heroArmPNG } from '../../media/Sprites_hero-static_hero-arm.png.js';

// Villain
import { villainPNG } from '../../media/Sprites_Villain_villain.png.js';
import { bloodPopPNG } from '../../media/Sprites_blood-pop.png.js';
import { bodyVillainPNG } from '../../media/Sprites_Villain_body-villain.png.js';
import { headVillainPNG } from '../../media/Sprites_Villain_head-villain.png.js';
import { LArmVillainPNG } from '../../media/Sprites_Villain_L-arm-villain.png.js';
import { LBottomLegVillainPNG } from '../../media/Sprites_Villain_L-bottom_leg-villain.png.js';
import { LForeArmVillainPNG } from '../../media/Sprites_Villain_L-fore_arm-villain.png.js';
import { LLegVillainPNG } from '../../media/Sprites_Villain_L-leg-villain.png.js';
import { RArmVillainPNG } from '../../media/Sprites_Villain_R-arm-villain.png.js';
import { RBottomLegVillainPNG } from '../../media/Sprites_Villain_R-bottom_leg-villain.png.js';
import { RForeArmVillainPNG } from '../../media/Sprites_Villain_R-fore_arm-villain.png.js';
import { RLegVillainPNG } from '../../media/Sprites_Villain_R-leg-villain.png.js';

// Tutorial & UI
import { dragPointerPNG } from '../../media/Sprites_Tutorial_drag-pointer.png.js';
import { fingerPointerPNG } from '../../media/Sprites_Tutorial_finger-pointer.png.js';
import { tapToMovePNG } from '../../media/Sprites_Tutorial_tap-to-move.png.js';
import { ingameLogoPNG } from '../../media/Sprites_Endcard_ingame-logo.png.js';
import { playnowPNG } from '../../media/Sprites_Endcard_playnow.png.js';
import { handPNG } from '../../media/Sprites_Tutorial_hand.png.js';

export class Preloader extends Phaser.Scene {
  constructor() {
    super("Preload");
    window.html5AudioUnlocked = false;
  }

  preload() {
    Base64Manager(this, () => this.base64LoaderComplete());

    // Load Environment
    this.load.image("bg", bgWEBP);
    this.load.image("car", carPNG);
    this.load.image("floating_floor", floatingFloorPNG);
    this.load.image("floor", floorPNG);

    // Load Characters
    this.load.atlas("hero", heroPNG, heroJSON);
    this.load.image("hero_static", heroStaticPNG);
    this.load.image("hero_arm", heroArmPNG);
    this.load.image("villain", villainPNG);
    this.load.image("blood_pop", bloodPopPNG);
    
    // Load Villain Ragdoll Parts
    this.load.image("villain_body", bodyVillainPNG);
    this.load.image("villain_head", headVillainPNG);
    this.load.image("villain_l_arm", LArmVillainPNG);
    this.load.image("villain_l_fore_arm", LForeArmVillainPNG);
    this.load.image("villain_l_leg", LLegVillainPNG);
    this.load.image("villain_l_bottom_leg", LBottomLegVillainPNG);
    this.load.image("villain_r_arm", RArmVillainPNG);
    this.load.image("villain_r_fore_arm", RForeArmVillainPNG);
    this.load.image("villain_r_leg", RLegVillainPNG);
    this.load.image("villain_r_bottom_leg", RBottomLegVillainPNG);

    // Load Tutorial & UI
    this.load.image("drag_pointer", dragPointerPNG);
    this.load.image("finger_pointer", fingerPointerPNG);
    this.load.image("tap_to_move", tapToMovePNG);
    this.load.image("ingame_logo", ingameLogoPNG);
    this.load.image("playnow", playnowPNG);
    this.load.image("hand", handPNG);

    // Audio loading helper
    LoadBase64Audio(this, [
      { key: "audio_correct", data: CorrectAnWerMP3, instances: 4 },
      { key: "audio_wrong", data: WrongAnWerMP3, instances: 4 },
      { key: "audio_finished", data: FiniHedMP3, instances: 2 },
      { key: "bgm", data: BGMMP3, instances: 1 },
      { key: "sfx_car", data: carWAV, instances: 4 },
      { key: "sfx_blood", data: bloodMP3, instances: 4 },
    ]);
  }

  base64LoaderComplete() {
    adReady();
    this.scene.start("Game");
  }
}

