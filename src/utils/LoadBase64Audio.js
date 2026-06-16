import { SetPendingAudio } from "./Base64Manager";

function IsBase64 (str)
{
    return /^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+)?;base64,/.test(str);
}

export function LoadBase64Audio (scene, audioFiles)
{
    const disableWebAudio = scene.game.config.audio && scene.game.config.audio.disableWebAudio;

    if (disableWebAudio)
    {
        audioFiles.forEach(file => {
            scene.load.audio(file.key, file.data, { instances: file.instances || 1 });
        });
        return;
    }

    //  Get the first audio file in the list
    const file = audioFiles[0];

    if (IsBase64(file.data))
    {
        SetPendingAudio();

        //  For debugging - uncomment this:
        
        // this.sound.on('decoded', (key) => {
        //     console.log('Audio decoded:', key);
        // });

        scene.sound.decodeAudio(audioFiles);

        // iOS Safari/WebViews: the AudioContext starts suspended before the
        // first user gesture.  decodeAudioData() may silently produce empty
        // buffers in that state.  Schedule a re-decode after Phaser unlocks
        // the context so the buffers are replaced with valid audio data.
        if (scene.sound.locked)
        {
            scene.sound.once('unlocked', () => {
                scene.sound.removeByKey('audio_bgm');
                scene.sound.removeByKey('audio_correct');
                scene.sound.removeByKey('audio_wrong');
                scene.sound.removeByKey('audio_finished');
                scene.sound.decodeAudio(audioFiles);
            });
        }
    }
    else
    {
        audioFiles.forEach(file => {
            scene.load.audio(file.key, file.data);
        });
    }
}
