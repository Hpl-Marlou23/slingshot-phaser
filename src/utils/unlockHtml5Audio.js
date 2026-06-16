export function unlockHtml5AudioTags(scene) {
    const soundManager = scene.sound;

    // Guard: Only run the unlock logic once
    if (window.html5AudioUnlocked) {
        return;
    }

    // Check if HTML5AudioSoundManager is active and currently locked
    if (soundManager && soundManager.locked) {
        window.html5AudioUnlocked = true; // Set flag immediately to prevent double-firing

        const cache = scene.game.cache.audio;
        const lockedTags = [];

        cache.entries.each((key, tags) => {
            for (let i = 0; i < tags.length; i++) {
                const tag = tags[i];
                if (tag.dataset && tag.dataset.locked === "true") {
                    lockedTags.push(tag);
                }
            }
            return true;
        });

        if (lockedTags.length > 0) {
            lockedTags.forEach(tag => {
                tag.dataset.locked = "false";
                try {
                    tag.load(); // tag.load() is sufficient to unlock and prevents lag/leaks
                } catch (e) {}
            });

            soundManager.unlocked = true;
        } else {
            soundManager.locked = false;
        }

        // Flush queued actions
        if (soundManager.lockedActionsQueue) {
            while (soundManager.lockedActionsQueue.length) {
                const action = soundManager.lockedActionsQueue.shift();
                try {
                    if (action.sound[action.prop] && action.sound[action.prop].apply) {
                        action.sound[action.prop].apply(action.sound, action.value || []);
                    } else {
                        action.sound[action.prop] = action.value;
                    }
                } catch (e) {}
            }
        }
    }
}
