import Phaser from "phaser";

import { mraidAdNetworks, networkPlugin } from "./networkPlugin.js";
import "./spine/SpinePlugin.js";

import { Game } from "./scenes/Game";
import { Preloader } from "./scenes/Preloader";
import { config } from "./config.js";
import { EndScene } from "./scenes/EndScene.js";
import { updateResponsiveLayout } from "./utils/responsive.js";

// Prevent scrollbars and viewport bouncing from the very first load
const preventScroll = () => {
  if (document.body) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
  if (document.documentElement) {
    document.documentElement.style.overflow = 'hidden';
  }
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preventScroll);
} else {
  preventScroll();
}

const gameConfig = {
  type: Phaser.AUTO,
  parent: "ad-container",
  width: 1080,
  height: 1920,
  backgroundColor: "#F3EBD6",
  transparent: true,
  scale: {
    mode: Phaser.Scale.NONE,
    width: 1080,
    height: 1920,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 3 },
      debug: true,
    }
  },
  plugins: {
    scene: [
      { key: "SpinePlugin", plugin: window.SpinePlugin, mapping: "spine" },
    ],
  },
  audio: {
    disableWebAudio: true,
  },
  scene: [Preloader, Game, EndScene],
};

function initializePhaserGame() {
  return new Phaser.Game(gameConfig);
}

function bindResponsiveResize(game) {
  const getViewportSize = () => {
    if (window.visualViewport) {
      return {
        width: Math.max(Math.round(window.visualViewport.width), 1),
        height: Math.max(Math.round(window.visualViewport.height), 1),
      };
    }
    return {
      width: Math.max(window.innerWidth, 1),
      height: Math.max(window.innerHeight, 1),
    };
  };

  const applyResize = () => {
    // Phaser creates the canvas asynchronously; guard until it's ready
    if (!game.isBooted || !game.canvas) {
      return;
    }
    const { width, height } = getViewportSize();
    const container = document.getElementById("ad-container");
    const app = document.getElementById("app");

    if (container) {
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
    }
    if (app) {
      app.style.width = `${width}px`;
      app.style.height = `${height}px`;
    }

    const dpr = window.devicePixelRatio || 1;
    game.scale.resize(width * dpr, height * dpr);

    // Scale.NONE requires manual CSS sizing, otherwise the canvas physically overflows on retina displays
    game.canvas.style.width = `${width}px`;
    game.canvas.style.height = `${height}px`;

    updateResponsiveLayout(width, height);

    game.scene.getScenes(true).forEach(scene => {
      if (typeof scene.relayout === 'function') {
        scene.relayout();
      }
    });
  };

  let rafId = null;
  const scheduleResize = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      applyResize();
      // iOS can report final viewport size slightly later after rotation.
      window.setTimeout(applyResize, 120);
    });
  };

  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleResize);
  }
  game.events.once("destroy", () => {
    window.removeEventListener("resize", scheduleResize);
    window.removeEventListener("orientationchange", scheduleResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", scheduleResize);
    }
  });

  // Run once the game is booted so scale manager has a canvas to resize
  if (game.isBooted) {
    scheduleResize();
  } else {
    game.events.once(Phaser.Core.Events.READY, scheduleResize);
  }
}

function setupGameInitialization(adNetworkType) {
  if (mraidAdNetworks.has(adNetworkType)) {
    networkPlugin.initMraid(() => {
      const game = initializePhaserGame();
      bindResponsiveResize(game);
    });
  } else {
    // vungle, google ads, facebook, tiktok
    const game = initializePhaserGame();
    bindResponsiveResize(game);
  }
}

setupGameInitialization(config.adNetworkType);
