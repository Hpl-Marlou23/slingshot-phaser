import Phaser from "phaser";
import { onCtaPressed } from "../networkPlugin";
import { config } from "../config";

export class Game extends Phaser.Scene {
  constructor() {
    super({
      key: "Game",
      physics: {
        matter: {
          gravity: { y: 3 },
          debug: false
        }
      }
    });
    this.villains = [];
    this.draggedObject = null;
    this.isGameOver = false;
    this.timerEvent = null;
    this.tutorialDismissed = false;
    this.carHighlightGraphics = null;
    this.carGlowTween = null;
    this.carDragBody = null;       // Kinematic anchor body for spring-drag
    this.carDragConstraint = null; // Spring constraint car ↔ anchor
  }

  create() {
    this.isGameOver = false;

    // Setup Background Music (will play on first interaction)
    if (!this.bgm) {
      this.bgm = this.sound.add("bgm", { loop: true, volume: 0.3 });
    }

    // Use fixed 1080x1920 coordinates for placement
    const cx = 540;
    const cy = 960;

    // Background
    this.bg = this.add.image(cx, cy, "bg").setOrigin(0.5);
    // Force scale if needed to cover 1080x1920
    const scaleX = 1080 / this.bg.width;
    const scaleY = 1920 / this.bg.height;
    this.bg.setScale(Math.max(scaleX, scaleY));

    // Logo
    this.logo = this.add.image(cx, 120, "ingame_logo").setDepth(17);
    this.logo.setScale(1);

    // Matter Category for Villains to allow targeted mouse spring dragging
    this.villainCategory = this.matter.world.nextCategory();

    // Mouse spring for dragging villain ragdoll parts
    this.mouseSpring = this.matter.add.mouseSpring({
      stiffness: 0.2,
      damping: 0.1
    });

    // Floor
    this.ground = this.add.image(cx, 1890, "floor");
    this.ground.setScale(1080 / this.ground.width, 0.25);

    // Platforms (3 on left, 3 on right)
    // Left side platforms (scaled down in width to not connect in the middle)
    const platScaleX = 0.25;
    const platScaleY = 0.3;

    const p1 = this.add.image(150, 550, "floating_floor").setScale(0.2, platScaleY); // Top Left
    const p3 = this.add.image(180, 950, "floating_floor").setScale(platScaleX, platScaleY); // Middle Left
    const p5 = this.add.image(180, 1350, "floating_floor").setScale(platScaleX, platScaleY); // Bottom Left

    // Right side platforms
    const p2 = this.add.image(930, 550, "floating_floor").setScale(0.2, platScaleY); // Top Right
    const p4 = this.add.image(900, 950, "floating_floor").setScale(platScaleX, platScaleY); // Middle Right
    const p6 = this.add.image(900, 1350, "floating_floor").setScale(platScaleX, platScaleY); // Bottom Right

    // Hero (animated idle)
    this.hero = this.add.sprite(800, 1600, "hero", "Hero-idle_01").setDepth(100);
    this.hero.setScale(0.5);

    this.anims.create({
      key: 'hero_idle',
      frames: this.anims.generateFrameNames('hero', { prefix: 'Hero-idle_', start: 1, end: 29, zeroPad: 2 }),
      frameRate: 15,
      repeat: -1
    });
    this.hero.play('hero_idle');

    // Hero sling pose — shown while the player is dragging something
    this.heroStatic = this.add.image(800, 1600, "hero_static").setDepth(101).setScale(0.5).setVisible(false);

    // Arm shown on the side of the hero while slinging
    // Origin is at the TOP (0.5, 0) so the arm pivots from the shoulder joint.
    this.heroArm = this.add.image(800, 800, "hero_arm").setOrigin(0.5, 0).setDepth(102).setScale(0.5).setVisible(false);

    // Car using Matter.js for realistic real-world physics
    this.car = this.matter.add.image(450, 1600, "car").setDepth(100);
    this.car.setScale(0.35);
    // Explicitly size the rigid body to match the actual image
    this.car.setBody({
      type: 'rectangle',
      width: this.car.width * 0.35,
      height: this.car.height * 0.35
    });
    this.car.setFrictionAir(0.005);
    this.car.setFriction(0.1);
    this.car.setBounce(0.5);
    this.car.setMass(10);
    this.car.setInteractive({ draggable: true });

    // Car glow highlight — drawn in update() so it tracks the car position
    this.carHighlightGraphics = this.add.graphics().setDepth(99);

    // Pulse scale on car for tutorial
    this.carGlowTween = this.tweens.add({
      targets: this.car,
      scaleX: 0.38,
      scaleY: 0.38,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut'
    });
    // Track glow alpha separately for the outline
    this._carGlowAlpha = 0;
    this.tweens.add({
      targets: this,
      _carGlowAlpha: 1,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut'
    });

    // Villains
    const spawnVillain = (x, y, flipX = false) => {
      const group = this.matter.world.nextGroup(true);
      const stiffness = 0.7;

      const joints = {};
      const constraints = [];

      // Spawn joints (Matter bodies) - set larger click areas so they can be easily grabbed on mobile/desktop
      // HEAD
      joints.head = this.matter.add.circle(x, y, 25);
      // BODY
      joints.hip = this.matter.add.circle(x, y + 90, 15);
      joints.leftPelvis = this.matter.add.circle(x - 12, y + 80, 15);
      joints.rightPelvis = this.matter.add.circle(x + 12, y + 80, 15);

      joints.leftShoulder = this.matter.add.circle(x - 20, y + 25, 15);
      joints.rightShoulder = this.matter.add.circle(x + 20, y + 25, 15);

      joints.leftElbow = this.matter.add.circle(x - 20, y + 55, 15);
      joints.rightElbow = this.matter.add.circle(x + 20, y + 55, 15);

      joints.leftHand = this.matter.add.circle(x - 20, y + 80, 20);
      joints.rightHand = this.matter.add.circle(x + 20, y + 80, 20);

      // LEGS
      joints.leftKnee = this.matter.add.circle(x - 12, y + 100, 15);
      joints.rightKnee = this.matter.add.circle(x + 12, y + 100, 15);

      joints.leftFoot = this.matter.add.circle(x - 12, y + 140, 20);
      joints.rightFoot = this.matter.add.circle(x + 12, y + 140, 20);

      // Create Villain Object
      const villainObj = {
        joints,
        constraints,
        images: {},
        isDead: false,
        flipX,
        wasDragged: false
      };

      // Set physics properties for all joints
      Object.values(joints).forEach(j => {
        j.collisionFilter.group = group;
        j.collisionFilter.category = this.villainCategory;
        j.frictionAir = 0.02;
        Phaser.Physics.Matter.Matter.Body.setStatic(j, true);
        j.label = 'villainPart';
        j.parentVillain = villainObj;
      });

      // Constraints
      const link = (a, b) => {
        const dist = Phaser.Math.Distance.Between(a.position.x, a.position.y, b.position.x, b.position.y);
        const c = this.matter.add.constraint(a, b, dist, stiffness);
        constraints.push(c);
      };

      // BONES
      link(joints.head, joints.leftShoulder);
      link(joints.leftShoulder, joints.leftElbow);
      link(joints.leftElbow, joints.leftHand);

      link(joints.head, joints.rightShoulder);
      link(joints.rightShoulder, joints.rightElbow);
      link(joints.rightElbow, joints.rightHand);

      link(joints.head, joints.hip);

      // Torso bracing
      link(joints.leftShoulder, joints.rightShoulder);
      link(joints.leftShoulder, joints.hip);
      link(joints.rightShoulder, joints.hip);

      // Pelvis bar
      link(joints.hip, joints.leftPelvis);
      link(joints.hip, joints.rightPelvis);
      link(joints.leftPelvis, joints.rightPelvis);
      link(joints.leftShoulder, joints.leftPelvis);
      link(joints.rightShoulder, joints.rightPelvis);
      link(joints.leftShoulder, joints.rightPelvis);
      link(joints.rightShoulder, joints.leftPelvis);

      link(joints.leftPelvis, joints.leftKnee);
      link(joints.leftKnee, joints.leftFoot);

      link(joints.rightPelvis, joints.rightKnee);
      link(joints.rightKnee, joints.rightFoot);

      // Create visual sprites
      const scaleSign = flipX ? -1 : 1;
      const armScale = 0.12;
      const bodyScale = 0.1;

      // Determine textures and depths based on flipX to keep depth layering correct when mirrored
      const lArmKey = flipX ? 'villain_r_arm' : 'villain_l_arm';
      const lArmDepth = flipX ? 11 : 5;
      const lForeArmKey = flipX ? 'villain_r_fore_arm' : 'villain_l_fore_arm';
      const lForeArmDepth = flipX ? 11 : 5;

      const rArmKey = flipX ? 'villain_l_arm' : 'villain_r_arm';
      const rArmDepth = flipX ? 5 : 11;
      const rForeArmKey = flipX ? 'villain_l_fore_arm' : 'villain_r_fore_arm';
      const rForeArmDepth = flipX ? 5 : 11;

      const lLegKey = flipX ? 'villain_r_leg' : 'villain_l_leg';
      const lLegDepth = flipX ? 8 : 8;
      const lBottomLegKey = flipX ? 'villain_r_bottom_leg' : 'villain_l_bottom_leg';
      const lBottomLegDepth = flipX ? 10 : 4;

      const rLegKey = flipX ? 'villain_l_leg' : 'villain_r_leg';
      const rLegDepth = flipX ? 8 : 8;
      const rBottomLegKey = flipX ? 'villain_l_bottom_leg' : 'villain_r_bottom_leg';
      const rBottomLegDepth = flipX ? 4 : 10;

      villainObj.images.head = this.add.image(x, y, 'villain_head').setDepth(12);
      const headScale = 40 / villainObj.images.head.width;
      villainObj.images.head.setScale(scaleSign * headScale, headScale);

      villainObj.images.body = this.add.image(x, y + 60, 'villain_body').setScale(scaleSign * bodyScale, bodyScale).setDepth(11);

      villainObj.images.lArm = this.add.image(x, y, lArmKey).setScale(scaleSign * armScale, armScale).setDepth(lArmDepth);
      villainObj.images.lForeArm = this.add.image(x, y, lForeArmKey).setScale(scaleSign * armScale, armScale).setDepth(lForeArmDepth);
      villainObj.images.rArm = this.add.image(x, y, rArmKey).setScale(scaleSign * armScale, armScale).setDepth(rArmDepth);
      villainObj.images.rForeArm = this.add.image(x, y, rForeArmKey).setScale(scaleSign * armScale, armScale).setDepth(rForeArmDepth);

      villainObj.images.lLeg = this.add.image(x, y, lLegKey).setScale(scaleSign * armScale, armScale).setDepth(lLegDepth);
      villainObj.images.lBottomLeg = this.add.image(x, y, lBottomLegKey).setScale(scaleSign * armScale, armScale).setDepth(lBottomLegDepth);
      villainObj.images.rLeg = this.add.image(x, y, rLegKey).setScale(scaleSign * armScale, armScale).setDepth(rLegDepth);
      villainObj.images.rBottomLeg = this.add.image(x, y, rBottomLegKey).setScale(scaleSign * armScale, armScale).setDepth(rBottomLegDepth);

      this.villains.push(villainObj);
    };

    // Spawn villains on Top Left platform (3 villains)
    spawnVillain(p1.x - 90, p1.y - 150, true);
    spawnVillain(p1.x, p1.y - 150, true);
    spawnVillain(p1.x + 90, p1.y - 150, true);

    // Spawn villains on Top Right platform (3 villains)
    spawnVillain(p2.x - 90, p2.y - 150);
    spawnVillain(p2.x, p2.y - 150);
    spawnVillain(p2.x + 90, p2.y - 150);

    // Spawn villains on Middle Left platform (4 villains)
    spawnVillain(p3.x - 135, p3.y - 150, true);
    spawnVillain(p3.x - 45, p3.y - 150, true);
    spawnVillain(p3.x + 45, p3.y - 150, true);
    spawnVillain(p3.x + 135, p3.y - 150, true);

    // Spawn villains on Middle Right platform (4 villains)
    spawnVillain(p4.x - 135, p4.y - 150);
    spawnVillain(p4.x - 45, p4.y - 150);
    spawnVillain(p4.x + 45, p4.y - 150);
    spawnVillain(p4.x + 135, p4.y - 150);

    // Spawn villains on Bottom Left platform (4 villains)
    spawnVillain(p5.x - 135, p5.y - 150, true);
    spawnVillain(p5.x - 45, p5.y - 150, true);
    spawnVillain(p5.x + 45, p5.y - 150, true);
    spawnVillain(p5.x + 135, p5.y - 150, true);

    // Spawn villains on Bottom Right platform (4 villains)
    spawnVillain(p6.x - 135, p6.y - 150);
    spawnVillain(p6.x - 45, p6.y - 150);
    spawnVillain(p6.x + 45, p6.y - 150);
    spawnVillain(p6.x + 135, p6.y - 150);

    // Setup Physics Collisions for Matter (Car/Limbs vs Floors & Villains)
    // Use displayWidth/displayHeight so the Matter rectangle exactly matches the
    // visible sprite regardless of how the Arcade body was sized.
    const addMatterFloor = (arcadeFloor) => {
      const w = arcadeFloor.displayWidth;
      const h = arcadeFloor.displayHeight;
      const body = this.matter.add.rectangle(
        arcadeFloor.x, arcadeFloor.y, w, h,
        { isStatic: true, label: 'floor', friction: 0.9, restitution: 0 }
      );
      return body;
    };

    this.matterGround = addMatterFloor(this.ground);
    this.matterPlatforms = [p1, p2, p3, p4, p5, p6].map(addMatterFloor);

    // Matter collision listener for the car, dead limbs, or floors hitting villains
    const handleVillainCollision = (event) => {
      event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Car hitting a villain part
        if (bodyA === this.car.body || bodyB === this.car.body) {
          const other = bodyA === this.car.body ? bodyB : bodyA;
          const carBody = bodyA === this.car.body ? bodyA : bodyB;

          if (other.label === 'villainPart' && other.parentVillain && !other.parentVillain.isDead) {
            this.killVillain(other.parentVillain, carBody.velocity.x, carBody.velocity.y);
          }
        }

        // Dead flying limb hitting an alive villain part (Domino Effect!)
        if (bodyA.label === 'ragdollLimb' || bodyB.label === 'ragdollLimb') {
          const other = bodyA.label === 'ragdollLimb' ? bodyB : bodyA;
          const limbBody = bodyA.label === 'ragdollLimb' ? bodyA : bodyB;

          if (other.label === 'villainPart' && other.parentVillain && !other.parentVillain.isDead) {
            if (Math.abs(limbBody.velocity.x) > 5 || Math.abs(limbBody.velocity.y) > 5) {
              this.killVillain(other.parentVillain, limbBody.velocity.x, limbBody.velocity.y);
            }
          }
        }

        // Villain part hitting floors or the ground
        if (bodyA.label === 'floor' || bodyB.label === 'floor') {
          const other = bodyA.label === 'floor' ? bodyB : bodyA;
          if (other.label === 'villainPart' && other.parentVillain && !other.parentVillain.isDead) {
            const speed = Math.sqrt(other.velocity.x * other.velocity.x + other.velocity.y * other.velocity.y);
            const isGround = (bodyA === this.matterGround || bodyB === this.matterGround);

            // Kill if falling, released, or hitting the main ground
            if (speed > 5 || other.parentVillain.wasDragged || isGround) {
              this.killVillain(other.parentVillain, other.velocity.x, other.velocity.y);
            }
          }
        }
      });
    };

    this.matter.world.on('collisionstart', handleVillainCollision);
    this.matter.world.on('collisionactive', handleVillainCollision);

    // Draw line from hero
    this.graphics = this.add.graphics();
    this.graphics.setDepth(10);

    // Input events

    // Play BGM and dismiss tutorial on first interaction
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (this.bgm && !this.bgm.isPlaying) {
        this.bgm.play();
      }
      this._dismissTutorial();

      // Start 30s timer on first interaction if configured
      if (config.version === '30s' && !this._timerStarted) {
        this._timerStarted = true;
        this.time.delayedCall(30000, () => {
          if (!this.isGameOver) {
            this.endGame();
          }
        });
      }
    });

    this.input.on('dragstart', (pointer, gameObject) => {
      if (gameObject !== this.car) return;

      this.draggedObject = gameObject;
      this.dragPointer = pointer;

      this.sound.play("sfx_car", { volume: 0.7 });
      gameObject.setVelocity(0, 0);
      gameObject.setAngularVelocity(0);
      this.tweens.killTweensOf(gameObject); // Stop pulsing if it's the car

      // ── Spring-constraint drag: create a tiny static sensor at the pointer
      //    and attach the car to it. Matter's solver resolves collisions first,
      //    so the car can no longer tunnel through platforms.
      if (this.carDragBody) {
        this.matter.world.remove(this.carDragBody);
        this.carDragBody = null;
      }
      if (this.carDragConstraint) {
        this.matter.world.removeConstraint(this.carDragConstraint);
        this.carDragConstraint = null;
      }
      this.carDragBody = this.matter.add.circle(
        pointer.worldX, pointer.worldY, 2,
        { isStatic: true, isSensor: true, label: 'carDragAnchor' }
      );

      // Always attach the spring to the car's center of mass {x: 0, y: 0}
      // instead of the clicked offset. This completely prevents the spring 
      // from applying massive rotational torque and spinning the car wildly.
      this.carDragConstraint = this.matter.add.constraint(
        gameObject.body, this.carDragBody, 0, 0.2, {
        pointA: { x: 0, y: 0 },
        damping: 0.1
      });

      // Remove car glow & pulse
      this._dismissCarHighlight();

      gameObject.setScale(0.35);

      // Switch hero to sling pose
      this.hero.setVisible(false);
      if (this.heroStatic) this.heroStatic.setVisible(true);
      if (this.heroArm) this.heroArm.setVisible(true);

      // Dismiss tutorial
      this._dismissTutorial();
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      // Anchor is moved in update() each frame — nothing needed here.
    });

    this.input.on('dragend', (pointer, gameObject) => {
      if (gameObject !== this.car) return;

      // Tear down the spring constraint
      if (this.carDragConstraint) {
        this.matter.world.removeConstraint(this.carDragConstraint);
        this.carDragConstraint = null;
      }
      if (this.carDragBody) {
        this.matter.world.remove(this.carDragBody);
        this.carDragBody = null;
      }

      this.draggedObject = null;
      this.dragPointer = null;

      // Apply throw impulse based on flick speed
      let vx = pointer.velocity.x * 0.15;
      let vy = pointer.velocity.y * 0.15;

      // Fallback in case of NaN/Infinity on quick taps (especially on iOS)
      if (!isFinite(vx)) vx = 0;
      if (!isFinite(vy)) vy = 0;
      
      // If the user just tapped without dragging, don't throw it at all.
      // The pointer.velocity can sometimes spike on the very first touch due to spawning from (0,0).
      const dragDistance = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY);
      if (dragDistance < 15) {
        vx = 0;
        vy = 0;
      }

      // Clamp to prevent physics explosions from insanely fast flicks
      vx = Phaser.Math.Clamp(vx, -60, 60);
      vy = Phaser.Math.Clamp(vy, -60, 60);

      gameObject.setVelocity(vx, vy);

      // Return hero to idle animation
      this.hero.setVisible(true);
      if (this.heroStatic) this.heroStatic.setVisible(false);
      if (this.heroArm) this.heroArm.setVisible(false);
    });

    // ── Tutorial UI ──
    this.tutorialGroup = this.add.group();

    // Dark semi-transparent overlay
    const overlay = this.add.rectangle(cx, cy, 4000, 4000, 0x000000, 0.6).setDepth(98);

    // "Tap to Move" prompt image instead of text
    const tapToMovePrompt = this.add.image(cx, cy - 300, "tap_to_move").setDepth(104).setScale(0.4);
    // Pulsing animation
    this.tweens.add({
      targets: tapToMovePrompt,
      scale: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut'
    });

    // Drag pointer shown on sling line tip during dragging
    this.tutorialHand = this.add.image(this.car.x, this.car.y, "drag_pointer")
      .setDepth(101).setOrigin(0.5, 0.5).setScale(0.1).setVisible(false);

    // Hand dragging hint
    this.handHint = this.add.image(this.car.x, this.car.y, "hand")
      .setDepth(105).setOrigin(0.2, 0.1).setScale(0.3);

    this.handHintTween = this.tweens.add({
      targets: this.handHint,
      x: this.car.x + 1,
      y: this.car.y - 150,
      alpha: { start: 1, to: 0 },
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeOut',
      hold: 500,
      repeatDelay: 500
    });

    this.tutorialGroup.addMultiple([overlay, tapToMovePrompt, this.handHint]);

    // Scale the game properly
    this.scale.on('resize', this.relayout, this);
    this.relayout();
  } killVillain(villain, impactVx = null, impactVy = null) {
    if (villain.isDead) return;
    villain.isDead = true;

    this.sound.play("sfx_blood", { volume: 0.8 });

    // ── Balloon "poof" pop effect ──
    const hipPos = villain.joints.hip.position;

    // 1. Quick bright flash circle
    const flash = this.add.circle(hipPos.x, hipPos.y, 30, 0xffffff, 1).setDepth(20);
    this.tweens.add({
      targets: flash,
      scaleX: 3.5, scaleY: 3.5,
      alpha: 0,
      duration: 250,
      ease: 'Expo.easeOut',
      onComplete: () => flash.destroy()
    });

    // 2. Blood pop sprite scales up fast then fades
    const pop = this.add.image(hipPos.x, hipPos.y, "blood_pop").setDepth(21).setScale(0.05).setAlpha(1);
    this.tweens.add({
      targets: pop,
      scale: 0.45,
      alpha: 0,
      duration: 500,
      ease: 'Expo.easeOut',
      onComplete: () => pop.destroy()
    });

    // 3. Debris burst — tiny circles shooting outward
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = Phaser.Math.Between(60, 140);
      const debris = this.add.circle(hipPos.x, hipPos.y, Phaser.Math.Between(4, 9), 0xff3333, 1).setDepth(20);
      this.tweens.add({
        targets: debris,
        x: hipPos.x + Math.cos(angle) * dist,
        y: hipPos.y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0, scaleY: 0,
        duration: Phaser.Math.Between(350, 700),
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy()
      });
    }

    // Mark nearby alive villains for idle-jiggle due to chaos
    this.villains.forEach(v => {
      if (v.isDead || v === villain) return;
      const dx = v.joints.hip.position.x - hipPos.x;
      const dy = v.joints.hip.position.y - hipPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 350) {
        v._chaosTimer = (v._chaosTimer || 0) + 1800; // ms of jiggle
      }
    });

    // Make all joints non-static and change label to ragdollLimb
    Object.values(villain.joints).forEach(j => {
      Phaser.Physics.Matter.Matter.Body.setStatic(j, false);
      j.label = 'ragdollLimb';
    });

    // Apply knockback to head and hip
    let vx, vy;
    if (impactVx !== null && impactVy !== null) {
      vx = Phaser.Math.Clamp(impactVx * 1.5, -40, 40);
      vy = Phaser.Math.Clamp(impactVy * 1.5, -40, 40);
      if (Math.abs(vy) < 10) vy -= 15;
    } else {
      vx = Phaser.Math.Between(-15, 15);
      vy = Phaser.Math.Between(-25, -15);
    }

    if (villain.joints.head) {
      Phaser.Physics.Matter.Matter.Body.setVelocity(villain.joints.head, { x: vx, y: vy });
    }
    if (villain.joints.hip) {
      Phaser.Physics.Matter.Matter.Body.setVelocity(villain.joints.hip, { x: vx, y: vy });
    }

    // Fade out images and clean up after 3 seconds
    this.tweens.add({
      targets: Object.values(villain.images),
      alpha: 0,
      duration: 500,
      delay: 2500,
      onComplete: () => {
        // Destroy joints (Matter bodies)
        Object.values(villain.joints).forEach(j => {
          this.matter.world.remove(j);
        });
        // Destroy constraints
        villain.constraints.forEach(c => {
          this.matter.world.removeConstraint(c);
        });
        // Destroy images
        Object.values(villain.images).forEach(img => {
          img.destroy();
        });
        // Filter from array
        this.villains = this.villains.filter(item => item !== villain);
      }
    });

    this.checkWinCondition();
  }

  checkWinCondition() {
    const aliveCount = this.villains.filter(v => !v.isDead).length;
    if (aliveCount === 0 && !this.isGameOver) {
      this.endGame();
    }
  }

  // ── Helper: dismiss car glow/highlight ──
  _dismissCarHighlight() {
    if (this.carGlowTween) { this.carGlowTween.stop(); this.carGlowTween = null; }
    if (this.carHighlightGraphics) { this.carHighlightGraphics.clear(); }
    if (this._carPromptBg) { this._carPromptBg.setVisible(false); }
    if (this._carPromptText) { this._carPromptText.setVisible(false); }
    this._carGlowAlpha = 0;
  }

  // ── Helper: dismiss tutorial prompts ──
  _dismissTutorial() {
    if (this.tutorialDismissed) return;
    this.tutorialDismissed = true;
    if (this.tutorialGroup) {
      this.tweens.add({
        targets: this.tutorialGroup.getChildren(),
        alpha: 0,
        duration: 400,
        onComplete: () => { if (this.tutorialGroup) this.tutorialGroup.setVisible(false); }
      });
    }
  }

  update() {
    // Input-driven drag logic only runs while game is active
    if (!this.isGameOver) {
      if (this.draggedObject && this.dragPointer) {
        if (!this.draggedObject.active || !this.draggedObject.body) {
          // Stale drag — clean up constraint
          if (this.carDragConstraint) {
            this.matter.world.removeConstraint(this.carDragConstraint);
            this.carDragConstraint = null;
          }
          if (this.carDragBody) {
            this.matter.world.remove(this.carDragBody);
            this.carDragBody = null;
          }
          this.draggedObject = null;
          this.dragPointer = null;
        } else if (this.draggedObject === this.car && this.carDragBody) {
          // Move the anchor sensor to the pointer — constraint does the rest
          Phaser.Physics.Matter.Matter.Body.setPosition(this.carDragBody, {
            x: this.dragPointer.worldX,
            y: this.dragPointer.worldY
          });
        }
      }
    }

    // ── Enemy idle wobble when nearby chaos occurs ──
    const now = this.time.now;
    this.villains.forEach(v => {
      if (v.isDead || !v._chaosTimer) return;
      v._chaosTimer -= this.game.loop.delta;
      if (v._chaosTimer > 0) {
        // Nudge the head joint slightly to create a shiver
        const jiggle = 0.15 * Math.sin(now * 0.025);
        if (v.joints.head) {
          Phaser.Physics.Matter.Matter.Body.setPosition(v.joints.head, {
            x: v.joints.head.position.x + jiggle,
            y: v.joints.head.position.y
          });
        }
      } else {
        v._chaosTimer = 0;
      }
    });

    // Car glow outline removed as per user request

    // Track dragging states for hero pose & line drawing
    const isDraggingCar = !!this.draggedObject;
    const isDraggingVillain = !!(this.mouseSpring && this.mouseSpring.constraint.bodyB);
    const isDragging = isDraggingCar || isDraggingVillain;

    if (isDragging) {
      this.hero.setVisible(false);
      if (this.heroStatic) this.heroStatic.setVisible(true);
      if (this.heroArm) this.heroArm.setVisible(true);
      // Dismiss tutorial on first drag of any kind
      this._dismissTutorial();
      this._dismissCarHighlight();
      this.wasDragging = true;
    } else if (this.wasDragging) {
      this.hero.setVisible(true);
      if (this.heroStatic) this.heroStatic.setVisible(false);
      if (this.heroArm) this.heroArm.setVisible(false);
      this.wasDragging = false;
    }

    // Mark villain as dragged if grabbed by mouseSpring, and activate its physics
    if (isDraggingVillain) {
      const draggedBody = this.mouseSpring.constraint.bodyB;
      if (draggedBody.label === 'villainPart' && draggedBody.parentVillain) {
        const villainObj = draggedBody.parentVillain;
        villainObj.wasDragged = true;

        // Make all joints of this specific villain dynamic so it collapses and swings
        if (!villainObj.isDead) {
          Object.values(villainObj.joints).forEach(p => {
            Phaser.Physics.Matter.Matter.Body.setStatic(p, false);
          });
        }
      }
    }

    // Always keep running — sync ragdoll visual parts to physics bodies
    this.villains.forEach(v => {
      const joints = v.joints;
      const images = v.images;

      if (joints.head && joints.head.position) {
        const mx = (joints.head.position.x + joints.hip.position.x) / 2;
        const my = (joints.head.position.y + joints.hip.position.y) / 2;
        images.body.setPosition(mx, my);

        const dx = joints.hip.position.x - joints.head.position.x;
        const dy = joints.hip.position.y - joints.head.position.y;
        const bodyAngle = Math.atan2(dy, dx) - Math.PI / 2;

        const headOffsetX = v.flipX ? 3 : -3;
        const headOffsetY = -2;
        const cosAngle = Math.cos(bodyAngle);
        const sinAngle = Math.sin(bodyAngle);
        const finalHeadX = joints.head.position.x + headOffsetX * cosAngle - headOffsetY * sinAngle;
        const finalHeadY = joints.head.position.y + headOffsetX * sinAngle + headOffsetY * cosAngle;

        images.head.setPosition(finalHeadX, finalHeadY);
        images.head.setRotation(bodyAngle);
        images.body.setRotation(bodyAngle);

        const updateLimb = (img, jointA, jointB, offsetX = 0, offsetY = 0) => {
          const mx = (jointA.position.x + jointB.position.x) / 2;
          const my = (jointA.position.y + jointB.position.y) / 2;
          const dx2 = jointB.position.x - jointA.position.x;
          const dy2 = jointB.position.y - jointA.position.y;
          const angle = Math.atan2(dy2, dx2) - Math.PI / 2;

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const finalX = mx + offsetX * cos - offsetY * sin;
          const finalY = my + offsetX * sin + offsetY * cos;

          img.setPosition(finalX, finalY);
          img.setRotation(angle);
        };

        updateLimb(images.lArm, joints.leftShoulder, joints.leftElbow);
        updateLimb(images.lForeArm, joints.leftElbow, joints.leftHand);
        updateLimb(images.rArm, joints.rightShoulder, joints.rightElbow);
        updateLimb(images.rForeArm, joints.rightElbow, joints.rightHand);

        updateLimb(images.lLeg, joints.leftPelvis, joints.leftKnee);
        updateLimb(images.lBottomLeg, joints.leftKnee, joints.leftFoot, v.flipX ? 4 : -4, 0);
        updateLimb(images.rLeg, joints.rightPelvis, joints.rightKnee);
        updateLimb(images.rBottomLeg, joints.rightKnee, joints.rightFoot, v.flipX ? 4 : -4, 0);
      }
    });

    this.graphics.clear();

    if (!this.isGameOver && isDragging) {
      let endX, endY;
      if (isDraggingCar) {
        // Use the live pointer position so the line tip and circle sit exactly on the cursor
        endX = this.dragPointer.worldX;
        endY = this.dragPointer.worldY;
      } else {
        // For villain spring, grab the active pointer world coords
        const activePtr = this.input.activePointer;
        endX = activePtr.worldX;
        endY = activePtr.worldY;
      }

      // Rotate heroArm to point its top end toward the dragged object
      let startX = this.hero.x - 30;
      let startY = this.hero.y - 80;

      if (this.heroArm && this.heroArm.visible) {
        const dx = endX - this.heroArm.x;
        const dy = endY - this.heroArm.y;
        const armAngle = Math.atan2(dy, dx) - Math.PI / 2;
        this.heroArm.setRotation(armAngle);

        const fullH = this.heroArm.height * this.heroArm.scaleY;
        startX = this.heroArm.x - fullH * Math.sin(armAngle);
        startY = this.heroArm.y + fullH * Math.cos(armAngle);
      }

      // Draw sling line from lower tip of arm to dragged object
      this.graphics.lineStyle(6, 0xffffff, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(startX, startY);
      this.graphics.lineTo(endX, endY);
      this.graphics.strokePath();

      // Place the drag_pointer at the end of the line and point it
      if (this.tutorialHand) {
        this.tutorialHand.setVisible(true);
        this.tutorialHand.setPosition(endX, endY);
        this.tutorialHand.setRotation(Phaser.Math.Angle.Between(startX, startY, endX, endY));
        this.tutorialHand.setOrigin(0.5, 0.5);
      }
    } else {
      // Reset arm rotation when not slinging
      if (this.heroArm) this.heroArm.setRotation(0);

      if (this.tutorialHand) {
        // Ensure it stays hidden when we aren't dragging or if the game is over
        this.tutorialHand.setVisible(false);
      }
    }
  }

  endGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Drop whatever was being dragged so it falls naturally
    if (this.carDragConstraint) {
      this.matter.world.removeConstraint(this.carDragConstraint);
      this.carDragConstraint = null;
    }
    if (this.carDragBody) {
      this.matter.world.remove(this.carDragBody);
      this.carDragBody = null;
    }
    this.draggedObject = null;
    this.dragPointer = null;

    if (this.mouseSpring) {
      if (typeof this.mouseSpring.stopDrag === 'function') {
        this.mouseSpring.stopDrag();
      }
      if (this.mouseSpring.constraint) {
        this.matter.world.removeConstraint(this.mouseSpring.constraint);
      }
      this.mouseSpring = null;
    }

    // Disable all player input — physics and rendering keep running
    this.input.enabled = false;

    // Stop BGM
    if (this.bgm) {
      this.bgm.stop();
    }

    // Launch EndScene as an overlay on top — Game stays rendered and animated underneath
    this.scene.launch("EndScene");
  }

  relayout() {
    // Template standard scaling logic for 1080x1920 base
    const dpr = window.devicePixelRatio || 1;
    const vw = this.scale.gameSize.width / dpr;
    const vh = this.scale.gameSize.height / dpr;

    const s = Math.min(vw / 1080, vh / 1920);
    this.cameras.main.setViewport(0, 0, vw * dpr, vh * dpr);
    this.cameras.main.setZoom(s * dpr);
    this.cameras.main.centerOn(540, 960);
    // Prevent ragdoll containers from blinking when they cross the screen edge.
    // disableCull skips Phaser's bounds-check so objects just off-screen are still rendered.
    this.cameras.main.disableCull = true;

    // Stretch ground to actual screen edges and snap to absolute bottom
    if (this.ground) {
      const screenWidthInGameCoords = vw / s;
      const screenHeightInGameCoords = vh / s;
      // Make ground 5x wider than the visible screen so villains always land on it even when
      // thrown off-screen. The extra width is invisible (off camera) but the physics body catches them.
      this.ground.setScale((screenWidthInGameCoords * 5) / this.ground.width, 0.25);

      // Calculate the bottom of the camera's visible area and place ground there
      const cameraBottom = 960 + (screenHeightInGameCoords / 2);
      this.ground.y = cameraBottom - (this.ground.height * 0.25) / 2;

      // Stretch background to fit between the top of the screen and the top of the ground
      if (this.bg) {
        const cameraTop = 960 - (screenHeightInGameCoords / 2);
        const groundTop = this.ground.y - (this.ground.height * 0.21) / 2;
        const requiredBgHeight = groundTop - cameraTop;

        this.bg.setScale(screenWidthInGameCoords / this.bg.width, requiredBgHeight / this.bg.height);
        this.bg.y = cameraTop + (requiredBgHeight / 2);
      }

      const groundTop = this.ground.y - (this.ground.height * 0.25) / 2;

      // Update physics world bounds so objects don't hit an invisible wall if the screen is wider than 1080 or taller than 1920
      const cameraLeft = 540 - (screenWidthInGameCoords / 2);
      // Disable left/right bounds (false, false) so villains can fly off screen edges naturally.
      // Only top and bottom bounds are active (true, true).
      this.matter.world.setBounds(cameraLeft, 0, screenWidthInGameCoords, groundTop);

      if (this.matterGround) {
        this.matter.world.remove(this.matterGround);
      }
      this.matterGround = this.matter.add.rectangle(
        this.ground.x,
        this.ground.y,
        screenWidthInGameCoords,
        this.ground.displayHeight,
        { isStatic: true, label: 'floor', friction: 0.9, restitution: 0 }
      );

      // Snap hero to ground (add offset for transparent padding in sprite)
      if (this.hero) {
        // Hero original texture has ~75px of transparent padding at the bottom
        const heroTexturePadding = 75;
        this.hero.y = groundTop - ((this.hero.height / 2) - heroTexturePadding) * this.hero.scaleY;

        // Keep static sling-pose hero perfectly aligned with the animated hero
        if (this.heroStatic) {
          this.heroStatic.setPosition(this.hero.x, this.hero.y);
        }

        // Keep arm sprite in sync — offset 80px right and 90px up from the hero centre
        if (this.heroArm) {
          this.heroArm.setPosition(this.hero.x + 70 * this.hero.scaleX, this.hero.y - 80 * this.hero.scaleY);
        }
      }

      // Snap car to ground and update tutorial hand tween (add offset for wheels)
      // We only do this if the game hasn't started yet (!this.tutorialDismissed), 
      // because forcing a physics body's position during a drag or mid-flight causes it to explode/disappear.
      if (this.car && this.car.body && !this.tutorialDismissed) {
        // Car original texture has ~90px of transparent padding at the bottom
        const carTexturePadding = 90;
        this.car.y = groundTop - ((this.car.height / 2) - carTexturePadding) * this.car.scaleY;

        // Update hand dragging hint if it's visible
        if (this.handHint && this.handHint.visible) {
          this.handHint.setPosition(this.car.x, this.car.y);

          if (this.handHintTween) {
            this.handHintTween.stop();
          }

          this.handHintTween = this.tweens.add({
            targets: this.handHint,
            x: this.car.x + 1,
            y: this.car.y - 250,
            alpha: { start: 1, to: 0 },
            repeat: -1,
            duration: 1500,
            ease: 'Sine.easeOut',
            hold: 500,
            repeatDelay: 500
          });
        }
      }
    }
  }
}
